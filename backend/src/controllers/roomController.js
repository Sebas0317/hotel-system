'use strict';

/**
 * Room controllers - handles all room-related business logic
 * Separated from routes for testability and maintainability
 */
const { getRooms, saveRooms, getConsumos, saveConsumos } = require('../data/jsonStore');
const { getPrices } = require('../data/priceStore');
const { generateId } = require('../utils/idGenerator');
const { generarPin } = require('../utils/pinGenerator');
const { calcularCheckout } = require('../utils/checkoutCalc');

const pinAttempts = new Map();
const PIN_MAX_ATTEMPTS = 5;
const PIN_WINDOW_MS = 60 * 1000;

const TARIFAS_POR_TIPO = {
  'estándar': 80000,
  'doble': 120000,
  'deluxe': 180000,
  'suite junior': 250000,
  'suite': 350000,
  'suite ejecutiva': 450000,
  'presidencial': 700000,
  'cabaña': 200000,
  'cabaña premium': 350000,
};

function getAllRooms(_req, res) {
  const rooms = getRooms();
  res.json(rooms);
}

function getRoomStats(_req, res) {
  const rooms = getRooms();
  res.json({
    total: rooms.length,
    disponibles: rooms.filter(r => r.estado === 'disponible').length,
    reservadas: rooms.filter(r => r.estado === 'reservada').length,
    ocupadas: rooms.filter(r => r.estado === 'ocupada').length,
    limpieza: rooms.filter(r => r.estado === 'limpieza').length,
    mantenimiento: rooms.filter(r => r.estado === 'mantenimiento').length,
  });
}

function getReservaciones(_req, res) {
  const rooms = getRooms();
  const reservaciones = rooms
    .filter(r => r.estado === 'reservada' || r.estado === 'ocupada')
    .map(r => ({
      id: r.id,
      numero: r.numero,
      tipo: r.tipo,
      huesped: r.huesped,
      telefono: r.telefono,
      email: r.email,
      estado: r.estado,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      noches: r.noches,
      pin: r.pin,
    }))
    .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));

  res.json(reservaciones);
}

function checkIn(req, res) {
  const { numero, huesped, tipo } = req.body;
  const rooms = getRooms();
  const idx = rooms.findIndex(r => r.numero === numero);

  if (idx !== -1 && rooms[idx].estado === 'ocupada') {
    return res.status(400).json({ error: 'Habitación ya está ocupada' });
  }

  if (idx !== -1 && rooms[idx].estado === 'reservada') {
    const pin = generarPin();
    const now = new Date().toISOString();
    rooms[idx] = {
      ...rooms[idx],
      huesped,
      pin,
      estado: 'ocupada',
      checkIn: now,
    };
    saveRooms(rooms);
    return res.json(rooms[idx]);
  }

  const BLOCKED_STATES = ['limpieza', 'mantenimiento'];
  if (idx !== -1 && BLOCKED_STATES.includes(rooms[idx].estado)) {
    return res.status(400).json({ error: `Habitación en estado "${rooms[idx].estado}". Primero cámbiala a disponible.` });
  }

  const pin = generarPin();
  const now = new Date().toISOString();

  if (idx !== -1) {
    rooms[idx] = {
      ...rooms[idx],
      huesped,
      tipo: tipo || rooms[idx].tipo,
      pin,
      estado: 'ocupada',
      checkIn: now,
    };
    saveRooms(rooms);
    return res.json(rooms[idx]);
  }

  const nueva = {
    id: generateId(),
    numero,
    huesped,
    tipo: tipo || 'estándar',
    camas: '1 cama doble',
    capacidad: 2,
    piso: 1,
    pin,
    estado: 'ocupada',
    checkIn: now,
  };
  rooms.push(nueva);
  saveRooms(rooms);
  res.json(nueva);
}

