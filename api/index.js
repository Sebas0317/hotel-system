'use strict';

let app;
try {
  app = require('../backend/server');
} catch (err) {
  app = null;
}

module.exports = async (req, res) => {
  if (!app) {
    res.status(500).json({ error: 'Error al cargar el servidor' });
    return;
  }
  try {
    await app(req, res);
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};