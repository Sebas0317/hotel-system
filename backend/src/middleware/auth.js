'use strict';

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { hasPermission } = require('../utils/permissions');

function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  logger.error('JWT_SECRET no configurado. Usando secreto temporal.');
  return require('crypto').randomBytes(64).toString('hex');
}

function requireAuth(req, res, next) {
  // Only accept httpOnly cookie (Bearer header removed for security)
  const token = req.cookies && req.cookies.token;

  if (!token || token.length < 10) {
    logger.warn('Auth failed: invalid token length', { ip: req.ip });
    return res.status(401).json({ error: 'Autenticacion requerida' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: ['HS256'],
      clockTolerance: 30,
    });

    if (!decoded || typeof decoded !== 'object' || !decoded.role || !decoded.id) {
      logger.warn('Auth failed: invalid token payload structure', { ip: req.ip });
      return res.status(401).json({ error: 'Autenticacion requerida' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    logger.warn('Auth failed: token verification error', {
      ip: req.ip, error: err.name, path: req.originalUrl,
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
        ip: req.ip, role: req.user.role, required: permission, path: req.originalUrl,
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
        ip: req.ip, role: req.user.role, required: roles, path: req.originalUrl,
      });
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    next();
  };
}

module.exports = { requireAuth, requirePermission, requireRole, getJwtSecret };
