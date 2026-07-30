'use strict';

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const userStore = require('../data/userStore');
const codeStore = require('../data/codeStore');
const emailService = require('../utils/emailService');
const securityTracker = require('../utils/securityTracker');
const auditor = require('../utils/auditor');
const { getJwtSecret } = require('../middleware/auth');

function generateToken(user) {
  const expiresIn = process.env.JWT_EXPIRES_IN || '8h';
  const secret = getJwtSecret();
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      emailVerified: user.emailVerified || false,
      twoFactorEnabled: user.twoFactorEnabled || false,
    },
    secret,
    { expiresIn }
  );
}

function setTokenCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  });
}

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    'unknown'
  );
}

function validatePasswordComplexity(password) {
  if (password.length < 8) {
    return 'La contrasena debe tener al menos 8 caracteres';
  }
  if (!/[A-Z]/.test(password)) {
    return 'La contrasena debe contener al menos una mayuscula';
  }
  if (!/[a-z]/.test(password)) {
    return 'La contrasena debe contener al menos una minuscula';
  }
  if (!/[0-9]/.test(password)) {
    return 'La contrasena debe contener al menos un numero';
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'La contrasena debe contener al menos un caracter especial';
  }
  return null;
}

async function setup(req, res) {
  try {
    const isAuthed = !!req.user?.role;
    const users = isAuthed ? await userStore.getUsers() : [];
    const admin = users.find((u) => u.role === 'admin');
    const smtpConfig = emailService.isConfigured();

    // Only expose email/user count to authenticated admin/owner
    return res.json({
      configurado: isAuthed ? users.length > 0 : true,
      email:
        isAuthed && (req.user.role === 'admin' || req.user.role === 'owner')
          ? admin?.email || ''
          : '',
      smtpConfigurado: smtpConfig,
      twoFactorHabilitado: admin?.twoFactorEnabled || false,
      emailVerificado: admin?.emailVerified || false,
      rolesDisponibles: userStore.ROLES,
      totalUsuarios: isAuthed ? users.length : 0,
    });
  } catch (err) {
    logger.error({ err }, 'Setup error');
    return res.status(500).json({ error: 'Error al obtener configuracion' });
  }
}

async function logout(req, res) {
  logger.info({ userId: req.user?.id }, 'User logged out');
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
  return res.json({ mensaje: 'Sesion cerrada exitosamente' });
}

async function getAuthStatus(_req, res) {
  try {
    const smtpConfig = emailService.isConfigured();
    const codeEmailService = emailService.isConfigured();
    const users = await userStore.getUsers();
    const admin = users.find((u) => u.role === 'admin');

    return res.json({
      smtpConfigurado: smtpConfig,
      codeEmailService,
      emailAdmin: !!admin?.email,
      totalUsuarios: users.length,
      roles: userStore.ROLES,
    });
  } catch (err) {
    logger.error({ err }, 'Auth status error');
    return res.status(500).json({ error: 'Error al obtener estado' });
  }
}

