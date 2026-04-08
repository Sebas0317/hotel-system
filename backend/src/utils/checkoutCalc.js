'use strict';

/**
 * Checkout calculation utility.
 * Computes room charges, consumos total, IVA, and grand total.
 * Used by both backend checkout and frontend checkout panels.
 * 
 * All tariffs include breakfast - no extra charge needed.
 *
 * @param {Object} params
 * @param {string} params.roomTipo - Room type (e.g., 'Suite Bosque', 'Habitacion Doble')
 * @param {string} [params.checkIn] - ISO check-in date
 * @param {Array} [params.consumos] - Array of consumo objects with { precio }
 * @param {Object} [params.tarifas] - Live tariff map from backend { [tipo]: { precio, incluyeDesayuno } }
 * @returns {Object} { tarifaNoche, noches, cargoHabitacion, totalConsumos, subtotal, iva, total, incluyeDesayuno }
 */
function calcularCheckout({ roomTipo, checkIn, consumos = [], tarifas = {} }) {
  const roomTarifa = tarifas[roomTipo];
  const tarifaNoche = roomTarifa?.precio || 200000;
  const incluyeDesayuno = roomTarifa?.incluyeDesayuno || true;

  let noches = 1;
  if (checkIn) {
    const checkInDate = new Date(checkIn);
    const now = new Date();
    noches = Math.max(1, Math.ceil((now - checkInDate) / (1000 * 60 * 60 * 24)));
  }

  const cargoHabitacion = tarifaNoche * noches;
  const totalConsumos = consumos.reduce((sum, c) => sum + (c.precio || 0), 0);
  const subtotal = cargoHabitacion + totalConsumos;
  const iva = Math.round(subtotal * 0.19);
  const total = subtotal + iva;

  return {
    tarifaNoche,
    noches,
    cargoHabitacion,
    totalConsumos,
    subtotal,
    iva,
    total,
    incluyeDesayuno,
  };
}

module.exports = { calcularCheckout };
