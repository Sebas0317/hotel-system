'use strict';

/**
 * Consumo controllers - handles all consumption-related business logic
 * Async operations with non-blocking I/O
 */
const { getConsumos, saveConsumos, getRooms } = require('../data/jsonStore');
const { generateId } = require('../utils/idGenerator');

async function createConsumo(req, res) {
  try {
    const { roomId, descripcion, precio, categoria } = req.body;

    const rooms = await getRooms();
    const room = rooms.find(r => String(r.id) === String(roomId));

    if (!room) {
      return res.status(404).json({ error: `Habitación ${roomId} no encontrada` });
    }

    if (room.estado !== 'ocupada') {
      return res.status(400).json({ error: `Solo se pueden registrar consumos en habitaciones ocupadas. Estado actual: ${room.estado}` });
    }

    const nuevo = {
      id: generateId(),
      roomId: String(roomId),
      descripcion,
      categoria,
      precio,
      fecha: new Date().toISOString(),
    };

    const consumos = await getConsumos();
    consumos.push(nuevo);
    await saveConsumos(consumos);

    res.json(nuevo);
  } catch (err) {
    require('../utils/logger').error('Error creating consumo', { error: err.message });
    res.status(500).json({ error: 'Error interno al registrar consumo' });
  }
}

async function getConsumosByRoom(req, res) {
  try {
    const consumos = await getConsumos();
    const filtered = consumos.filter(c => String(c.roomId) === req.params.roomId);
    res.json(filtered);
  } catch (err) {
    require('../utils/logger').error('Error getting consumos', { error: err.message });
    res.status(500).json({ error: 'Error interno al obtener consumos' });
  }
}

module.exports = {
  createConsumo,
  getConsumosByRoom,
};