async function register(req, res) {
  try {
    const { username, email, password, firstName, lastName, role } = req.body;
    const ip = getClientIp(req);

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ error: 'username, email y password son requeridos' });
    }

    const pwErr = validatePasswordComplexity(password);
    if (pwErr) return res.status(400).json({ error: pwErr });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email invalido' });
    }

    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        error: 'Username debe tener 3-30 caracteres (letras, numeros, _)',
      });
    }

    const existingEmail = await userStore.findUserByEmail(email);
    if (existingEmail) {
      return res
        .status(409)
        .json({ error: 'Ya existe un usuario con ese email o username' });
    }

    const existingUsername = await userStore.findUserByUsername(username);
    if (existingUsername) {
      return res
        .status(409)
        .json({ error: 'Ya existe un usuario con ese email o username' });
    }

    const safeUser = await userStore.createUser({
      username,
      email,
      password,
      firstName: firstName || '',
      lastName: lastName || '',
      role: 'cliente',
    });

    try {
      const { plainCode } = await codeStore.createCode({
        userId: safeUser.id,
        type: 'email_verification',
        ttlMs: 300000,
      });
      const sent = await emailService.sendVerificationCode(email, plainCode);
      if (!sent.success) {
        // Rollback: delete the user we just created
        await userStore.deleteUser(safeUser.id);
        return res.status(500).json({
          error:
            'Error al enviar el codigo de verificacion. Configura SMTP primero.',
        });
      }
    } catch (emailErr) {
      logger.warn(
        { err: emailErr },
        'Failed to send verification email on register'
      );
      await userStore.deleteUser(safeUser.id);
      return res.status(500).json({
        error:
          'Error al enviar el codigo de verificacion. Configura SMTP primero.',
      });
    }

    logger.info(
      { userId: safeUser.id, email, role: safeUser.role },
      'User registered'
    );
    await auditor.register(safeUser.id, ip, email, safeUser.role);

    return res.status(201).json({
      mensaje: 'Usuario creado exitosamente',
      usuario: safeUser,
      requiereVerificarCorreo: true,
    });
  } catch (err) {
    if (err.statusCode === 409) {
      return res.status(409).json({ error: err.message });
    }
    logger.error({ err }, 'Registration error');
    return res.status(500).json({ error: 'Error al registrar usuario' });
  }
}

