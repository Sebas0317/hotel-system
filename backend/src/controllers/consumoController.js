'use strict';

/**
 * Consumo controllers - handles all consumption-related business logic
 * Separated from routes for testability and maintainability
 */
const { getConsumos, saveConsumos, getRooms } = require('../data/jsonStore');
const { generateId } = require('../utils/idGenerator');

function createConsumo(req, res) {
  const { roomId, descripcion, precio, categoria } = req.body;

  const rooms = getRooms();
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

  const consumos = getConsumos();
  consumos.push(nuevo);
  saveConsumos(consumos);

  res.json(nuevo);
}

function getConsumosByRoom(req, res) {
  const consumos = getConsumos().filter(c => String(c.roomId) === req.params.roomId);
  res.json(consumos);
}

module.exports = {
  createConsumo,
  getConsumosByRoom,
};
