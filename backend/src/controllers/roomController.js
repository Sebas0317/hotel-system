'use strict';

/**
 * Room controllers - handles all room-related business logic
 * Async operations with non-blocking I/O
 */
const {
  getRooms,
  saveRooms,
  getConsumos,
  saveConsumos,
  getStateHistory,
  saveStateHistory,
} = require('../data/jsonStore');
const { getPrices } = require('../data/priceStore');
const { generateId, generateReservationId } = require('../utils/idGenerator');
const { generateRoomToken } = require('../middleware/roomAccess');
const { generarPin } = require('../utils/pinGenerator');
const { calcularCheckout } = require('../utils/checkoutCalc');

const { broadcast } = require('../utils/websocket');
const persistence = require('../data/persistence');

const logger = require('../utils/logger');
const auditor = require('../utils/auditor');

const pinAttempts = new Map();
const PIN_MAX_ATTEMPTS = 5;
const PIN_WINDOW_MS = 60 * 1000;
const PIN_BACKOFF_MULTIPLIER = 2;
const PIN_MAX_BACKOFF_LEVEL = 10;
const PIN_MAX_MAP_SIZE = 10000;
const PIN_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const PIN_ABSOLUTE_MAX_AGE = 60 * 60 * 1000; // 1 hour

// Periodic cleanup of expired PIN attempt entries
const pinCleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, attempt] of pinAttempts.entries()) {
    const ageBasedCleanup =
      now - attempt.windowStart >
      PIN_WINDOW_MS * Math.min(attempt.backoffLevel, PIN_MAX_BACKOFF_LEVEL);
    const absoluteCleanup = now - attempt.windowStart > PIN_ABSOLUTE_MAX_AGE;
    if (ageBasedCleanup || absoluteCleanup) {
      pinAttempts.delete(key);
    }
  }
}, PIN_CLEANUP_INTERVAL);
if (pinCleanupTimer.unref) pinCleanupTimer.unref();

async function recordStateChange(
  room,
  estadoAnterior,
  estadoNuevo,
  consumos = []
) {
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
    // ── Complete reservation data for "ocupada" state ──
    reserva:
      estadoAnterior === 'ocupada' || estadoNuevo === 'ocupada'
        ? {
            checkIn: room.checkIn || null,
            checkOut: room.checkOut || null,
            noches: room.noches || 1,
            tarifa: room.tarifa || 0,
            documento: room.documento || '',
            email: room.email || '',
            telefono: room.telefono || '',
            adultos: room.adultos || 1,
            ninos: room.ninos || 0,
            tieneMascota: room.tieneMascota || false,
            nombreMascota: room.nombreMascota || '',
            pago: room.pago || null,
            consumos:
              consumos.length > 0
                ? consumos.map((c) => ({
                    descripcion: c.descripcion,
                    precio: c.precio,
                    categoria: c.categoria,
                  }))
                : undefined,
          }
        : null,
  };
  cambios.unshift(entry);
  await saveStateHistory(cambios);
}

async function solicitarCheckout(req, res) {
  try {
    const { checkOutDate } = req.body;
    const meta = auditor.reqMeta(req);
    const rooms = await getRooms();
    const idx = rooms.findIndex((r) => String(r.id) === req.params.id);

    if (idx === -1) {
      return res.status(404).json({ error: 'Habitación no encontrada' });
    }

    const room = rooms[idx];

    if (!req.roomAccess) {
      return res
        .status(401)
        .json({ error: 'Debes validar el acceso a la habitación primero' });
    }

    if (String(req.roomAccess.roomId) !== String(room.id)) {
      return res
        .status(403)
        .json({ error: 'No tienes acceso a esta habitación' });
    }

    if (!/^\d+$/.test(room.numero) || parseInt(room.numero, 10) <= 0) {
      return res.status(400).json({ error: 'Número de habitación inválido' });
    }

    if (room.estado !== 'ocupada') {
      return res.status(400).json({
        error: `Solo huéspedes ocupando pueden solicitar checkout. Estado actual: ${room.estado}`,
      });
    }

    rooms[idx] = {
      ...room,
      solicitudCheckout: {
        fecha: checkOutDate || new Date().toISOString().split('T')[0],
        hora: new Date().toISOString(),
      },
    };
    await saveRooms(rooms);
    broadcast('room:update', rooms[idx]);
    await auditor.checkoutRequested(meta.userId, meta.ip, room.numero);
    res.json({ success: true, room: rooms[idx] });
  } catch (err) {
    logger.error('Error requesting checkout', { error: err.message });
    res.status(500).json({ error: 'Error interno al solicitar checkout' });
  }
}

