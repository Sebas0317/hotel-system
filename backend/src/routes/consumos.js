'use strict';

/**
 * Consumos routes - defines all consumption-related endpoints
 * Uses validation middleware and delegates to controllers
 */
const express = require('express');
const router = express.Router();
const consumoController = require('../controllers/consumoController');
const { requireFields, validateEnum, validatePositiveNumber } = require('../middleware/validation');

const CATEGORIAS = ['restaurante', 'bar', 'servicios'];

// POST /consumos - Register a new consumption
router.post(
  '/',
  requireFields('roomId', 'descripcion', 'precio', 'categoria'),
  validateEnum('categoria', CATEGORIAS, 'Categoría inválida. Debe ser: restaurante, bar o servicios'),
  validatePositiveNumber('precio'),
  consumoController.createConsumo
);

// GET /consumos/:roomId - Get consumos for a room
router.get('/:roomId', consumoController.getConsumosByRoom);

module.exports = router;
