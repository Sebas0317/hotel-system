'use strict';

const { getHistory, saveHistory } = require('../data/jsonStore');
const { generateId } = require('../utils/idGenerator');

async function getAllHistory(_req, res) {
  try {
    const history = await getHistory();
    res.json(history);
  } catch (err) {
    require('../utils/logger').error('Error getting history', { error: err.message });
    res.status(500).json({ error: 'Error interno al obtener historial' });
  }
}

async function addHistoryEntry(req, res) {
  try {
    const history = await getHistory();

    const entry = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      ...req.body,
    };

    history.unshift(entry);
    await saveHistory(history);
    res.json(entry);
  } catch (err) {
    require('../utils/logger').error('Error adding history entry', { error: err.message });
    res.status(500).json({ error: 'Error interno al agregar entrada' });
  }
}

async function getHistoryByRoom(req, res) {
  try {
    const history = await getHistory();
    const roomHistory = history.filter(h => h.roomId === req.params.roomId || h.numero === req.params.roomId);
    res.json(roomHistory);
  } catch (err) {
    require('../utils/logger').error('Error getting room history', { error: err.message });
    res.status(500).json({ error: 'Error interno al obtener historial de habitación' });
  }
}

module.exports = {
  getAllHistory,
  addHistoryEntry,
  getHistoryByRoom,
};