function stripPin(rooms) {
  return rooms.map((r) => {
    const { pin, ...rest } = r;
    return rest;
  });
}

function getAllRooms(req, res) {
  getRooms()
    .then((rooms) => {
      // Only expose PINs to admin/owner roles
      const userRole = req.user?.role;
      if (
        userRole === 'admin' ||
        userRole === 'owner' ||
        userRole === 'operator'
      ) {
        return res.json(rooms);
      }
      return res.json(stripPin(rooms));
    })
    .catch((err) => {
      logger.error('Error getting rooms', { error: err.message });
      res.status(500).json({ error: 'Error interno al obtener habitaciones' });
    });
}

function getRoomStats(_req, res) {
  getRooms()
    .then((rooms) => {
      // Single-pass stats computation (O(n) instead of 5 separate .filter() calls)
      const stats = {
        total: 0,
        disponibles: 0,
        reservadas: 0,
        ocupadas: 0,
        limpieza: 0,
        mantenimiento: 0,
      };
      for (const r of rooms) {
        stats.total++;
        const key =
          r.estado === 'disponible'
            ? 'disponibles'
            : r.estado === 'reservada'
              ? 'reservadas'
              : r.estado === 'ocupada'
                ? 'ocupadas'
                : r.estado === 'limpieza'
                  ? 'limpieza'
                  : r.estado === 'mantenimiento'
                    ? 'mantenimiento'
                    : r.estado === 'fuera_servicio'
                      ? 'fuera_servicio'
                      : null;
        if (key) stats[key]++;
      }
      res.json(stats);
    })
    .catch((err) => {
      logger.error('Error getting room stats', { error: err.message });
      res.status(500).json({ error: 'Error interno al obtener estadísticas' });
    });
}

function getReservaciones(_req, res) {
  getRooms()
    .then((rooms) => {
      const reservaciones = rooms
        .filter((r) => r.estado === 'reservada' || r.estado === 'ocupada')
        .map((r) => ({
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
        }))
        .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));
      res.json(reservaciones);
    })
    .catch((err) => {
      logger.error('Error getting reservaciones', { error: err.message });
      res.status(500).json({ error: 'Error interno al obtener reservaciones' });
    });
}

async function checkIn(req, res) {
  try {
    const { numero, huesped, tipo } = req.body;
    if (!/^\d+$/.test(numero) || parseInt(numero, 10) <= 0) {
      return res.status(400).json({ error: 'Número de habitación inválido' });
    }
    const meta = auditor.reqMeta(req);
    const rooms = await getRooms();
    const prices = await getPrices();
    const tarifas = prices?.tarifas || {};
    const idx = rooms.findIndex((r) => r.numero === numero);

    if (idx !== -1 && rooms[idx].estado === 'ocupada') {
      return res.status(400).json({ error: 'Habitación ya está ocupada' });
    }

    if (idx !== -1 && rooms[idx].estado === 'reservada') {
      const pin = generarPin();
      const now = new Date().toISOString();
      const tarifaCheckIn =
        tarifas[rooms[idx].tipo]?.precio || tarifas[tipo]?.precio || 200000;
      rooms[idx] = {
        ...rooms[idx],
        huesped,
        pin,
        estado: 'ocupada',
        checkIn: now,
        tarifa: tarifaCheckIn,
      };
      await saveRooms(rooms);
      await recordStateChange(rooms[idx], 'reservada', 'ocupada');
      broadcast('room:update', rooms[idx]);
      await auditor.checkIn(meta.userId, meta.ip, numero, huesped);
      return res.json(rooms[idx]);
    }

    const BLOCKED_STATES = ['limpieza', 'mantenimiento', 'fuera_servicio'];
    if (idx !== -1 && BLOCKED_STATES.includes(rooms[idx].estado)) {
      return res.status(400).json({
        error: `Habitación en estado "${rooms[idx].estado}". Primero cámbiala a disponible.`,
      });
    }

    const pin = generarPin();
    const now = new Date().toISOString();

    if (idx !== -1) {
      if (!rooms[idx].reservationId) {
        rooms[idx].reservationId = generateReservationId();
      }
      const roomTipo = tipo || rooms[idx].tipo;
      const tarifaCheckIn = tarifas[roomTipo]?.precio || 200000;
      const checkOutDate = new Date(now);
      checkOutDate.setDate(checkOutDate.getDate() + 1);
      rooms[idx] = {
        ...rooms[idx],
        huesped,
        tipo: roomTipo,
        pin,
        estado: 'ocupada',
        checkIn: now,
        checkOut: checkOutDate.toISOString(),
        noches: 1,
        tarifa: tarifaCheckIn,
        reservationId: rooms[idx].reservationId || generateReservationId(),
      };
      await saveRooms(rooms);
      await recordStateChange(rooms[idx], 'disponible', 'ocupada');
      broadcast('room:update', rooms[idx]);
      await auditor.checkIn(meta.userId, meta.ip, numero, huesped);
      return res.json(rooms[idx]);
    }

    const roomTipo = tipo || 'estándar';
    const tarifaCheckIn = tarifas[roomTipo]?.precio || 200000;
    const nueva = {
      id: generateId(),
      numero,
      huesped,
      tipo: roomTipo,
      camas: '1 cama doble',
      capacidad: 2,
      piso: 1,
      pin,
      estado: 'ocupada',
      checkIn: now,
      tarifa: tarifaCheckIn,
      reservationId: generateReservationId(),
    };
    rooms.push(nueva);
    await saveRooms(rooms);
    await recordStateChange(nueva, 'nueva', 'ocupada');
    broadcast('room:update', nueva);
    await auditor.checkIn(meta.userId, meta.ip, numero, huesped);
    res.json(nueva);
  } catch (err) {
    logger.error('Error checking in', { error: err.message });
    res.status(500).json({ error: 'Error interno al hacer check-in' });
  }
}

