'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// In-memory failed login attempts: { ip: { count, lastAttempt } }
const failedAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

/**
 * POST /auth/login - Authenticate admin with password
 */
function login(req, res) {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Contraseña requerida' });
  }

  // Rate limiting: check IP-based lockout
  const ip = req.ip || req.connection.remoteAddress;
  const attempt = failedAttempts.get(ip);
  if (attempt && attempt.count >= MAX_ATTEMPTS) {
    const elapsed = Date.now() - attempt.lastAttempt;
    if (elapsed < LOCKOUT_MS) {
      const remaining = Math.ceil((LOCKOUT_MS - elapsed) / 60000);
      return res.status(429).json({ error: `Demasiados intentos. Intenta en ${remaining} minuto${remaining > 1 ? 's' : ''}.` });
    }
    // Lockout expired, reset
    failedAttempts.delete(ip);
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  const hashedPassword = process.env.HASHED_ADMIN_PASSWORD;

  let valid;
  if (hashedPassword) {
    valid = bcrypt.compareSync(password, hashedPassword);
  } else if (adminPassword) {
    valid = password === adminPassword;
  } else {
    return res.status(500).json({ error: 'Contraseña de administrador no configurada' });
  }

  if (!valid) {
    // Track failed attempt
    const current = failedAttempts.get(ip) || { count: 0 };
    failedAttempts.set(ip, { count: current.count + 1, lastAttempt: Date.now() });
    const remaining = MAX_ATTEMPTS - (current.count + 1);
    return res.status(401).json({
      error: remaining > 0
        ? `Contraseña incorrecta. ${remaining} intento${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}.`
        : 'Contraseña incorrecta. Cuenta bloqueada por 15 minutos.',
    });
  }

  // Reset failed attempts on success
  failedAttempts.delete(ip);

  const token = jwt.sign(
    { role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  res.json({ token, expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
}

/**
 * POST /auth/hash-password - Generate bcrypt hash for a password (one-time setup)
 */
function hashPassword(req, res) {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Contraseña requerida' });
  }
  const hash = bcrypt.hashSync(password, 10);
  res.json({ hash });
}

module.exports = { login, hashPassword };
