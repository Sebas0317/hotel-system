'use strict';

const securityTracker = require('./securityTracker');

function reqMeta(req) {
  return {
    userId: req.user?.id || null,
    ip:
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.ip ||
      req.connection?.remoteAddress ||
      'unknown',
  };
}

function log(type, { userId, ip, action, detail, metadata }) {
  return securityTracker.logSecurityEvent({
    type,
    userId,
    ip,
    action,
    detail,
    metadata,
  });
}

const auditor = {
  reqMeta,

  // ── Auth ──
  login(userId, ip, email) {
    return log('login', {
      userId,
      ip,
      action: 'login',
      detail: `Inicio de sesion: ${email}`,
    });
  },
  logout(userId, ip) {
    return log('logout', {
      userId,
      ip,
      action: 'logout',
      detail: 'Cierre de sesion',
    });
  },
  failedLogin(ip, identifier, reason) {
    return log('failed_login', {
      ip,
      action: 'login',
      detail: `Intento fallido: ${identifier} - ${reason || 'credenciales invalidas'}`,
    });
  },
  accountLocked(ip, identifier) {
    return log('account_locked', {
      ip,
      action: 'login',
      detail: `Cuenta bloqueada por intentos fallidos: ${identifier}`,
    });
  },
  twoFactorToggled(userId, ip, enabled) {
    return log('2fa_toggle', {
      userId,
      ip,
      action: '2fa_toggle',
      detail: `2FA ${enabled ? 'activado' : 'desactivado'}`,
    });
  },
  register(userId, ip, email, role) {
    return log('user_registered', {
      userId,
      ip,
      action: 'register',
      detail: `Usuario registrado: ${email} (${role})`,
      metadata: { email, role },
    });
  },
  passwordChanged(userId, ip, method) {
    return log('password_change', {
      userId,
      ip,
      action: 'password_change',
      detail: `Contrasena cambiada via: ${method}`,
    });
  },
  passwordResetByAdmin(userId, ip, targetUserId) {
    return log('password_reset_admin', {
      userId,
      ip,
      action: 'password_reset',
      detail: `Admin reseteo contrasena de usuario ${targetUserId}`,
      metadata: { targetUserId },
    });
  },
  recoveryRequested(userId, ip, email) {
    return log('recovery_requested', {
      userId,
      ip,
      action: 'recovery',
      detail: `Codigo de recuperacion enviado: ${email}`,
    });
  },
  recoveryVerified(userId, ip) {
    return log('recovery_verified', {
      userId,
      ip,
      action: 'recovery',
      detail: 'Codigo de recuperacion verificado',
    });
  },
  emailVerified(userId, ip) {
    return log('email_verified', {
      userId,
      ip,
      action: 'email_verify',
      detail: 'Correo electronico verificado',
    });
  },
  verificationCodeSent(userId, ip, email) {
    return log('verification_sent', {
      userId,
      ip,
      action: 'verification',
      detail: `Codigo de verificacion enviado: ${email}`,
    });
  },

  // ── Users (admin) ──
  userCreated(userId, ip, targetUserId, email, role) {
    return log('user_created', {
      userId,
      ip,
      action: 'user_create',
      detail: `Usuario creado por admin: ${email} (${role})`,
      metadata: { targetUserId, email, role },
    });
  },
  userUpdated(userId, ip, targetUserId, changes) {
    return log('user_updated', {
      userId,
      ip,
      action: 'user_update',
      detail: `Usuario actualizado: ${targetUserId}`,
      metadata: { targetUserId, changes },
    });
  },
  userDeleted(userId, ip, targetUserId) {
    return log('user_deleted', {
      userId,
      ip,
      action: 'user_delete',
      detail: `Usuario eliminado: ${targetUserId}`,
      metadata: { targetUserId },
    });
  },
  roleChanged(userId, ip, targetUserId, oldRole, newRole) {
    return log('role_change', {
      userId,
      ip,
      action: 'role_change',
      detail: `Rol cambiado: ${oldRole} -> ${newRole} (usuario: ${targetUserId})`,
      metadata: { targetUserId, oldRole, newRole },
    });
  },

  // ── Rooms ──
  checkIn(userId, ip, roomNumber, guest) {
    return log('checkin', {
      userId,
      ip,
      action: 'checkin',
      detail: `Check-in: Hab ${roomNumber} - ${guest}`,
      metadata: { roomNumber, guest },
    });
  },
  checkout(userId, ip, roomNumber, guest, total) {
    return log('checkout', {
      userId,
      ip,
      action: 'checkout',
      detail: `Check-out: Hab ${roomNumber} - ${guest}`,
      metadata: { roomNumber, guest, total },
    });
  },
  reserve(userId, ip, roomNumber, guest) {
    return log('reservation', {
      userId,
      ip,
      action: 'reserve',
      detail: `Reserva: Hab ${roomNumber} - ${guest}`,
      metadata: { roomNumber, guest },
    });
  },
  cancelReservation(userId, ip, roomNumber) {
    return log('reservation_cancelled', {
      userId,
      ip,
      action: 'cancel_reserve',
      detail: `Reserva cancelada: Hab ${roomNumber}`,
      metadata: { roomNumber },
    });
  },
  roomStatusChanged(userId, ip, roomNumber, from, to) {
    return log('room_status_change', {
      userId,
      ip,
      action: 'room_status',
      detail: `Estado Hab ${roomNumber}: ${from} -> ${to}`,
      metadata: { roomNumber, from, to },
    });
  },
  consumoCreated(userId, ip, roomNumber, descripcion, precio) {
    return log('consumo_created', {
      userId,
      ip,
      action: 'consumo',
      detail: `Consumo: Hab ${roomNumber} - ${descripcion} ($${precio})`,
      metadata: { roomNumber, descripcion, precio },
    });
  },
  checkoutRequested(userId, ip, roomNumber) {
    return log('checkout_requested', {
      userId,
      ip,
      action: 'checkout_request',
      detail: `Solicitud de checkout: Hab ${roomNumber}`,
      metadata: { roomNumber },
    });
  },
};

module.exports = auditor;