async function login(req, res) {
  try {
    const { identifier, password } = req.body;
    const ip = getClientIp(req);

    if (!identifier || !password) {
      return res
        .status(400)
        .json({ error: 'Usuario/email y contrasena requeridos' });
    }

    const { blocked, lockUntil } = await securityTracker.isBlocked({
      ip,
      action: 'login',
    });
    if (blocked) {
      return res
        .status(429)
        .json({ error: 'Demasiados intentos. Intenta mas tarde.' });
    }

    const result = await userStore.verifyPassword(identifier, password);

    if (!result.valid) {
      const trackResult = await securityTracker.recordAttempt({
        ip,
        action: 'login',
        success: false,
      });

      if (trackResult.blocked) {
        await auditor.accountLocked(ip, identifier);
      }

      const reason = result.reason || 'Credenciales invalidas';
      await auditor.failedLogin(ip, identifier, reason);

      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    const user = result.user;
    if (!user.emailVerified && process.env.NODE_ENV !== 'test') {
      return res
        .status(403)
        .json({ error: 'Correo no verificado. Verifica tu correo primero.' });
    }

    await securityTracker.resetAttempts({ ip, action: 'login' });

    await userStore.updateLastLogin(user.id, ip);

    const token = generateToken(user);
    logger.info(
      { userId: user.id, email: user.email, role: user.role },
      'Successful login'
    );

    await auditor.login(user.id, ip, user.email);

    setTokenCookie(res, token);

    return res.json({
      token,
      usuario: userStore.sanitizeUser(user),
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });
  } catch (err) {
    logger.error({ err }, 'Login error');
    return res.status(500).json({ error: 'Error al iniciar sesion' });
  }
}

async function verify2FA(req, res) {
  try {
    const { userId, code } = req.body;
    const ip = getClientIp(req);

    if (!userId || !code) {
      return res.status(400).json({ error: 'userId y code requeridos' });
    }

    const { blocked } = await securityTracker.isBlocked({
      userId,
      ip,
      action: '2fa',
    });
    if (blocked) {
      return res
        .status(429)
        .json({ error: 'Demasiados intentos. Espera unos minutos.' });
    }

    const result = await codeStore.verifyCode(userId, '2fa', code);

    if (!result.valid) {
      await securityTracker.recordAttempt({
        userId,
        ip,
        action: '2fa',
        success: false,
      });
      return res
        .status(401)
        .json({ error: result.reason || 'Codigo invalido' });
    }

    await securityTracker.resetAttempts({ userId, ip, action: '2fa' });

    const token = generateToken(result.user);
    logger.info(
      { userId, email: result.user.email },
      '2FA verification successful'
    );

    await securityTracker.logSecurityEvent({
      type: 'success',
      userId: userId,
      ip,
      action: '2fa_verify',
      detail: 'Codigo de recuperacion verificado exitosamente',
    });

    setTokenCookie(res, token);

    return res.json({
      usuario: userStore.sanitizeUser(result.user),
    });
  } catch (err) {
    logger.error({ err }, '2FA verification error');
    return res.status(500).json({ error: 'Error al verificar codigo 2FA' });
  }
}

async function sendLoginCode(req, res) {
  try {
    const { identifier, password } = req.body;
    const ip = getClientIp(req);

    if (!identifier || !password) {
      return res
        .status(400)
        .json({ error: 'Usuario/email y contrasena requeridos' });
    }

    const { blocked } = await securityTracker.isBlocked({
      ip,
      action: 'login',
    });
    if (blocked) {
      return res
        .status(429)
        .json({ error: 'Demasiados intentos. Intenta mas tarde.' });
    }

    const result = await userStore.verifyPassword(identifier, password);
    if (!result.valid) {
      await securityTracker.recordAttempt({
        ip,
        action: 'login',
        success: false,
      });
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    const user = result.user;
    if (!user.emailVerified && process.env.NODE_ENV !== 'test') {
      return res
        .status(403)
        .json({ error: 'Correo no verificado. Verifica tu correo primero.' });
    }

    const { plainCode } = await codeStore.createCode({
      userId: user.id,
      type: 'login',
      ttlMs: 300000,
    });

    const sent = await emailService.send2FACode(user.email, plainCode);
    if (!sent.success) {
      return res
        .status(500)
        .json({ error: 'Error al enviar el codigo. Configura SMTP primero.' });
    }

    logger.info({ userId: user.id, email: user.email }, 'Login code sent');

    await securityTracker.logSecurityEvent({
      type: 'info',
      userId: user.id,
      ip,
      action: 'login_code',
      detail: 'Codigo de inicio de sesion enviado',
    });

    return res.json({
      userId: user.id,
      email: user.email,
      expiresIn: 300,
    });
  } catch (err) {
    logger.error({ err }, 'Send login code error');
    return res
      .status(500)
      .json({ error: 'Error al enviar codigo de inicio de sesion' });
  }
}

async function enviarCodigoVerificacion(req, res) {
  try {
    const { userId, email } = req.body;
    const ip = getClientIp(req);

    if (!userId && !email) {
      return res.status(400).json({ error: 'userId o email requerido' });
    }

    let user;
    if (userId) {
      user = await userStore.findUserById(userId);
    } else {
      user = await userStore.findUserByEmail(email);
    }

    if (!user) {
      return res.json({
        mensaje: 'Si el usuario existe, se enviara un codigo a su correo',
        expiresIn: 600,
      });
    }

    const { plainCode, expiresAt } = await codeStore.createCode({
      userId: user.id,
      type: 'email_verification',
      ttlMs: 300000,
    });

    const sent = await emailService.sendVerificationCode(user.email, plainCode);
    if (!sent.success) {
      return res
        .status(500)
        .json({ error: 'Error al enviar el codigo. Configura SMTP primero.' });
    }

    logger.info({ email: user.email }, 'Codigo de verificacion enviado');

    await securityTracker.logSecurityEvent({
      type: 'info',
      userId: user.id,
      ip,
      action: 'recovery_request',
      detail: 'Codigo de recuperacion enviado',
    });

    return res.json({
      mensaje: 'Codigo enviado a tu correo',
      expiresIn: 600,
    });
  } catch (err) {
    logger.error({ err }, 'Send verification code error');
    return res
      .status(500)
      .json({ error: 'Error al enviar codigo de verificacion' });
  }
}

async function verificarCorreo(req, res) {
  try {
    const { identifier, email, code } = req.body;
    const ip = getClientIp(req);

    if (!identifier || !email || !code) {
      return res
        .status(400)
        .json({ error: 'identifier, email y code requeridos' });
    }

    let user;
    if (identifier) {
      user = await userStore.findUserByEmailOrUsername(identifier);
    } else {
      user = await userStore.findUserByEmail(email);
    }

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const { blocked } = await securityTracker.isBlocked({
      userId: user.id,
      ip,
      action: 'code_verify',
    });
    if (blocked) {
      return res
        .status(429)
        .json({ error: 'Demasiados intentos. Espera unos minutos.' });
    }

    const result = await codeStore.verifyCode(
      user.id,
      'email_verification',
      code
    );

    if (!result.valid) {
      await securityTracker.recordAttempt({
        userId: user.id,
        ip,
        action: 'code_verify',
        success: false,
      });
      return res
        .status(401)
        .json({ error: result.reason || 'Codigo invalido o expirado' });
    }

    await securityTracker.resetAttempts({
      userId: user.id,
      ip,
      action: 'code_verify',
    });

    await userStore.updateUser(user.id, { emailVerified: true });

    const userAfter = await userStore.findUserById(user.id);
    if (userAfter) {
      await emailService.sendWelcome(userAfter.email);
    }

    logger.info({ userId: user.id }, 'Email verified successfully');
    await auditor.emailVerified(user.id, ip);

    return res.json({ mensaje: 'Correo verificado exitosamente' });
  } catch (err) {
    logger.error({ err }, 'Verify email error');
    return res.status(500).json({ error: 'Error al verificar correo' });
  }
}

async function solicitarRecuperacion(req, res) {
  try {
    const { identifier } = req.body;
    const ip = getClientIp(req);

    if (!identifier) {
      return res.status(400).json({ error: 'identifier requerido' });
    }

    let user = null;
    if (identifier) {
      user = await userStore.findUserByEmailOrUsername(identifier);
    }

    if (!user) {
      return res.json({
        mensaje: 'Si el usuario existe, recibiras un codigo en tu correo',
        expiresIn: 600,
      });
    }

    const { plainCode, expiresAt } = await codeStore.createCode({
      userId: user.id,
      type: 'password_recovery',
      ttlMs: 600000,
    });

    const sent = await emailService.sendRecoveryCode(user.email, plainCode);
    if (!sent.success) {
      return res
        .status(500)
        .json({ error: 'Error al enviar el codigo. Configura SMTP primero.' });
    }

    logger.info({ email: user.email }, 'Recovery code sent');

    await securityTracker.logSecurityEvent({
      type: 'info',
      userId: user.id,
      ip,
      action: 'recovery_request',
      detail: 'Codigo de recuperacion enviado',
    });

    return res.json({
      mensaje: 'Codigo enviado a tu correo',
      expiresIn: 600,
    });
  } catch (err) {
    logger.error({ err }, 'Recovery request error');
    return res.status(500).json({ error: 'Error al solicitar recuperacion' });
  }
}

async function verificarCodigoRecuperacion(req, res) {
  try {
    const { identifier, code } = req.body;
    const ip = getClientIp(req);

    if (!identifier || !code) {
      return res.status(400).json({ error: 'identifier y code requeridos' });
    }

    let user = null;
    if (identifier) {
      user = await userStore.findUserByEmailOrUsername(identifier);
    }

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const { blocked } = await securityTracker.isBlocked({
      userId: user.id,
      ip,
      action: 'recovery',
    });
    if (blocked) {
      return res
        .status(429)
        .json({ error: 'Demasiados intentos. Espera unos minutos.' });
    }

    const result = await codeStore.verifyCode(
      user.id,
      'password_recovery',
      code
    );

    if (!result.valid) {
      await securityTracker.recordAttempt({
        userId: user.id,
        ip,
        action: 'recovery',
        success: false,
      });
      return res
        .status(401)
        .json({ error: result.reason || 'Codigo invalido o expirado' });
    }

    await securityTracker.resetAttempts({
      userId: user.id,
      ip,
      action: 'recovery',
    });

    const resetToken = jwt.sign(
      { id: user.id, purpose: 'password_reset' },
      getJwtSecret(),
      { algorithm: 'HS256', expiresIn: '5m' }
    );

    logger.info({ userId: user.id }, 'Recovery code verified');

    await securityTracker.logSecurityEvent({
      type: 'success',
      userId: user.id,
      ip,
      action: 'recovery_verify',
      detail: 'Codigo de recuperacion verificado exitosamente',
    });

    res.cookie('resetToken', resetToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 5 * 60 * 1000,
      path: '/api/auth/cambiar-contrasena',
    });
    return res.json({
      puedeCambiar: true,
      mensaje: 'Codigo verificado. Ahora puedes cambiar tu contrasena.',
    });
  } catch (err) {
    logger.error({ err }, 'Verify recovery code error');
    return res.status(500).json({ error: 'Error al verificar codigo' });
  }
}

async function cambiarContrasena(req, res) {
  try {
    const { nuevaContrasena, userId, currentPassword } = req.body;
    const resetToken = req.cookies?.resetToken;
    const ip = getClientIp(req);

    if (!nuevaContrasena) {
      return res
        .status(400)
        .json({ error: 'La contrasena debe tener al menos 8 caracteres' });
    }
    const pwErr2 = validatePasswordComplexity(nuevaContrasena);
    if (pwErr2) return res.status(400).json({ error: pwErr2 });

    let targetUserId = userId;

    if (resetToken) {
      try {
        const decoded = jwt.verify(resetToken, getJwtSecret(), {
          algorithms: ['HS256'],
        });
        if (decoded.purpose !== 'password_reset') {
          return res.status(400).json({ error: 'Token invalido' });
        }
        targetUserId = decoded.id;
      } catch {
        await securityTracker.logSecurityEvent({
          type: 'suspicious',
          ip,
          action: 'password_change',
          detail: 'Intento de cambio de contrasena con token invalido/expirado',
        });
        return res.status(401).json({ error: 'Token expirado o invalido' });
      }
    }

    if (!targetUserId) {
      return res
        .status(400)
        .json({ error: 'Informacion insuficiente para cambiar contrasena' });
    }

    const user = await userStore.findUserById(targetUserId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (!resetToken) {
      if (currentPassword) {
        const { valid } = await userStore.verifyPassword(
          user.email,
          currentPassword
        );
        if (!valid) {
          await securityTracker.logSecurityEvent({
            type: 'failed_login',
            userId: targetUserId,
            ip,
            action: 'password_change',
            detail: 'Contrasena actual incorrecta al cambiar propia contrasena',
          });
          return res
            .status(401)
            .json({ error: 'Contrasena actual incorrecta' });
        }
      } else {
        return res.status(401).json({
          error: 'Token de recuperacion o contrasena actual requerida',
        });
      }
    }

    await userStore.changePassword(targetUserId, nuevaContrasena);
    logger.info({ userId: targetUserId }, 'Own password changed');

    await securityTracker.logSecurityEvent({
      type: 'success',
      userId: targetUserId,
      ip,
      action: 'password_change',
      detail: 'Contrasena propia cambiada exitosamente',
    });

    return res.json({ mensaje: 'Contrasena cambiada exitosamente' });
  } catch (err) {
    logger.error({ err }, 'Change password error');
    return res.status(500).json({ error: 'Error al cambiar contrasena' });
  }
}

async function toggle2FA(req, res) {
  try {
    const userId = req.user?.id;
    const ip = getClientIp(req);

    if (!userId) {
      return res.status(401).json({ error: 'Debes iniciar sesion' });
    }

    const user = await userStore.findUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (!user.emailVerified && process.env.NODE_ENV !== 'test') {
      return res
        .status(400)
        .json({ error: 'Debes verificar tu correo primero' });
    }

    const newState = !user.twoFactorEnabled;
    await userStore.updateUser(userId, { twoFactorEnabled: newState });

    logger.info({ userId, twoFactorEnabled: newState }, '2FA toggled');
    await auditor.twoFactorToggled(userId, ip, newState);

    return res.json({
      mensaje: newState ? '2FA activado' : '2FA desactivado',
      twoFactorEnabled: newState,
    });
  } catch (err) {
    logger.error({ err }, 'Toggle 2FA error');
    return res.status(500).json({ error: 'Error al cambiar 2FA' });
  }
}

async function getProfile(req, res) {
  try {
    const user = await userStore.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.json(userStore.sanitizeUser(user));
  } catch (err) {
    logger.error({ err }, 'Profile error');
    return res.status(500).json({ error: 'Error al obtener perfil' });
  }
}

async function updateProfile(req, res) {
  try {
    const { firstName, lastName, avatar } = req.body;
    const user = await userStore.updateUser(req.user.id, {
      firstName,
      lastName,
      avatar,
    });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    return res.json({ mensaje: 'Perfil actualizado', usuario: user });
  } catch (err) {
    logger.error({ err }, 'Update profile error');
    return res.status(500).json({ error: 'Error al actualizar perfil' });
  }
}

async function changeOwnPassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    const ip = getClientIp(req);

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: 'Contrasena actual y nueva requeridas' });
    }

    const pwErr3 = validatePasswordComplexity(newPassword);
    if (pwErr3) return res.status(400).json({ error: pwErr3 });

    const { valid } = await userStore.verifyPassword(
      req.user.email,
      currentPassword
    );
    if (!valid) {
      await securityTracker.logSecurityEvent({
        type: 'failed_login',
        userId: req.user.id,
        ip,
        action: 'password_change',
        detail: 'Contrasena actual incorrecta al cambiar propia contrasena',
      });
      return res.status(401).json({ error: 'Contrasena actual incorrecta' });
    }

    await userStore.changePassword(req.user.id, newPassword);
    logger.info({ userId: req.user.id }, 'Own password changed');

    await securityTracker.logSecurityEvent({
      type: 'success',
      userId: req.user.id,
      ip,
      action: 'password_change',
      detail: 'Contrasena propia cambiada exitosamente',
    });

    return res.json({ mensaje: 'Contrasena cambiada exitosamente' });
  } catch (err) {
    logger.error({ err }, 'Change own password error');
    return res.status(500).json({ error: 'Error al cambiar contrasena' });
  }
}