function reservar(req, res) {
  const { huesped, telefono, email, noches } = req.body;

  const rooms = getRooms();
  const idx = rooms.findIndex(r => String(r.id) === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Habitación no encontrada' });
  }

  const room = rooms[idx];

  const OPERATIONAL_STATES = ['limpieza', 'mantenimiento'];
  if (room.estado !== 'disponible') {
    if (OPERATIONAL_STATES.includes(room.estado)) {
      const labels = { limpieza: 'En limpieza', mantenimiento: 'En mantenimiento' };
      return res.status(400).json({ error: `Habitación ${labels[room.estado]}. No se puede reservar.` });
    }
    return res.status(400).json({ error: `Solo se pueden reservar habitaciones disponibles. Estado actual: ${room.estado}` });
  }

  const nochesValidas = parseInt(noches) || 1;
  if (nochesValidas < 1 || nochesValidas > 30) {
    return res.status(400).json({ error: 'Noches debe ser entre 1 y 30' });
  }

  const checkIn = new Date();
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + nochesValidas);

  rooms[idx] = {
    ...room,
    huesped: huesped.trim(),
    telefono: telefono?.trim() || null,
    email: email?.trim() || null,
    pin: null,
    estado: 'reservada',
    checkIn: checkIn.toISOString(),
    checkOut: checkOut.toISOString(),
    noches: nochesValidas,
  };
  saveRooms(rooms);

  res.json(rooms[idx]);
}

function actualizarHuesped(req, res) {
  const { huesped, telefono, email } = req.body;
  const rooms = getRooms();
  const idx = rooms.findIndex(r => String(r.id) === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Habitación no encontrada' });
  }

  const room = rooms[idx];

  if (room.estado !== 'ocupada') {
    return res.status(400).json({ error: `Solo se pueden modificar datos de habitaciones ocupadas. Estado actual: ${room.estado}` });
  }

  if (huesped !== undefined) rooms[idx].huesped = huesped.trim();
  if (telefono !== undefined) rooms[idx].telefono = telefono.trim() || null;
  if (email !== undefined) rooms[idx].email = email.trim() || null;

  saveRooms(rooms);
  res.json(rooms[idx]);
}

function actualizarEstado(req, res) {
  const { estado } = req.body;
  const VALID_ESTADOS = ['disponible', 'reservada', 'limpieza', 'mantenimiento'];

  if (!VALID_ESTADOS.includes(estado)) {
    return res.status(400).json({ error: `Estado inválido. Debe ser: ${VALID_ESTADOS.join(', ')}` });
  }

  const rooms = getRooms();
  const idx = rooms.findIndex(r => String(r.id) === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Habitación no encontrada' });
  }

  const room = rooms[idx];

  if (room.estado === 'ocupada') {
    return res.status(400).json({ error: 'No se puede cambiar el estado de una habitación ocupada. Realiza check-out primero.' });
  }

  const ALLOWED_TRANSITIONS = {
    disponible: ['reservada', 'limpieza', 'mantenimiento'],
    reservada: ['disponible', 'limpieza', 'mantenimiento'],
    limpieza: ['disponible', 'mantenimiento'],
    mantenimiento: ['disponible', 'limpieza'],
  };

  if (!ALLOWED_TRANSITIONS[room.estado]?.includes(estado)) {
    return res.status(400).json({ error: `No se puede cambiar de "${room.estado}" a "${estado}"` });
  }

  const updates = { estado };

  if (estado === 'disponible') {
    updates.huesped = null;
    updates.pin = null;
    updates.checkIn = null;
    updates.checkOut = null;
    updates.noches = null;
    updates.telefono = null;
    updates.email = null;
  }

  rooms[idx] = { ...room, ...updates };
  saveRooms(rooms);

  res.json(rooms[idx]);
}

function validarPin(req, res) {
  const { numero, pin } = req.body;
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  const attempt = pinAttempts.get(ip);
  if (attempt && now - attempt.lastReset < PIN_WINDOW_MS) {
    if (attempt.count >= PIN_MAX_ATTEMPTS) {
      const remaining = Math.ceil((PIN_WINDOW_MS - (now - attempt.lastReset)) / 1000);
      return res.status(429).json({ error: `Demasiados intentos. Espera ${remaining} segundos.` });
    }
    attempt.count++;
  } else {
    pinAttempts.set(ip, { count: 1, lastReset: now });
  }

  const rooms = getRooms();
  const room = rooms.find(r => String(r.numero) === String(numero) && r.pin === pin && r.estado === 'ocupada');

  if (!room) {
    return res.status(404).json({ error: 'Habitación o PIN incorrecto' });
  }

  pinAttempts.delete(ip);

  res.json(room);
}

