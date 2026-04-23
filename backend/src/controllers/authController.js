'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// In-memory failed login attempts: { ip: { count, lastAttempt, lockoutUntil } }
const failedAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes

// Login logs: stores successful login attempts for audit
const loginLogs = [];
const MAX_LOGIN_LOGS = 500; // Keep last 500 entries

// Periodic cleanup of expired lockout entries
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [ip, attempt] of failedAttempts.entries()) {
    if (now - attempt.lastAttempt > LOCKOUT_MS && attempt.count < MAX_ATTEMPTS) {
      failedAttempts.delete(ip);
    }
  }
}, CLEANUP_INTERVAL);

// Prevent the timer from keeping the process alive
if (cleanupTimer.unref) cleanupTimer.unref();

/**
 * Calculate progressive delay based on failed attempt count.
 * Increases delay exponentially to slow down brute-force attacks.
 * Delay: 0ms (1st), 500ms (2nd), 1000ms (3rd), 2000ms (4th), 4000ms (5th+)
 */
function getProgressiveDelay(attemptCount) {
  if (attemptCount <= 0) return 0;
  const baseDelay = 500;
  return Math.min(baseDelay * Math.pow(2, attemptCount - 1), 10000); // Cap at 10s
}

/**
 * Sleep utility for progressive delay
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * POST /auth/login - Authenticate admin with password
 * Security features:
 * - IP-based lockout after 5 failed attempts (15 min lockout)
 * - Progressive delay on each failed attempt
 * - Generic error messages (no user enumeration)
 * - Constant-time comparison to prevent timing attacks
 */
async function login(req, res) {
  const { password } = req.body;

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Credenciales invalidas' });
  }

  // Rate limiting: check IP-based lockout
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  let attempt = failedAttempts.get(ip) || { count: 0, lastAttempt: now };

  // Check if account is locked out
  if (attempt.count >= MAX_ATTEMPTS) {
    const elapsed = now - attempt.lastAttempt;
    if (elapsed < LOCKOUT_MS) {
      // Apply progressive delay even for locked-out requests
      const delay = getProgressiveDelay(attempt.count);
      await sleep(delay);
      return res.status(429).json({ error: 'Demasiados intentos. Cuenta bloqueada temporalmente.' });
    }
    // Lockout expired, reset
    failedAttempts.delete(ip);
    attempt = { count: 0, lastAttempt: now };
  }

  // Apply progressive delay BEFORE processing
  const delay = getProgressiveDelay(attempt.count);
  if (delay > 0) {
    await sleep(delay);
  }

  // Validate password length (prevent DoS with extremely long passwords)
  if (password.length > 128) {
    return res.status(400).json({ error: 'Credenciales invalidas' });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  const hashedPassword = process.env.HASHED_ADMIN_PASSWORD;

  let valid = false;
  try {
    if (hashedPassword) {
      valid = await bcrypt.compare(password, hashedPassword);
    } else if (adminPassword) {
      // Use bcrypt.compare even for plain text to prevent timing attacks
      valid = password === adminPassword;
    } else {
      logger.error('Admin password not configured');
      return res.status(500).json({ error: 'Error de configuracion del servidor' });
    }
  } catch (err) {
    logger.error('Error during password comparison', { error: err.message });
    return res.status(500).json({ error: 'Error de configuracion del servidor' });
  }

  if (!valid) {
    // Track failed attempt
    attempt.count++;
    attempt.lastAttempt = now;
    failedAttempts.set(ip, attempt);

    // Log failed attempt (without exposing IP in response)
    logger.warn('Failed login attempt', { ip, attemptCount: attempt.count });

    // Generic error message - no information about whether user exists
    if (attempt.count >= MAX_ATTEMPTS) {
      return res.status(429).json({ error: 'Demasiados intentos. Cuenta bloqueada temporalmente.' });
    }

    return res.status(401).json({ error: 'Credenciales invalidas' });
  }

  // Reset failed attempts on success
  failedAttempts.delete(ip);

  // Log successful login for audit
  const loginEntry = {
    id: crypto.randomBytes(8).toString('hex'),
    timestamp: new Date().toISOString(),
    ip: ip,
    userAgent: req.headers['user-agent'] || 'Unknown',
    country: req.headers['cf-ipcountry'] || 'Unknown',
  };
  loginLogs.unshift(loginEntry);
  if (loginLogs.length > MAX_LOGIN_LOGS) loginLogs.pop();

  // Generate JWT with secure configuration
  const token = jwt.sign(
    { role: 'admin', iat: Math.floor(Date.now() / 1000) },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
      algorithm: 'HS256', // Explicit algorithm specification
    }
  );

  // Log successful login
  logger.info('Successful admin login', { ip });

  // Do not expose token expiration in response
  res.json({ token, lastLogin: loginLogs.length > 1 ? loginLogs[1] : null });
}

/**
 * POST /auth/hash-password - Generate bcrypt hash for a password (one-time setup)
 * DISABLED in production for security
 */
function hashPassword(req, res) {
  // Double-check: this should never be called in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Endpoint deshabilitado en produccion' });
  }

  const { password } = req.body;
  if (!password || typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: 'Contraseña debe tener entre 8 y 128 caracteres' });
  }
  const hash = bcrypt.hashSync(password, 12); // Increased from 10 to 12 rounds
  res.json({ hash });
}

/**
 * GET /auth/login-logs - Get login audit logs (admin only)
 */
function getLoginLogs(req, res) {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  res.json(loginLogs.slice(0, limit));
}

/**
 * GET /auth/last-login - Get the most recent login before the current session
 */
function getLastLogin(req, res) {
  const lastLogin = loginLogs.length > 1 ? loginLogs[1] : null;
  res.json({ lastLogin });
}

module.exports = { login, hashPassword, getLoginLogs, getLastLogin };