async function reservar(req, res) {
  try {
    const { huesped, telefono, email, noches } = req.body;
    if (!/^\d+$/.test(req.params.id) || parseInt(req.params.id, 10) <= 0) {
      return res.status(400).json({ error: 'ID de habitación inválido' });
    }
    const meta = auditor.reqMeta(req);
    const rooms = await getRooms();
    const idx = rooms.findIndex((r) => String(r.id) === req.params.id);

    if (idx === -1) {
      return res.status(404).json({ error: 'Habitación no encontrada' });
    }

    const room = rooms[idx];
    const numero = room.numero;

    const OPERATIONAL_STATES = ['limpieza', 'mantenimiento'];
    if (room.estado !== 'disponible') {
      if (OPERATIONAL_STATES.includes(room.estado)) {
        const labels = {
          limpieza: 'En limpieza',
          mantenimiento: 'En mantenimiento',
        };
        return res.status(400).json({
          error: `Habitación ${labels[room.estado]}. No se puede reservar.`,
        });
      }
      return res.status(400).json({
        error: `Solo se pueden reservar habitaciones disponibles. Estado actual: ${room.estado}`,
      });
    }

    const nochesValidas = parseInt(noches, 10) || 1;
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

    broadcast('room:update', rooms[idx]);
    await auditor.reserve(meta.userId, meta.ip, numero, huesped);
    res.json(rooms[idx]);
  } catch (err) {
    logger.error('Error reserving room', { error: err.message });
    res.status(500).json({ error: 'Error interno al reservar' });
  }
}

async function actualizarHuesped(req, res) {
  try {
    const { huesped, telefono, email } = req.body;
    const rooms = await getRooms();
    const idx = rooms.findIndex((r) => String(r.id) === req.params.id);

    if (idx === -1) {
      return res.status(404).json({ error: 'Habitación no encontrada' });
    }

    const room = rooms[idx];

    if (!/^\d+$/.test(room.numero) || parseInt(room.numero, 10) <= 0) {
      return res.status(400).json({ error: 'Número de habitación inválido' });
    }

    if (room.estado !== 'ocupada') {
      return res.status(400).json({
        error: `Solo se pueden modificar datos de habitaciones ocupadas. Estado actual: ${room.estado}`,
      });
    }

    if (huesped !== undefined) rooms[idx].huesped = huesped.trim() || null;
    if (telefono !== undefined) rooms[idx].telefono = telefono.trim() || null;
    if (email !== undefined) rooms[idx].email = email.trim() || null;

    await saveRooms(rooms);
    broadcast('room:update', rooms[idx]);
    res.json(rooms[idx]);
  } catch (err) {
    logger.error('Error updating guest', { error: err.message });
    res.status(500).json({ error: 'Error interno al actualizar huésped' });
  }
}

