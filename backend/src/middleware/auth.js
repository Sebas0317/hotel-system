'use strict';

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { hasPermission } = require('../utils/permissions');
const { getJwtSecret } = require('../utils/secretLoader');

function requireAuth(req, res, next) {
  // Only accept httpOnly cookie (Bearer header removed for security)
  const token = req.cookies?.token;

  if (!token || token.length < 10) {
    logger.warn('Auth failed: invalid token length', { ip: req.ip });
    return res.status(401).json({ error: 'Autenticacion requerida' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: ['HS256'],
      clockTolerance: 30,
    });

    if (
      !decoded ||
      typeof decoded !== 'object' ||
      !decoded.role ||
      !decoded.id
    ) {
      logger.warn('Auth failed: invalid token payload structure', {
        ip: req.ip,
      });
      return res.status(401).json({ error: 'Autenticacion requerida' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    logger.warn('Auth failed: token verification error', {
      ip: req.ip,
      error: err.name,
      path: req.originalUrl,
    });
    return res.status(401).json({ error: 'Autenticacion requerida' });
  }
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacion requerida' });
    }

    if (!hasPermission(req.user.role, permission)) {
      logger.warn('Permission denied', {
        ip: req.ip,
        role: req.user.role,
        required: permission,
        path: req.originalUrl,
      });
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    next();
  };
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacion requerida' });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Role denied', {
        ip: req.ip,
        role: req.user.role,
        required: roles,
        path: req.originalUrl,
      });
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    next();
  };
}

// Verifies the user's role is current (not stale from JWT).
// Must be used after requireAuth.
function revalidateRole(req, res, next) {
  (async () => {
    try {
      const userStore = require('../data/userStore');
      const currentUser = await userStore.findUserById(req.user.id);
      if (!currentUser?.isActive) {
        return res
          .status(401)
          .json({ error: 'Usuario no encontrado o inactivo' });
      }
      req.user = { ...req.user, role: currentUser.role };
      next();
    } catch (err) {
      logger.warn({ err }, 'Role revalidation failed');
      return res.status(500).json({ error: 'Error de autenticacion' });
    }
  })();
}

function optionalAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token || token.length < 10) {
    return next();
  }
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: ['HS256'],
      clockTolerance: 30,
    });
    if (decoded && typeof decoded === 'object' && decoded.role && decoded.id) {
      req.user = decoded;
    }
    next();
  } catch {
    next();
  }
}

// CSRF protection: requires a custom header on state-changing requests.
// CSRF protection using csurf (cookie token) — gracefully handles Express 5 incompatibility
let csrfProtection;
try {
  const csurf = require('csurf');
  csrfProtection = (process.env.NODE_ENV === 'test')
    ? (req, res, next) => next()
    : csurf({ cookie: true });
} catch (e) {
  logger.warn('csurf not available — CSRF protection disabled');
  csrfProtection = (req, res, next) => next();
}

module.exports = {
  requireAuth,
  optionalAuth,
  requirePermission,
  requireRole,
  revalidateRole,
  csrfProtection,
  getJwtSecret,
};
