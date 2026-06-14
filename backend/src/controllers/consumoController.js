'use strict';

/**
 * Consumo controllers - handles all consumption-related business logic
 * Async operations with non-blocking I/O
 */
const { getConsumos, saveConsumos, getRooms } = require('../data/jsonStore');
const { generateId } = require('../utils/idGenerator');
const logger = require('../utils/logger');
const auditor = require('../utils/auditor');
const { broadcast } = require('../utils/websocket');

async function createConsumo(req, res) {
  try {
    const { roomId, descripcion, precio, categoria } = req.body;
    const meta = auditor.reqMeta(req);

    const rooms = await getRooms();
    const room = rooms.find((r) => String(r.id) === String(roomId));

    if (!room) {
      return res
        .status(404)
        .json({ error: `Habitación ${roomId} no encontrada` });
    }

    if (room.estado !== 'ocupada') {
      return res.status(400).json({
        error: `Solo se pueden registrar consumos en habitaciones ocupadas. Estado actual: ${room.estado}`,
      });
    }

    const nuevo = {
      id: generateId(),
      roomId: String(roomId),
      descripcion,
      categoria,
      precio,
      fecha: new Date().toISOString(),
    };

    // Re-verify room state right before saving (TOCTOU guard)
    const freshRooms = await getRooms();
    const freshRoom = freshRooms.find((r) => String(r.id) === String(roomId));
    if (freshRoom?.estado !== 'ocupada') {
      return res.status(400).json({
        error: 'La habitacion ya no esta ocupada. Consumo rechazado.',
      });
    }

    const consumos = await getConsumos();
    consumos.push(nuevo);
    await saveConsumos(consumos);

    await auditor.consumoCreated(
      meta.userId,
      meta.ip,
      room.numero,
      descripcion,
      precio
    );
    broadcast('consumo:new', nuevo);
    res.json(nuevo);
  } catch (err) {
    logger.error('Error creating consumo', { error: err.message });
    res.status(500).json({ error: 'Error interno al registrar consumo' });
  }
}

async function getConsumosByRoom(req, res) {
  try {
    const roomId = req.params.roomId;

    if (req.roomAccess && String(req.roomAccess.roomId) !== String(roomId)) {
      return res
        .status(403)
        .json({ error: 'No tienes acceso a los consumos de esta habitacion' });
    }

    const consumos = await getConsumos();
    const filtered = consumos.filter((c) => String(c.roomId) === roomId);

    if (req.query.page || req.query.limit) {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(
        100,
        Math.max(1, parseInt(req.query.limit, 10) || 50)
      );
      const total = filtered.length;
      const totalPages = Math.ceil(total / limit);
      const start = (page - 1) * limit;
      const data = filtered.slice(start, start + limit);
      return res.json({ data, pagination: { page, limit, total, totalPages } });
    }

    res.json(filtered);
  } catch (err) {
    logger.error('Error getting consumos', { error: err.message });
    res.status(500).json({ error: 'Error interno al obtener consumos' });
  }
}

module.exports = {
  createConsumo,
  getConsumosByRoom,
};