function checkout(req, res) {
  const { metodoPago, valorRecibido } = req.body;
  const rooms = getRooms();
  const consumos = getConsumos();
  const idx = rooms.findIndex(r => String(r.id) === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Habitación no encontrada' });
  }

  const room = rooms[idx];

  if (room.estado !== 'ocupada') {
    return res.status(400).json({ error: `Solo se puede hacer checkout de habitaciones ocupadas. Estado actual: ${room.estado}` });
  }

  const prices = getPrices();
  const tarifas = prices?.tarifas || {};
  const consumosHab = consumos.filter(c => String(c.roomId) === String(room.id));
  const totals = calcularCheckout({
    roomTipo: room.tipo,
    checkIn: room.checkIn,
    consumos: consumosHab,
    tarifas,
  });

  const recibido = parseFloat(valorRecibido) || 0;

  const fmt = (n) => n.toLocaleString('es-CO');
  if (metodoPago === 'efectivo' && recibido < totals.total) {
    return res.status(400).json({
      error: `Monto insuficiente. Total: $${fmt(totals.total)}, recibido: $${fmt(recibido)}. Falta $${fmt(totals.total - recibido)}`,
    });
  }

  const cambio = metodoPago === 'efectivo' ? recibido - totals.total : 0;

  rooms[idx] = {
    ...room,
    huesped: null,
    pin: null,
    checkIn: null,
    checkOut: null,
    noches: null,
    estado: 'limpieza',
    checkOutAt: new Date().toISOString(),
    pago: {
      metodoPago,
      valorRecibido: recibido,
      total: totals.total,
      subtotal: totals.subtotal,
      iva: totals.iva,
      cargoHabitacion: totals.cargoHabitacion,
      totalConsumos: totals.totalConsumos,
      noches: totals.noches,
      tarifaNoche: totals.tarifaNoche,
      cambio,
    },
  };
  saveRooms(rooms);

  saveConsumos(consumos.filter(c => String(c.roomId) !== String(room.id)));

  const factura = {
    numero: room.numero,
    huesped: room.huesped,
    telefono: room.telefono,
    email: room.email,
    tipo: room.tipo,
    checkIn: room.checkIn,
    checkOutAt: rooms[idx].checkOutAt,
    noches: totals.noches,
    tarifaNoche: totals.tarifaNoche,
    cargoHabitacion: totals.cargoHabitacion,
    consumos: consumosHab,
    totalConsumos: totals.totalConsumos,
    subtotal: totals.subtotal,
    iva: totals.iva,
    total: totals.total,
    metodoPago,
    valorRecibido: recibido,
    cambio,
    fecha: rooms[idx].checkOutAt,
  };

  res.json({
    room: rooms[idx],
    factura,
  });
}

function cancelarReserva(req, res) {
  const rooms = getRooms();
  const idx = rooms.findIndex(r => String(r.id) === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Habitación no encontrada' });
  }

  const room = rooms[idx];

  if (room.estado !== 'reservada') {
    return res.status(400).json({ error: `Solo se pueden cancelar reservas. Estado actual: ${room.estado}` });
  }

  rooms[idx] = {
    ...room,
    huesped: null,
    pin: null,
    checkIn: null,
    checkOut: null,
    noches: null,
    estado: 'disponible',
  };
  saveRooms(rooms);

  res.json({ message: 'Reserva cancelada', room: rooms[idx] });
}

module.exports = {
  getAllRooms,
  getRoomStats,
  getReservaciones,
  checkIn,
  reservar,
  actualizarHuesped,
  actualizarEstado,
  validarPin,
  checkout,
  cancelarReserva,
};
