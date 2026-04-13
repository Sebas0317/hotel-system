'use strict';

const { getPrices, savePrices } = require('../data/priceStore');

async function getAllPrices(_req, res) {
  try {
    const prices = await getPrices();
    if (!prices) {
      return res.status(500).json({ error: 'No se pudo cargar la configuración de precios' });
    }
    res.json(prices);
  } catch (err) {
    require('../utils/logger').error('Error getting prices', { error: err.message });
    res.status(500).json({ error: 'Error interno al obtener precios' });
  }
}

async function updatePrices(req, res) {
  try {
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

    await savePrices({ tarifas, productos });
    res.json({ message: 'Precios actualizados', tarifas, productos });
  } catch (err) {
    require('../utils/logger').error('Error updating prices', { error: err.message });
    res.status(500).json({ error: 'Error interno al actualizar precios' });
  }
}

module.exports = { getAllPrices, updatePrices };
