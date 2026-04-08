'use strict';

const { getPrices, savePrices } = require('../data/priceStore');

function getAllPrices(_req, res) {
  const prices = getPrices();
  if (!prices) {
    return res.status(500).json({ error: 'No se pudo cargar la configuración de precios' });
  }
  res.json(prices);
}

function updatePrices(req, res) {
  const { tarifas, productos } = req.body;

  if (!tarifas || !productos) {
    return res.status(400).json({ error: 'Se requieren tarifas y productos' });
  }

  for (const [tipo, precio] of Object.entries(tarifas)) {
    if (typeof precio !== 'number' || precio <= 0) {
      return res.status(400).json({ error: `Tarifa inválida para "${tipo}": debe ser un número positivo` });
    }
  }

  for (const [categoria, items] of Object.entries(productos)) {
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: `Productos de "${categoria}" debe ser un arreglo` });
    }
    for (const item of items) {
      if (typeof item.precio !== 'number' || item.precio <= 0) {
        return res.status(400).json({ error: `Precio inválido para "${item.nombre}": debe ser un número positivo` });
      }
    }
  }

  savePrices({ tarifas, productos });
  res.json({ message: 'Precios actualizados', tarifas, productos });
}

module.exports = { getAllPrices, updatePrices };
