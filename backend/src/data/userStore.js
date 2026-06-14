'use strict';

const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const persistence = require('./persistence');
const logger = require('../utils/logger');

const ROLES = ['owner', 'admin', 'operator', 'analyst', 'cliente'];

// Write lock to serialize read-modify-write cycles (C27, C28)
const userWriteLocks = new Map();
function withUserLock(key, fn) {
  if (!userWriteLocks.has(key)) userWriteLocks.set(key, Promise.resolve());
  const prev = userWriteLocks.get(key);
  const next = prev.then(fn, fn);
  userWriteLocks.set(key, next);
  return next;
}

async function getUsers() {
  return persistence.getUsers();
}

async function saveUsers(users) {
  return persistence.setUsers(users);
}

async function findUserById(id) {
  const users = await getUsers();
  return users.find((u) => u.id === id) || null;
}

async function findUserByEmail(email) {
  const users = await getUsers();
  return users.find((u) => u.email === email) || null;
}

async function findUserByUsername(username) {
  const users = await getUsers();
  return users.find((u) => u.username === username) || null;
}

async function findUserByEmailOrUsername(identifier) {
  const users = await getUsers();
  return (
    users.find((u) => u.email === identifier || u.username === identifier) ||
    null
  );
}

async function createUser({
  username,
  email,
  password,
  firstName,
  lastName,
  role = 'cliente',
  isActive = true,
}) {
  return withUserLock('_create', async () => {
    const users = await getUsers();

    // Internal uniqueness check — prevents race between two concurrent registrations (D28)
    if (users.some((u) => u.email === email)) {
      const err = new Error('Ya existe un usuario con ese email o username');
      err.statusCode = 409;
      throw err;
    }
    if (users.some((u) => u.username === username)) {
      const err = new Error('Ya existe un usuario con ese email o username');
      err.statusCode = 409;
      throw err;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date().toISOString();

    const user = {
      id: `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      username,
      email,
      passwordHash,
      firstName: firstName || '',
      lastName: lastName || '',
      avatar: null,
      role,
      isActive,
      emailVerified: false,
      twoFactorEnabled: false,
      lastLogin: null,
      lastIp: null,
      createdAt: now,
      updatedAt: now,
    };

    users.push(user);
    await saveUsers(users);

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  });
}

async function updateUser(id, updates) {
  return withUserLock(id, async () => {
    const users = await getUsers();
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) return null;

    const allowed = [
      'firstName',
      'lastName',
      'avatar',
      'role',
      'isActive',
      'emailVerified',
      'twoFactorEnabled',
    ];
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        users[index][key] = updates[key];
      }
    }

    users[index].updatedAt = new Date().toISOString();
    await saveUsers(users);

    const { passwordHash: _, ...safeUser } = users[index];
    return safeUser;
  });
}

async function deleteUser(id, callerRole = null) {
  const users = await getUsers();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) return { deleted: false, reason: 'not_found' };

  const targetRole = users[index].role;

  // owner can delete anyone
  if (callerRole === 'owner') {
    users.splice(index, 1);
    await saveUsers(users);
    return { deleted: true };
  }

  // admin cannot delete other admins or owners
  if (targetRole === 'admin' || targetRole === 'owner') {
    return { deleted: false, reason: 'protected' };
  }

  users.splice(index, 1);
  await saveUsers(users);
  return { deleted: true };
}

// Dummy bcrypt hash for constant-time comparison when user doesn't exist.
// Prevents timing oracle attacks (C9).
// Real bcrypt hash of 'dummy' — ensures bcrypt.compare() spends ~100ms
// instead of throwing on invalid format.
const DUMMY_HASH =
  '$2b$10$IKgqw.s8.kinJQ6AEZGS..wJmDo14ZJpuZGzOQxifDCg5XrBbqTBe';

async function verifyPassword(identifier, password) {
  const user = await findUserByEmailOrUsername(identifier);
  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    return { valid: false, user: null };
  }
  if (!user.isActive)
    return { valid: false, user: null, reason: 'Cuenta desactivada' };

  try {
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return { valid: false, user: null };
    return { valid: true, user };
  } catch {
    return { valid: false, user: null };
  }
}

async function changePassword(id, newPassword) {
  const users = await getUsers();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) return false;

  users[index].passwordHash = await bcrypt.hash(newPassword, 12);
  users[index].updatedAt = new Date().toISOString();
  await saveUsers(users);
  return true;
}

async function seedAdminUser() {
  const users = await getUsers();
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@ecobosque.com';
  const adminPassword = process.env.ADMIN_PASSWORD;

  const existing = users.find((u) => u.role === 'admin');
  if (existing) {
    if (adminPassword) {
      const match = await bcrypt.compare(adminPassword, existing.passwordHash);
      if (!match) {
        existing.passwordHash = await bcrypt.hash(adminPassword, 12);
        existing.updatedAt = new Date().toISOString();
        await saveUsers(users);
        logger.info('Admin password updated from env');
      }
    }
    if (!existing.emailVerified) {
      existing.emailVerified = true;
      existing.updatedAt = new Date().toISOString();
      await saveUsers(users);
    }
    return existing;
  }

  const existingEmail = users.find((u) => u.email === adminEmail);
  if (existingEmail) {
    return updateUser(existingEmail.id, { role: 'admin', emailVerified: true });
  }

  if (!adminPassword) {
    logger.warn('ADMIN_PASSWORD not set, cannot seed admin user');
    return null;
  }

  const _users2 = await getUsers();
  const safeUser2 = await createUser({
    username: 'admin',
    email: adminEmail,
    password: adminPassword,
    firstName: 'Admin',
    lastName: 'EcoBosque',
    role: 'admin',
    isActive: true,
  });
  await updateUser(safeUser2.id, { emailVerified: true });
  const safeUser = await findUserById(safeUser2.id);

  logger.info('Admin user seeded from env');
  return safeUser;
}

async function updateLastLogin(id, ip) {
  const users = await getUsers();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) return;

  users[index].lastLogin = new Date().toISOString();
  users[index].lastIp = ip || null;
  users[index].updatedAt = new Date().toISOString();
  await saveUsers(users);
}

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

function sanitizeUsers(users) {
  return users.map(sanitizeUser);
}

async function seedOwnerUser() {
  const users = await getUsers();
  const ownerEmail =
    process.env.OWNER_EMAIL || 'sebastiansandoval12371@gmail.com';

  const existing = users.find((u) => u.email === ownerEmail);
  if (existing) {
    if (existing.role !== 'owner') {
      return updateUser(existing.id, { role: 'owner', emailVerified: true });
    }
    if (!existing.emailVerified) {
      return updateUser(existing.id, { emailVerified: true });
    }
    return existing;
  }

  const existingOwnerByRole = users.find((u) => u.role === 'owner');
  if (existingOwnerByRole) return existingOwnerByRole;

  const ownerPassword =
    process.env.OWNER_PASSWORD || process.env.ADMIN_PASSWORD;
  if (!ownerPassword) {
    logger.error(
      'No se puede crear usuario owner: OWNER_PASSWORD o ADMIN_PASSWORD no configurado'
    );
    return null;
  }
  const safeUser = await createUser({
    username: process.env.OWNER_USERNAME || 'sebastiansandoval',
    email: ownerEmail,
    password: ownerPassword,
    firstName: process.env.OWNER_FIRST_NAME || 'Sebastian',
    lastName: process.env.OWNER_LAST_NAME || 'Sandoval',
    role: 'owner',
    isActive: true,
  });
  await updateUser(safeUser.id, { emailVerified: true });
  const result = await findUserById(safeUser.id);
  logger.info('Owner user seeded');
  return result;
}

async function countByRole() {
  const users = await getUsers();
  const counts = {};
  for (const u of users) {
    counts[u.role] = (counts[u.role] || 0) + 1;
  }
  return counts;
}

async function getActiveCount() {
  const users = await getUsers();
  return users.filter((u) => u.isActive).length;
}

module.exports = {
  ROLES,
  getUsers,
  saveUsers,
  findUserById,
  findUserByEmail,
  findUserByUsername,
  findUserByEmailOrUsername,
  createUser,
  updateUser,
  deleteUser,
  verifyPassword,
  changePassword,
  seedAdminUser,
  seedOwnerUser,
  updateLastLogin,
  sanitizeUser,
  sanitizeUsers,
  countByRole,
  getActiveCount,
};
