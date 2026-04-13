'use strict';

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * JWT authentication middleware for admin routes.
 * Security features:
 * - Explicit algorithm restriction (HS256 only)
 * - Token format validation
 * - Generic error messages (no information leakage)
 * - Logging of authentication failures
 *
 * Expects: Authorization: Bearer <token>
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  // Validate header format
  if (!header || !header.startsWith('Bearer ')) {
    logger.warn('Auth failed: missing or malformed Authorization header', {
      ip: req.ip,
      path: req.originalUrl,
    });
    return res.status(401).json({ error: 'Autenticacion requerida' });
  }

  const token = header.slice(7);

  // Validate token is not empty
  if (!token || token.length < 10) {
    logger.warn('Auth failed: invalid token length', { ip: req.ip });
    return res.status(401).json({ error: 'Autenticacion requerida' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'], // Explicitly restrict to HS256
      clockTolerance: 30,     // Allow 30s clock skew
    });

    // Validate decoded payload structure
    if (!decoded || typeof decoded !== 'object' || !decoded.role) {
      logger.warn('Auth failed: invalid token payload structure', { ip: req.ip });
      return res.status(401).json({ error: 'Autenticacion requerida' });
    }

    // Only allow admin role
    if (decoded.role !== 'admin') {
      logger.warn('Auth failed: insufficient permissions', { ip: req.ip, role: decoded.role });
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    req.admin = decoded;
    next();
  } catch (err) {
    logger.warn('Auth failed: token verification error', {
      ip: req.ip,
      error: err.name,
      path: req.originalUrl,
    });

    // Generic error - don't expose token details
    return res.status(401).json({ error: 'Autenticacion requerida' });
  }
}

module.exports = { requireAuth };