async function getLastLogin(_req, res) {
  try {
    const events = await securityTracker.getSecurityEvents({
      limit: 1,
      type: 'login',
    });
    const last = events[0];
    if (!last) return res.json({ lastLogin: null });

    const email = last.detail?.replace('Inicio de sesion: ', '') || '';
    return res.json({
      lastLogin: {
        timestamp: last.timestamp,
        ip: last.ip,
        identifier: email,
        userId: last.userId,
        success: true,
      },
    });
  } catch {
    return res.json({ lastLogin: null });
  }
}

async function getLoginLogs(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);
    const events = await securityTracker.getSecurityEvents({
      limit: 1000,
    });
    const logs = events
      .filter((e) => e.type === 'login' || e.type === 'failed_login')
      .slice(0, limit)
      .map((e) => {
        const isLogin = e.type === 'login';
        const email =
          e.detail
            ?.replace(/^Inicio de sesion: |^Intento fallido: /, '')
            .split(' - ')[0] || '';
        return {
          id: e.id,
          timestamp: e.timestamp,
          ip: e.ip,
          identifier: email,
          userId: e.userId,
          success: isLogin,
          reason: isLogin
            ? null
            : e.detail?.split(' - ')[1] || 'Credenciales invalidas',
        };
      });
    return res.json(logs);
  } catch {
    return res.json([]);
  }
}

async function getSecurityEvents(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const events = await securityTracker.getSecurityEvents({
      limit,
      type: req.query.type || null,
      userId: req.query.userId || null,
    });
    return res.json(events);
  } catch (err) {
    logger.error({ err }, 'Get security events error');
    return res
      .status(500)
      .json({ error: 'Error al obtener eventos de seguridad' });
  }
}

async function hashPassword(req, res) {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'password requerido' });
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(password, 12);
    return res.json({ hash });
  } catch (err) {
    logger.error({ err }, 'Hash password error');
    return res.status(500).json({ error: 'Error al hashear contrasena' });
  }
}

module.exports = {
  setup,
  getAuthStatus,
  register,
  login,
  verify2FA,
  sendLoginCode,
  logout,
  enviarCodigoVerificacion,
  verificarCorreo,
  solicitarRecuperacion,
  verificarCodigoRecuperacion,
  cambiarContrasena,
  toggle2FA,
  getProfile,
  updateProfile,
  changeOwnPassword,
  getLastLogin,
  getLoginLogs,
  getSecurityEvents,
  hashPassword,
};
