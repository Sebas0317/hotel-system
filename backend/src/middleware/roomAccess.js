'use strict';

/**
 * Middleware to validate room ownership via signed roomToken.
 * Guests receive a roomToken after successful PIN validation.
 *
 * This middleware is PERMISSIVE — it attaches req.roomAccess if a valid
 * token is present, but does NOT block requests without a token.
 * Blocking is done at the controller level by checking req.roomAccess
 * against the requested resource.
 *
 * Admin routes use requireAuth separately and are not affected.
 */
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const crypto = require('node:crypto');

function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  logger.error(
    'JWT_SECRET no configurado en roomAccess. Usando secreto temporal.'
  );
  return crypto.randomBytes(64).toString('hex');
}

function generateRoomToken(roomId, numero) {
  return jwt.sign({ roomId, numero, type: 'room' }, getJwtSecret(), {
    expiresIn: '2h',
    algorithm: 'HS256',
  });
}

function requireRoomAccess(req, res, next) {
  const token = req.headers['x-room-token'];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: ['HS256'],
      clockTolerance: 30,
    });

    if (decoded && decoded.type === 'room' && decoded.roomId) {
      req.roomAccess = decoded;
    }

    next();
  } catch (err) {
    logger.warn('Room token verification failed', {
      error: err.name,
      ip: req.ip,
      path: req.originalUrl,
    });
    return res
      .status(401)
      .json({ error: 'Token de habitacion invalido o expirado' });
  }
}

module.exports = { generateRoomToken, requireRoomAccess };
