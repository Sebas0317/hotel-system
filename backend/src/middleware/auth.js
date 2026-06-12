'use strict';

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { hasPermission } = require('../utils/permissions');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    logger.warn('Auth failed: missing or malformed Authorization header', {
      ip: req.ip, path: req.originalUrl,
    });
    return res.status(401).json({ error: 'Autenticacion requerida' });
  }

  const token = header.slice(7);

  if (!token || token.length < 10) {
    logger.warn('Auth failed: invalid token length', { ip: req.ip });
    return res.status(401).json({ error: 'Autenticacion requerida' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
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

module.exports = { requireAuth, requirePermission, requireRole };
