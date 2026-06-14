'use strict';

const logger = require('../utils/logger');
const userStore = require('../data/userStore');
const auditor = require('../utils/auditor');

async function listUsers(req, res) {
  try {
    const { search, role, isActive, sort } = req.query;
    let users = await userStore.getUsers();
    users = userStore.sanitizeUsers(users);

    if (search) {
      const q = search.toLowerCase();
      users = users.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.firstName?.toLowerCase().includes(q) ||
          u.lastName?.toLowerCase().includes(q)
      );
    }

    if (role && userStore.ROLES.includes(role)) {
      users = users.filter((u) => u.role === role);
    }

    if (isActive === 'true') users = users.filter((u) => u.isActive);
    else if (isActive === 'false') users = users.filter((u) => !u.isActive);

    if (sort === 'created')
      users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    else if (sort === 'login')
      users.sort((a, b) =>
        (b.lastLogin || '') > (a.lastLogin || '') ? 1 : -1
      );
    else users.sort((a, b) => a.username.localeCompare(b.username));

    return res.json(users);
  } catch (err) {
    logger.error({ err }, 'List users error');
    return res.status(500).json({ error: 'Error al listar usuarios' });
  }
}

async function getUser(req, res) {
  try {
    const user = await userStore.findUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    return res.json(userStore.sanitizeUser(user));
  } catch (err) {
    logger.error({ err }, 'Get user error');
    return res.status(500).json({ error: 'Error al obtener usuario' });
  }
}

async function createUser(req, res) {
  try {
    const { username, email, password, firstName, lastName, role } = req.body;
    const meta = auditor.reqMeta(req);

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ error: 'username, email y password requeridos' });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: 'La contrasena debe tener al menos 8 caracteres' });
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return res.status(400).json({
        error: 'La contrasena debe contener mayuscula, minuscula y numero',
      });
    }

    const existingEmail = await userStore.findUserByEmail(email);
    if (existingEmail)
      return res.status(409).json({ error: 'Email ya registrado' });

    const existingUsername = await userStore.findUserByUsername(username);
    if (existingUsername)
      return res.status(409).json({ error: 'Username ya en uso' });

    const validRole = userStore.ROLES.includes(role) ? role : 'cliente';

    // Prevent privilege escalation: non-owners cannot create admin or owner users
    const creatorRole = req.user?.role || 'cliente';
    if (
      (validRole === 'admin' || validRole === 'owner') &&
      creatorRole !== 'owner'
    ) {
      return res
        .status(403)
        .json({ error: 'Solo un owner puede crear usuarios admin u owner' });
    }

    const safeUser = await userStore.createUser({
      username,
      email,
      password,
      firstName: firstName || '',
      lastName: lastName || '',
      role: validRole,
      isActive: true,
    });

    logger.info(
      { userId: safeUser.id, email, role: validRole },
      'User created by admin'
    );
    await auditor.userCreated(
      meta.userId,
      meta.ip,
      safeUser.id,
      email,
      validRole
    );
    return res
      .status(201)
      .json({ mensaje: 'Usuario creado', usuario: safeUser });
  } catch (err) {
    logger.error({ err }, 'Create user error');
    return res.status(500).json({ error: 'Error al crear usuario' });
  }
}

