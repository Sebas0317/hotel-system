'use strict';

/**
 * Room routes - defines all room-related endpoints
 * Uses validation middleware and delegates to controllers
 *
 * Route ordering: specific routes BEFORE parameterized routes (:id)
 * to prevent Express from matching "validar" as an :id parameter.
 */
const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { requireFields, validateEnum } = require('../middleware/validation');
const { requireAuth } = require('../middleware/auth');

const METODOS_PAGO = ['efectivo', 'tarjeta', 'transferencia'];

// ── PUBLIC ROUTES (no auth required) ──

// GET /rooms - List all rooms
router.get('/', roomController.getAllRooms);

// GET /rooms/stats - Room statistics
router.get('/stats', roomController.getRoomStats);

// GET /rooms/reservaciones - List all reservations
router.get('/reservaciones', requireAuth, roomController.getReservaciones);

// POST /rooms/checkin - Check in a guest
router.post(
  '/checkin',
  requireFields('numero', 'huesped'),
  roomController.checkIn
);

// POST /rooms/validar - Validate room PIN
// NOTE: Must be BEFORE /:id routes to prevent "validar" being matched as :id
router.post(
  '/validar',
  requireFields('numero', 'pin'),
  roomController.validarPin
);

// ── PROTECTED ROUTES (admin auth required) ──

// POST /rooms/:id/reservar - Create a reservation
router.post(
  '/:id/reservar',
  requireAuth,
  requireFields('huesped'),
  roomController.reservar
);

// POST /rooms/:id/update-guest - Update guest data for occupied room
router.post(
  '/:id/update-guest',
  requireAuth,
  roomController.actualizarHuesped
);

// PATCH /rooms/:id/status - Update room status (non-occupied only)
router.patch(
  '/:id/status',
  requireAuth,
  roomController.actualizarEstado
);

// POST /rooms/:id/checkout - Check out a guest
router.post(
  '/:id/checkout',
  requireAuth,
  requireFields('metodoPago'),
  validateEnum('metodoPago', METODOS_PAGO, 'Método de pago inválido. Debe ser: efectivo, tarjeta o transferencia'),
  roomController.checkout
);

// POST /rooms/:id/cancel - Cancel a reservation
router.post(
  '/:id/cancel',
  requireAuth,
  roomController.cancelarReserva
);

module.exports = router;
