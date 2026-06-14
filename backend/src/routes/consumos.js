'use strict';

/**
 * Consumos routes - defines all consumption-related endpoints
 * Uses validation middleware and delegates to controllers
 */
const express = require('express');
const router = express.Router();
const consumoController = require('../controllers/consumoController');
const {
  requireFields,
  validateEnum,
  validatePositiveNumber,
} = require('../middleware/validation');
const { requireRoomAccess } = require('../middleware/roomAccess');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../middleware/auth');

const CATEGORIAS = ['restaurante', 'bar', 'servicios'];

function requireConsumoAuth(req, res, next) {
  // Check admin auth cookie first
  const cookieToken = req.cookies?.token;
  if (cookieToken && cookieToken.length >= 10) {
    try {
      const decoded = jwt.verify(cookieToken, getJwtSecret(), {
        algorithms: ['HS256'],
        clockTolerance: 30,
      });
      if (decoded?.role && decoded.id) {
        req.user = decoded;
        return next();
      }
    } catch {
      // Fall through to room token check
    }
  }
  // Check room token
  const roomToken = req.headers['x-room-token'];
  if (roomToken) {
    try {
      const decoded = jwt.verify(roomToken, getJwtSecret(), {
        algorithms: ['HS256'],
        clockTolerance: 30,
      });
      if (decoded && decoded.type === 'room' && decoded.roomId) {
        req.roomAccess = decoded;
        return next();
      }
    } catch {
      return res.status(401).json({ error: 'Token de habitacion invalido' });
    }
  }
  return res.status(401).json({ error: 'Autenticacion requerida' });
}

// POST /consumos - Register a new consumption (auth cookie or room token required)
router.post(
  '/',
  requireConsumoAuth,
  requireFields('roomId', 'descripcion', 'precio', 'categoria'),
  validateEnum(
    'categoria',
    CATEGORIAS,
    'Categoría inválida. Debe ser: restaurante, bar o servicios'
  ),
  validatePositiveNumber('precio'),
  consumoController.createConsumo
);

// GET /consumos/:roomId - Get consumos for a room (auth cookie or room token required)
router.get('/:roomId', requireConsumoAuth, consumoController.getConsumosByRoom);

module.exports = router;