async function actualizarEstado(req, res) {
  try {
    const { estado } = req.body;
    const meta = auditor.reqMeta(req);
    const VALID_ESTADOS = [
      'disponible',
      'reservada',
      'limpieza',
      'mantenimiento',
      'fuera_servicio',
    ];

    if (!/^\d+$/.test(req.params.id) || parseInt(req.params.id, 10) <= 0) {
      return res.status(400).json({ error: 'ID de habitación inválido' });
    }

    if (!VALID_ESTADOS.includes(estado)) {
      return res.status(400).json({
        error: `Estado inválido. Debe ser: ${VALID_ESTADOS.join(', ')}`,
      });
    }

    const rooms = await getRooms();
    const idx = rooms.findIndex((r) => String(r.id) === req.params.id);

    if (idx === -1) {
      return res.status(404).json({ error: 'Habitación no encontrada' });
    }

    const room = rooms[idx];

    if (!/^\d+$/.test(room.numero) || parseInt(room.numero, 10) <= 0) {
      return res.status(400).json({ error: 'Número de habitación inválido' });
    }

    const ALLOWED_TRANSITIONS = {
      disponible: ['reservada', 'limpieza', 'mantenimiento', 'fuera_servicio'],
      reservada: ['disponible', 'limpieza', 'mantenimiento', 'fuera_servicio'],
      limpieza: ['disponible', 'mantenimiento', 'fuera_servicio'],
      mantenimiento: ['disponible', 'limpieza', 'fuera_servicio'],
      fuera_servicio: ['disponible', 'limpieza', 'mantenimiento'],
    };

    if (!ALLOWED_TRANSITIONS[room.estado]?.includes(estado)) {
      return res.status(400).json({
        error: `No se puede cambiar de "${room.estado}" a "${estado}"`,
      });
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

    broadcast('room:update', rooms[idx]);
    await auditor.roomStatusChanged(
      meta.userId,
      meta.ip,
      room.numero,
      room.estado,
      estado
    );
    res.json(rooms[idx]);
  } catch (err) {
    logger.error('Error updating room status', { error: err.message });
    res.status(500).json({ error: 'Error interno al actualizar estado' });
  }
}

async function validarPin(req, res) {
  try {
    const { numero, pin } = req.body;
    if (!/^\d+$/.test(numero) || parseInt(numero, 10) <= 0) {
      return res.status(400).json({ error: 'Número de habitación inválido' });
    }
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const key = `${ip}:${numero}`;

    const attempt = pinAttempts.get(key);
    const effectiveWindow =
      PIN_WINDOW_MS *
      (attempt ? PIN_BACKOFF_MULTIPLIER ** (attempt.backoffLevel - 1) : 1);

    if (attempt && now - attempt.windowStart < effectiveWindow) {
      if (attempt.count >= PIN_MAX_ATTEMPTS) {
        if (attempt.backoffLevel < PIN_MAX_BACKOFF_LEVEL)
          attempt.backoffLevel++;
        attempt.count = 0;
        attempt.windowStart = now;
        const waitSec =
          Math.ceil(effectiveWindow / 1000) * PIN_BACKOFF_MULTIPLIER;
        return res
          .status(429)
          .json({ error: `Demasiados intentos. Espera ${waitSec} segundos.` });
      }
      attempt.count++;
    } else {
      // Evict oldest entry if map exceeds max size to prevent OOM
      if (pinAttempts.size >= PIN_MAX_MAP_SIZE) {
        const oldest = pinAttempts.entries().next().value;
        if (oldest) pinAttempts.delete(oldest[0]);
      }
      pinAttempts.set(key, { count: 1, windowStart: now, backoffLevel: 1 });
    }

    const rooms = await getRooms();
    const room = rooms.find(
      (r) =>
        String(r.numero) === String(numero) &&
        r.pin === pin &&
        r.estado === 'ocupada'
    );

    if (!room) {
      return res.status(401).json({ error: 'Habitación o PIN incorrecto' });
    }

    // Reset on success (legitimate guest)
    pinAttempts.delete(key);

    const roomToken = generateRoomToken(room.id, room.numero);

    // Strip PIN from response to prevent leaking it after successful validation
    const { pin: _pin, ...safeRoom } = room;
    res.json({ room: safeRoom, roomToken });
  } catch (err) {
    logger.error('Error validating PIN', { error: err.message });
    res.status(500).json({ error: 'Error interno al validar PIN' });
  }
}

async function checkout(req, res) {
  try {
    const { metodoPago, valorRecibido } = req.body;
    if (!/^\d+$/.test(req.params.id) || parseInt(req.params.id, 10) <= 0) {
      return res.status(400).json({ error: 'ID de habitación inválido' });
    }
    const meta = auditor.reqMeta(req);
    const rooms = await getRooms();
    const consumos = await getConsumos();
    const idx = rooms.findIndex((r) => String(r.id) === req.params.id);

    if (idx === -1) {
      return res.status(404).json({ error: 'Habitación no encontrada' });
    }

    const room = rooms[idx];

    if (!/^\d+$/.test(room.numero) || parseInt(room.numero, 10) <= 0) {
      return res.status(400).json({ error: 'Número de habitación inválido' });
    }

    if (room.estado !== 'ocupada') {
      return res.status(400).json({
        error: `Solo se puede hacer checkout de habitaciones ocupadas. Estado actual: ${room.estado}`,
      });
    }

    const prices = await getPrices();
    const tarifas = prices?.tarifas || {};
    const consumosHab = consumos.filter(
      (c) => String(c.roomId) === String(room.id)
    );
    const totals = calcularCheckout({
      roomTipo: room.tipo,
      checkIn: room.checkIn,
      checkOut: room.checkOut,
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
      documento: null,
      email: null,
      telefono: null,
      observaciones: null,
      adultos: null,
      ninos: null,
      tieneMascota: false,
      nombreMascota: '',
      personasAdicionales: [],
      mascotas: false,
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

    // Preserve consumos for historical records — mark as archived instead of deleting
    const updatedConsumos = consumos.map((c) =>
      String(c.roomId) === String(room.id)
        ? { ...c, archivedAt: new Date().toISOString(), archived: true }
        : c
    );
    await saveConsumos(updatedConsumos);

    await recordStateChange(room, 'ocupada', 'limpieza', consumosHab);
    broadcast('room:update', rooms[idx]);
    await auditor.checkout(
      meta.userId,
      meta.ip,
      room.numero,
      room.huesped,
      totals.total
    );

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
    logger.error('Error during checkout', { error: err.message });
    res.status(500).json({ error: 'Error interno al hacer checkout' });
  }
}

async function cancelarReserva(req, res) {
  try {
    if (!/^\d+$/.test(req.params.id) || parseInt(req.params.id, 10) <= 0) {
      return res.status(400).json({ error: 'ID de habitación inválido' });
    }
    const meta = auditor.reqMeta(req);
    const rooms = await getRooms();
    const idx = rooms.findIndex((r) => String(r.id) === req.params.id);

    if (idx === -1) {
      return res.status(404).json({ error: 'Habitación no encontrada' });
    }

    const room = rooms[idx];

    if (!/^\d+$/.test(room.numero) || parseInt(room.numero, 10) <= 0) {
      return res.status(400).json({ error: 'Número de habitación inválido' });
    }

    if (room.estado !== 'reservada') {
      return res.status(400).json({
        error: `Solo se pueden cancelar reservas. Estado actual: ${room.estado}`,
      });
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

    // Sync: cancel matching reservations in reservas.json
    try {
      const reservas = await persistence.getReservas();
      let updated = false;
      for (let i = 0; i < reservas.length; i++) {
        if (
          String(reservas[i].roomId) === String(room.id) &&
          reservas[i].estado === 'reservada'
        ) {
          reservas[i].estado = 'cancelada';
          reservas[i].canceledAt = new Date().toISOString();
          updated = true;
        }
      }
      if (updated) {
        await persistence.setReservas(reservas);
      }
    } catch (syncErr) {
      logger.warn(
        { err: syncErr },
        'Failed to sync reservas.json on room cancellation'
      );
    }

    broadcast('room:update', rooms[idx]);
    await auditor.cancelReservation(meta.userId, meta.ip, room.numero);

    res.json({ message: 'Reserva cancelada', room: rooms[idx] });
  } catch (err) {
    logger.error('Error canceling reservation', { error: err.message });
    res.status(500).json({ error: 'Error interno al cancelar reserva' });
  }
}

function cleanupPinCleanup() {
  clearInterval(pinCleanupTimer);
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
  cleanupPinCleanup,
};
