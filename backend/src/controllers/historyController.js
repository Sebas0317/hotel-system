'use strict';

const { getHistory, saveHistory } = require('../data/jsonStore');
const { generateId } = require('../utils/idGenerator');
const logger = require('../utils/logger');

async function getAllHistory(req, res) {
  try {
    const historyData = await getHistory();
    const history = Array.isArray(historyData)
      ? historyData
      : historyData.reservas || [];

    // Pagination (opt-in via query params for backward compatibility)
    if (req.query.page || req.query.limit) {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(
        100,
        Math.max(1, parseInt(req.query.limit, 10) || 50)
      );
      const total = history.length;
      const totalPages = Math.ceil(total / limit);
      const start = (page - 1) * limit;
      const data = history.slice(start, start + limit);

      if (!Array.isArray(historyData) && historyData?.reservas) {
        return res.json({
          reservas: data,
          pagination: { page, limit, total, totalPages },
        });
      }
      return res.json({ data, pagination: { page, limit, total, totalPages } });
    }

    // Legacy format (no pagination)
    res.json(historyData);
  } catch (err) {
    logger.error('Error getting history', { error: err.message });
    res.status(500).json({ error: 'Error interno al obtener historial' });
  }
}

async function addHistoryEntry(req, res) {
  try {
    const historyData = await getHistory();

    let history;
    let isObjectWrapped = false;
    if (Array.isArray(historyData)) {
      history = historyData;
    } else {
      history = historyData?.reservas || [];
      isObjectWrapped = true;
    }

    const allowed = [
      'tipo',
      'descripcion',
      'roomId',
      'huesped',
      'accion',
      'detalle',
      'usuario',
      'metadata',
    ];
    const sanitized = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) sanitized[k] = req.body[k];
    }
    const entry = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      ...sanitized,
    };

    history.unshift(entry);

    if (isObjectWrapped) {
      await saveHistory({ ...historyData, reservas: history });
    } else {
      await saveHistory(history);
    }
    res.json(entry);
  } catch (err) {
    logger.error('Error adding history entry', { error: err.message });
    res.status(500).json({ error: 'Error interno al agregar entrada' });
  }
}

async function getHistoryByRoom(req, res) {
  try {
    const historyData = await getHistory();
    const history = Array.isArray(historyData)
      ? historyData
      : historyData?.reservas || [];
    const roomHistory = history.filter(
      (h) => h.roomId === req.params.roomId || h.numero === req.params.roomId
    );
    res.json(roomHistory);
  } catch (err) {
    logger.error('Error getting room history', { error: err.message });
    res
      .status(500)
      .json({ error: 'Error interno al obtener historial de habitación' });
  }
}

module.exports = {
  getAllHistory,
  addHistoryEntry,
  getHistoryByRoom,
};
