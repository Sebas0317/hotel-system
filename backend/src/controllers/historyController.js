'use strict';

const { getHistory, saveHistory } = require('../data/jsonStore');
const { generateId } = require('../utils/idGenerator');

async function getAllHistory(req, res) {
  try {
    const historyData = await getHistory();
    const history = Array.isArray(historyData) ? historyData : (historyData.reservas || []);

    // Pagination (opt-in via query params for backward compatibility)
    if (req.query.page || req.query.limit) {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
      const total = history.length;
      const totalPages = Math.ceil(total / limit);
      const start = (page - 1) * limit;
      const data = history.slice(start, start + limit);

      if (!Array.isArray(historyData) && historyData?.reservas) {
        return res.json({ reservas: data, pagination: { page, limit, total, totalPages } });
      }
      return res.json({ data, pagination: { page, limit, total, totalPages } });
    }

    // Legacy format (no pagination)
    res.json(historyData);
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
