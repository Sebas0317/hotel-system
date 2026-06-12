'use strict';

const logger = require('../utils/logger');
const userStore = require('../data/userStore');

async function listUsers(req, res) {
  try {
    const { search, role, isActive, sort } = req.query;
    let users = await userStore.getUsers();
    users = userStore.sanitizeUsers(users);

    if (search) {
      const q = search.toLowerCase();
      users = users.filter(u =>
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.firstName?.toLowerCase().includes(q) ||
        u.lastName?.toLowerCase().includes(q)
      );
    }

    if (role && userStore.ROLES.includes(role)) {
      users = users.filter(u => u.role === role);
    }

    if (isActive === 'true') users = users.filter(u => u.isActive);
    else if (isActive === 'false') users = users.filter(u => !u.isActive);

    if (sort === 'created') users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    else if (sort === 'login') users.sort((a, b) => (b.lastLogin || '') > (a.lastLogin || '') ? 1 : -1);
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

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email y password requeridos' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'La contrasena debe tener al menos 8 caracteres' });
    }

    const existingEmail = await userStore.findUserByEmail(email);
    if (existingEmail) return res.status(409).json({ error: 'Email ya registrado' });

    const existingUsername = await userStore.findUserByUsername(username);
    if (existingUsername) return res.status(409).json({ error: 'Username ya en uso' });

    const validRole = userStore.ROLES.includes(role) ? role : 'reception';

    const safeUser = await userStore.createUser({
      username, email, password, firstName: firstName || '', lastName: lastName || '',
      role: validRole, isActive: true,
    });

    logger.info({ userId: safeUser.id, email, role: validRole }, 'User created by admin');
    return res.status(201).json({ mensaje: 'Usuario creado', usuario: safeUser });
  } catch (err) {
    logger.error({ err }, 'Create user error');
    return res.status(500).json({ error: 'Error al crear usuario' });
  }
}

async function updateUser(req, res) {
  try {
    const { firstName, lastName, avatar, role, isActive, emailVerified, twoFactorEnabled } = req.body;
    const updates = { firstName, lastName, avatar };

    if (role !== undefined && userStore.ROLES.includes(role)) {
      updates.role = role;
    }
    if (isActive !== undefined) updates.isActive = isActive;
    if (emailVerified !== undefined) updates.emailVerified = emailVerified;
    if (twoFactorEnabled !== undefined) updates.twoFactorEnabled = twoFactorEnabled;

    const user = await userStore.updateUser(req.params.id, updates);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    logger.info({ userId: req.params.id }, 'User updated');
    return res.json({ mensaje: 'Usuario actualizado', usuario: user });
  } catch (err) {
    logger.error({ err }, 'Update user error');
    return res.status(500).json({ error: 'Error al actualizar usuario' });
  }
}

async function deleteUser(req, res) {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    }

    const deleted = await userStore.deleteUser(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Usuario no encontrado o es admin principal' });

    logger.info({ userId: req.params.id, deletedBy: req.user.id }, 'User deleted');
    return res.json({ mensaje: 'Usuario eliminado' });
  } catch (err) {
    logger.error({ err }, 'Delete user error');
    return res.status(500).json({ error: 'Error al eliminar usuario' });
  }
}

async function resetUserPassword(req, res) {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'La contrasena debe tener al menos 8 caracteres' });
    }

    const user = await userStore.findUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    await userStore.changePassword(req.params.id, newPassword);
    logger.info({ userId: req.params.id, resetBy: req.user.id }, 'Password reset by admin');

    return res.json({ mensaje: 'Contrasena restablecida exitosamente' });
  } catch (err) {
    logger.error({ err }, 'Reset password error');
    return res.status(500).json({ error: 'Error al restablecer contrasena' });
  }
}

async function getStats(req, res) {
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

async function getRoles(req, res) {
  return res.json({ roles: userStore.ROLES });
}

module.exports = {
  listUsers, getUser, createUser, updateUser, deleteUser,
  resetUserPassword, getStats, getRoles,
};
