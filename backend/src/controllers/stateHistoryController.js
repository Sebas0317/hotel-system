'use strict';

const { getStateHistory, saveStateHistory } = require('../data/jsonStore');
const { generateId } = require('../utils/idGenerator');

async function getAllStateHistory(_req, res) {
  try {
    const cambios = await getStateHistory();
    res.json(cambios);
  } catch (err) {
    require('../utils/logger').error('Error getting state history', { error: err.message });
    res.status(500).json({ error: 'Error interno al obtener historial de estados' });
  }
}

async function addStateChange(req, res) {
  try {
    const cambios = await getStateHistory();
    const { roomId, numero, estadoAnterior, estadoNuevo, huesped, timestamp } = req.body;

    const entry = {
      id: generateId(),
      roomId,
      numero,
      estadoAnterior,
      estadoNuevo,
      huesped: huesped || '',
      timestamp: timestamp || new Date().toISOString(),
    };

    cambios.unshift(entry);
    await saveStateHistory(cambios);
    res.json(entry);
  } catch (err) {
    require('../utils/logger').error('Error adding state change', { error: err.message });
    res.status(500).json({ error: 'Error interno al agregar cambio de estado' });
  }
}

async function getStateHistoryByRoom(req, res) {
  try {
    const cambios = await getStateHistory();
    const roomHistory = cambios.filter(c => c.roomId === req.params.roomId || c.numero === req.params.roomId);
    res.json(roomHistory);
  } catch (err) {
    require('../utils/logger').error('Error getting room state history', { error: err.message });
    res.status(500).json({ error: 'Error interno al obtener historial de habitación' });
  }
}

module.exports = {
  getAllStateHistory,
  addStateChange,
  getStateHistoryByRoom,
};
