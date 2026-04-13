'use strict';

/**
 * Room controllers - handles all room-related business logic
 * Async operations with non-blocking I/O
 */
const { getRooms, saveRooms, getConsumos, saveConsumos, getHistory, saveHistory, getStateHistory, saveStateHistory } = require('../data/jsonStore');
const { getPrices } = require('../data/priceStore');
const { generateId, generateReservationId } = require('../utils/idGenerator');
const { generarPin } = require('../utils/pinGenerator');
const { calcularCheckout } = require('../utils/checkoutCalc');

const pinAttempts = new Map();
const PIN_MAX_ATTEMPTS = 5;
const PIN_WINDOW_MS = 60 * 1000;
const PIN_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Periodic cleanup of expired PIN attempt entries
setInterval(() => {
  const now = Date.now();
  for (const [ip, attempt] of pinAttempts.entries()) {
    if (now - attempt.lastReset > PIN_WINDOW_MS) {
      pinAttempts.delete(ip);
    }
  }
}, PIN_CLEANUP_INTERVAL);

async function recordStateChange(room, estadoAnterior, estadoNuevo) {
  const cambios = await getStateHistory();
  const entry = {
    id: generateId(),
    roomId: room.id,
    numero: room.numero,
    reservationId: room.reservationId || null,
    estadoAnterior,
    estadoNuevo,
    huesped: room.huesped || '',
    timestamp: new Date().toISOString(),
  };
  cambios.unshift(entry);
  await saveStateHistory(cambios);

  // Also save to history.json
  const historyData = await getHistory();
  const history = Array.isArray(historyData) ? historyData : (historyData.reservas || []);
  const historyEntry = {
    id: generateId(),
    reservationId: room.reservationId || null,
    tipo: 'cambio_estado',
    roomId: room.id,
    numero: room.numero,
    huesped: room.huesped || '',
    email: room.email || '',
    telefono: room.telefono || '',
    documento: room.documento || '',
    adultos: room.adultos || 1,
    ninos: room.ninos || 0,
    tieneMascota: room.tieneMascota || false,
    nombreMascota: room.nombreMascota || '',
    estadoAnterior,
    estadoNuevo,
    estado: estadoNuevo,
    createdAt: new Date().toISOString(),
    checkIn: room.checkIn || null,
    checkOut: room.checkOut || null,
    noches: room.noches || 1,
    tarifa: room.tarifa || 0,
  };
  history.unshift(historyEntry);

  // Check if original format was object with reservas array
  const originalHistory = await getHistory();
  if (originalHistory && originalHistory.reservas) {
    await saveHistory({ reservas: history });
  } else {
    await saveHistory(history);
  }
}

async function solicitarCheckout(req, res) {
  try {
    const { checkOutDate } = req.body;
    const rooms = await getRooms();
    const idx = rooms.findIndex(r => String(r.id) === req.params.id);

    if (idx === -1) {
      return res.status(404).json({ error: 'Habitación no encontrada' });
    }

    const room = rooms[idx];

    if (room.estado !== 'ocupada') {
      return res.status(400).json({ error: `Solo huéspedes ocupando pueden solicitar checkout. Estado actual: ${room.estado}` });
    }

    rooms[idx] = {
      ...room,
      solicitudCheckout: {
        fecha: checkOutDate || new Date().toISOString().split('T')[0],
        hora: new Date().toISOString(),
      },
    };
    await saveRooms(rooms);

    res.json({ success: true, room: rooms[idx] });
  } catch (err) {
    res.status(500).json({ error: 'Error interno al solicitar checkout' });
  }
}

function getAllRooms(_req, res) {
  getRooms()
    .then(rooms => res.json(rooms))
    .catch(err => {
      require('../utils/logger').error('Error getting rooms', { error: err.message });
      res.status(500).json({ error: 'Error interno al obtener habitaciones' });
    });
}

function getRoomStats(_req, res) {
  getRooms()
    .then(rooms => {
      // Single-pass stats computation (O(n) instead of 5 separate .filter() calls)
      const stats = { total: 0, disponibles: 0, reservadas: 0, ocupadas: 0, limpieza: 0, mantenimiento: 0 };
      for (const r of rooms) {
        stats.total++;
        const key = r.estado === 'disponible' ? 'disponibles'
          : r.estado === 'reservada' ? 'reservadas'
          : r.estado === 'ocupada' ? 'ocupadas'
          : r.estado === 'limpieza' ? 'limpieza'
          : r.estado === 'mantenimiento' ? 'mantenimiento'
          : null;
        if (key) stats[key]++;
      }
      res.json(stats);
    })
    .catch(err => {
      require('../utils/logger').error('Error getting room stats', { error: err.message });
      res.status(500).json({ error: 'Error interno al obtener estadísticas' });
    });
}

function getReservaciones(_req, res) {
  getRooms()
    .then(rooms => {
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
    })
    .catch(err => {
      require('../utils/logger').error('Error getting reservaciones', { error: err.message });
      res.status(500).json({ error: 'Error interno al obtener reservaciones' });
    });
}