async function updateUser(req, res) {
  try {
    const {
      firstName,
      lastName,
      avatar,
      role,
      isActive,
      emailVerified,
      twoFactorEnabled,
    } = req.body;
    const meta = auditor.reqMeta(req);
    const updates = { firstName, lastName, avatar };
    const changes = {};

    const currentUser = await userStore.findUserById(req.params.id);

    if (role !== undefined && userStore.ROLES.includes(role)) {
      // Prevent privilege escalation: non-owners cannot upgrade to admin or owner
      const updaterRole = req.user?.role || 'cliente';
      if ((role === 'admin' || role === 'owner') && updaterRole !== 'owner') {
        return res
          .status(403)
          .json({ error: 'Solo un owner puede asignar roles admin u owner' });
      }
      updates.role = role;
      if (currentUser && currentUser.role !== role) {
        changes.oldRole = currentUser.role;
        changes.newRole = role;
      }
    }
    if (isActive !== undefined) updates.isActive = isActive;
    if (emailVerified !== undefined) updates.emailVerified = emailVerified;
    if (twoFactorEnabled !== undefined)
      updates.twoFactorEnabled = twoFactorEnabled;

    const user = await userStore.updateUser(req.params.id, updates);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    logger.info({ userId: req.params.id }, 'User updated');
    if (changes.oldRole) {
      await auditor.roleChanged(
        meta.userId,
        meta.ip,
        req.params.id,
        changes.oldRole,
        changes.newRole
      );
    } else {
      const changedFields = Object.keys(updates).filter(
        (k) => updates[k] !== undefined
      );
      await auditor.userUpdated(
        meta.userId,
        meta.ip,
        req.params.id,
        changedFields
      );
    }
    return res.json({ mensaje: 'Usuario actualizado', usuario: user });
  } catch (err) {
    logger.error({ err }, 'Update user error');
    return res.status(500).json({ error: 'Error al actualizar usuario' });
  }
}

async function deleteUser(req, res) {
  try {
    const meta = auditor.reqMeta(req);

    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    }

    const result = await userStore.deleteUser(req.params.id, req.user.role);
    if (!result.deleted) {
      if (result.reason === 'protected') {
        return res
          .status(403)
          .json({ error: 'No puedes eliminar administradores u otros owners' });
      }
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    logger.info(
      { userId: req.params.id, deletedBy: req.user.id },
      'User deleted'
    );
    await auditor.userDeleted(meta.userId, meta.ip, req.params.id);
    return res.json({ mensaje: 'Usuario eliminado' });
  } catch (err) {
    logger.error({ err }, 'Delete user error');
    return res.status(500).json({ error: 'Error al eliminar usuario' });
  }
}

async function resetUserPassword(req, res) {
  try {
    const { newPassword, twoFactorCode } = req.body;
    const meta = auditor.reqMeta(req);

    if (!newPassword || newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: 'La contrasena debe tener al menos 8 caracteres' });
    }

    // Require 2FA code if the admin has 2FA enabled
    const admin = await userStore.findUserById(req.user.id);
    if (admin?.twoFactorEnabled) {
      if (!twoFactorCode) {
        return res
          .status(400)
          .json({ error: 'Codigo 2FA requerido', requires2FA: true });
      }
      const codeStore = require('../data/codeStore');
      const verification = await codeStore.verifyCode(
        req.user.id,
        '2fa',
        twoFactorCode,
        true
      );
      if (!verification.valid) {
        return res
          .status(401)
          .json({ error: verification.reason || 'Codigo 2FA invalido' });
      }
    }

    const user = await userStore.findUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    await userStore.changePassword(req.params.id, newPassword);
    logger.info(
      { userId: req.params.id, resetBy: req.user.id },
      'Password reset by admin'
    );
    await auditor.passwordResetByAdmin(meta.userId, meta.ip, req.params.id);

    return res.json({ mensaje: 'Contrasena restablecida exitosamente' });
  } catch (err) {
    logger.error({ err }, 'Reset password error');
    return res.status(500).json({ error: 'Error al restablecer contrasena' });
  }
}

async function getStats(_req, res) {
  try {
    const users = await userStore.getUsers();
    const counts = await userStore.countByRole();
    const activeCount = await userStore.getActiveCount();

    return res.json({
      total: users.length,
      activos: activeCount,
      inactivos: users.length - activeCount,
      porRol: counts,
    });
  } catch (err) {
    logger.error({ err }, 'User stats error');
    return res.status(500).json({ error: 'Error al obtener estadisticas' });
  }
}

async function getRoles(_req, res) {
  return res.json({ roles: userStore.ROLES });
}

module.exports = {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  getStats,
  getRoles,
};