async function checkIn(req, res) {
  try {
    const { numero, huesped, tipo } = req.body;
    const rooms = await getRooms();
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
      await saveRooms(rooms);
      await recordStateChange(rooms[idx], 'reservada', 'ocupada');
      return res.json(rooms[idx]);
    }

    const BLOCKED_STATES = ['limpieza', 'mantenimiento'];
    if (idx !== -1 && BLOCKED_STATES.includes(rooms[idx].estado)) {
      return res.status(400).json({ error: `Habitación en estado "${rooms[idx].estado}". Primero cámbiala a disponible.` });
    }

    const pin = generarPin();
    const now = new Date().toISOString();

    if (idx !== -1) {
      if (!rooms[idx].reservationId) {
        rooms[idx].reservationId = generateReservationId();
      }
      rooms[idx] = {
        ...rooms[idx],
        huesped,
        tipo: tipo || rooms[idx].tipo,
        pin,
        estado: 'ocupada',
        checkIn: now,
      };
      await saveRooms(rooms);
      await recordStateChange(rooms[idx], 'disponible', 'ocupada');
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
      reservationId: generateReservationId(),
    };
    rooms.push(nueva);
    await saveRooms(rooms);
    await recordStateChange(nueva, 'nueva', 'ocupada');
    res.json(nueva);
  } catch (err) {
    require('../utils/logger').error('Error checking in', { error: err.message });
    res.status(500).json({ error: 'Error interno al hacer check-in' });
  }
}

async function reservar(req, res) {
  try {
    const { huesped, telefono, email, noches } = req.body;

    const rooms = await getRooms();
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
      reservationId: generateReservationId(),
    };
    await saveRooms(rooms);

    await recordStateChange(rooms[idx], 'disponible', 'reservada');

    res.json(rooms[idx]);
  } catch (err) {
    require('../utils/logger').error('Error reserving room', { error: err.message });
    res.status(500).json({ error: 'Error interno al reservar' });
  }
}

async function actualizarHuesped(req, res) {
  try {
    const { huesped, telefono, email } = req.body;
    const rooms = await getRooms();
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

    await saveRooms(rooms);
    res.json(rooms[idx]);
  } catch (err) {
    require('../utils/logger').error('Error updating guest', { error: err.message });
    res.status(500).json({ error: 'Error interno al actualizar huésped' });
  }
}

async function actualizarEstado(req, res) {
  try {
    const { estado } = req.body;
    const VALID_ESTADOS = ['disponible', 'reservada', 'limpieza', 'mantenimiento', 'fuera_servicio'];

    if (!VALID_ESTADOS.includes(estado)) {
      return res.status(400).json({ error: `Estado inválido. Debe ser: ${VALID_ESTADOS.join(', ')}` });
    }

    const rooms = await getRooms();
    const idx = rooms.findIndex(r => String(r.id) === req.params.id);

    if (idx === -1) {
      return res.status(404).json({ error: 'Habitación no encontrada' });
    }

    const room = rooms[idx];

    if (room.estado === 'ocupada') {
      return res.status(400).json({ error: 'No se puede cambiar el estado de una habitación ocupada. Realiza check-out primero.' });
    }

    const ALLOWED_TRANSITIONS = {
      disponible: ['reservada', 'limpieza', 'mantenimiento', 'fuera_servicio'],
      reservada: ['disponible', 'limpieza', 'mantenimiento', 'fuera_servicio'],
      limpieza: ['disponible', 'mantenimiento', 'fuera_servicio'],
      mantenimiento: ['disponible', 'limpieza', 'fuera_servicio'],
      fuera_servicio: ['disponible', 'limpieza', 'mantenimiento'],
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
      updates.reservationId = null;
    }

    rooms[idx] = { ...room, ...updates };
    await saveRooms(rooms);

    if (room.estado !== estado) {
      await recordStateChange(rooms[idx], room.estado, estado);
    }

    res.json(rooms[idx]);
  } catch (err) {
    require('../utils/logger').error('Error updating room status', { error: err.message });
    res.status(500).json({ error: 'Error interno al actualizar estado' });
  }
}

async function validarPin(req, res) {
  try {
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

    const rooms = await getRooms();
    const room = rooms.find(r => String(r.numero) === String(numero) && r.pin === pin && r.estado === 'ocupada');

    if (!room) {
      return res.status(404).json({ error: 'Habitación o PIN incorrecto' });
    }

    pinAttempts.delete(ip);

    res.json(room);
  } catch (err) {
    require('../utils/logger').error('Error validating PIN', { error: err.message });
    res.status(500).json({ error: 'Error interno al validar PIN' });
  }
}

async function checkout(req, res) {
  try {
    const { metodoPago, valorRecibido } = req.body;
    const rooms = await getRooms();
    const consumos = await getConsumos();
    const idx = rooms.findIndex(r => String(r.id) === req.params.id);

    if (idx === -1) {
      return res.status(404).json({ error: 'Habitación no encontrada' });
    }

    const room = rooms[idx];

    if (room.estado !== 'ocupada') {
      return res.status(400).json({ error: `Solo se puede hacer checkout de habitaciones ocupadas. Estado actual: ${room.estado}` });
    }

    const prices = await getPrices();
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
    await saveRooms(rooms);

    await saveConsumos(consumos.filter(c => String(c.roomId) !== String(room.id)));

    await recordStateChange(rooms[idx], 'ocupada', 'limpieza');

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
  } catch (err) {
    require('../utils/logger').error('Error during checkout', { error: err.message });
    res.status(500).json({ error: 'Error interno al hacer checkout' });
  }
}

async function cancelarReserva(req, res) {
  try {
    const rooms = await getRooms();
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
    await saveRooms(rooms);

    res.json({ message: 'Reserva cancelada', room: rooms[idx] });
  } catch (err) {
    require('../utils/logger').error('Error canceling reservation', { error: err.message });
    res.status(500).json({ error: 'Error interno al cancelar reserva' });
  }
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
  solicitarCheckout,
  cancelarReserva,
};
