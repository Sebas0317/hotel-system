'use strict';

const { generateId } = require('../utils/idGenerator');
const { logger } = require('../utils/logger');
const persistence = require('../data/persistence');
const { getRooms, saveRooms } = require('../data/jsonStore');
const { generarPin } = require('../utils/pinGenerator');
const { broadcast } = require('../utils/websocket');

async function getReservas() {
  return persistence.getReservas();
}

async function saveReservas(reservas) {
  return persistence.setReservas(reservas);
}

/**
 * Advances expired reservations through their lifecycle:
 * - reservada + checkIn pasado → no_show
 * - checkin + checkOut pasado → completada
 */
async function reconcileLifecycle() {
  const reservas = await getReservas();
  const now = new Date();
  let changed = false;

  for (const r of reservas) {
    if (r.estado === 'reservada' && new Date(r.checkIn) < now) {
      r.estado = 'no_show';
      changed = true;
    } else if (r.estado === 'checkin' && new Date(r.checkOut) < now) {
      r.estado = 'completada';
      changed = true;
    }
  }

  if (changed) {
    await saveReservas(reservas);
    logger.info('Reservation lifecycle reconciled');
  }
  return changed;
}

/**
 * Synchronizes room states with active reservations:
 * - Rooms with active check-in → ocupada
 * - Rooms with upcoming reservation and no active check-in → reservada
 * - Rooms with no reservations and not explicitly set → disponible
 * Skips rooms in mantenimiento/fuera_servicio.
 */
async function syncRoomStates() {
  const reservas = await getReservas();
  const rooms = await getRooms();
  const now = new Date();
  let changed = false;

  const nowDateOnly = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  for (const room of rooms) {
    if (room.estado === 'mantenimiento' || room.estado === 'fuera_servicio')
      continue;

    const roomReservas = reservas.filter(
      (r) =>
        String(r.roomId) === String(room.id) ||
        String(r.numeroHabitacion) === String(room.numero)
    );

    const hasActiveCheckin = roomReservas.some((r) => {
      if (r.estado !== 'checkin') return false;
      const checkIn = new Date(r.checkIn);
      const checkOut = new Date(r.checkOut);
      return checkIn <= now && now < checkOut;
    });

    const hasUpcoming = roomReservas.some((r) => {
      if (r.estado !== 'reservada') return false;
      const checkIn = new Date(r.checkIn);
      return checkIn >= nowDateOnly;
    });

    const hasPastNoShow = roomReservas.some(
      (r) => r.estado === 'no_show' && new Date(r.checkIn) < now
    );

    if (hasActiveCheckin) {
      if (room.estado !== 'ocupada') {
        room.estado = 'ocupada';
        changed = true;
      }
    } else if (hasUpcoming) {
      if (room.estado !== 'reservada' && room.estado !== 'ocupada') {
        room.estado = 'reservada';
        changed = true;
      }
    } else if (!hasPastNoShow) {
      const anyActiveReserva = roomReservas.some(
        (r) =>
          r.estado !== 'cancelada' &&
          r.estado !== 'completada' &&
          r.estado !== 'no_show'
      );
      if (!anyActiveReserva && room.estado !== 'disponible') {
        room.estado = 'disponible';
        changed = true;
      }
    }
  }

  if (changed) {
    await saveRooms(rooms);
    logger.info('Room states synchronized with reservations');
  }
  return changed;
}

const reservasController = {
  async getAll(req, res) {
    try {
      const reservas = await getReservas();

      if (req.query.page || req.query.limit) {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(
          100,
          Math.max(1, parseInt(req.query.limit, 10) || 50)
        );
        const total = reservas.length;
        const totalPages = Math.ceil(total / limit);
        const start = (page - 1) * limit;
        const data = reservas.slice(start, start + limit);
        return res.json({
          data,
          pagination: { page, limit, total, totalPages },
        });
      }

      res.json(reservas);
    } catch (e) {
      logger.error({ err: e }, 'Error getting reservas');
      res.status(500).json({ error: e.message });
    }
  },

  async getByRoom(req, res) {
    try {
      const { roomId } = req.params;
      const reservas = await getReservas();
      const roomReservas = reservas.filter((r) => r.roomId === roomId);
      res.json(roomReservas);
    } catch (e) {
      logger.error(
        { err: e, roomId: req.params.roomId },
        'Error getting reservas by room'
      );
      res.status(500).json({ error: e.message });
    }
  },

  async getByDateRange(req, res) {
    try {
      const { start, end } = req.query;
      const reservas = await getReservas();

      if (!start || !end) {
        return res.status(400).json({ error: 'Start and end dates required' });
      }

      const startDate = new Date(start);
      const endDate = new Date(end);

      const filtered = reservas.filter((r) => {
        const checkIn = new Date(`${r.checkIn.split('T')[0]}T00:00:00.000Z`);
        const checkOut = new Date(`${r.checkOut.split('T')[0]}T00:00:00.000Z`);
        return checkIn <= endDate && checkOut >= startDate;
      });

      res.json(filtered);
    } catch (e) {
      logger.error({ err: e }, 'Error getting reservas by date range');
      res.status(500).json({ error: e.message });
    }
  },

  async create(req, res) {
    try {
      const {
        roomId,
        huesped,
        documento,
        telefono,
        email,
        checkIn,
        checkOut,
        personas,
        observaciones,
        tipoHabitacion,
        numeroHabitacion,
      } = req.body;

      if (!roomId || !huesped || !checkIn || !checkOut) {
        return res.status(400).json({
          error:
            'Datos incompletos: roomId, huesped, checkIn, checkOut requeridos',
        });
      }

      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      if (checkInDate >= checkOutDate) {
        return res.status(400).json({
          error: 'La fecha de check-in debe ser anterior al check-out',
        });
      }

      const reservas = await getReservas();

      const hasConflict = reservas.some((r) => {
        if (r.roomId !== roomId) return false;
        if (r.estado === 'cancelada') return false;

        const rCheckIn = new Date(r.checkIn);
        const rCheckOut = new Date(r.checkOut);
        return checkInDate < rCheckOut && checkOutDate > rCheckIn;
      });

      if (hasConflict) {
        return res
          .status(400)
          .json({ error: 'La habitación ya tiene reservas en esas fechas' });
      }

      const reserva = {
        id: generateId(),
        roomId,
        numeroHabitacion: numeroHabitacion || '',
        huesped,
        documento: documento || '',
        telefono: telefono || '',
        email: email || '',
        checkIn,
        checkOut,
        noches: Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)),
        personas: personas || 2,
        observaciones: observaciones || '',
        tipoHabitacion: tipoHabitacion || '',
        estado: 'reservada',
        createdAt: new Date().toISOString(),
      };

      reservas.push(reserva);
      await saveReservas(reservas);

      // Sync room estado to reservada — rollback reserva if sync fails
      try {
        const rooms = await getRooms();
        const roomIdx = rooms.findIndex((r) => String(r.id) === roomId);
        if (roomIdx !== -1 && rooms[roomIdx].estado === 'disponible') {
          rooms[roomIdx].estado = 'reservada';
          await saveRooms(rooms);
        }
      } catch (syncErr) {
        logger.warn(
          { err: syncErr },
          'Failed to sync room estado on reservation create'
        );
        // Rollback: remove the reservation that was just saved
        const rollbackReservas = await getReservas();
        const rbIdx = rollbackReservas.findIndex((r) => r.id === reserva.id);
        if (rbIdx !== -1) {
          rollbackReservas.splice(rbIdx, 1);
          await saveReservas(rollbackReservas);
        }
        return res.status(500).json({
          error: 'Error al sincronizar habitacion. Reserva revertida.',
        });
      }

      broadcast('reserva:create', reserva);
      res.status(201).json(reserva);
    } catch (e) {
      logger.error({ err: e }, 'Error creating reserva');
      res.status(500).json({ error: e.message });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const reservas = await getReservas();

      const idx = reservas.findIndex((r) => r.id === id);
      if (idx === -1) {
        return res.status(404).json({ error: 'Reserva no encontrada' });
      }

      const checkInDate = new Date(updates.checkIn || reservas[idx].checkIn);
      const checkOutDate = new Date(updates.checkOut || reservas[idx].checkOut);
      const roomId = updates.roomId || reservas[idx].roomId;

      const hasConflict = reservas.some((r) => {
        if (r.id === id) return false;
        if (r.roomId !== roomId) return false;
        if (r.estado === 'cancelada') return false;

        const rCheckIn = new Date(r.checkIn);
        const rCheckOut = new Date(r.checkOut);
        return checkInDate < rCheckOut && checkOutDate > rCheckIn;
      });

      if (hasConflict) {
        return res
          .status(400)
          .json({ error: 'La habitación ya tiene reservas en esas fechas' });
      }

      const allowed = [
        'checkIn',
        'checkOut',
        'huesped',
        'noches',
        'tipo',
        'camas',
        'capacidad',
        'piso',
        'tarifa',
        'observaciones',
        'email',
        'telefono',
        'documento',
        'adultos',
        'ninos',
        'metodoPago',
        'estadoPago',
      ];
      const sanitized = {};
      for (const k of allowed) {
        if (updates[k] !== undefined) sanitized[k] = updates[k];
      }
      reservas[idx] = {
        ...reservas[idx],
        ...sanitized,
        updatedAt: new Date().toISOString(),
      };
      await saveReservas(reservas);

      broadcast('reserva:update', reservas[idx]);
      res.json(reservas[idx]);
    } catch (e) {
      logger.error(
        { err: e, reservaId: req.params.id },
        'Error updating reserva'
      );
      res.status(500).json({ error: e.message });
    }
  },

  async cancel(req, res) {
    try {
      const { id } = req.params;
      const reservas = await getReservas();

      const idx = reservas.findIndex((r) => r.id === id);
      if (idx === -1) {
        return res.status(404).json({ error: 'Reserva no encontrada' });
      }

      const cancelledRoomId = reservas[idx].roomId;

      reservas[idx].estado = 'cancelada';
      reservas[idx].canceledAt = new Date().toISOString();
      await saveReservas(reservas);

      // Sync room estado back to disponible (only if no other active reservations for this room)
      try {
        const rooms = await getRooms();
        const roomIdx = rooms.findIndex(
          (r) => String(r.id) === cancelledRoomId
        );
        if (roomIdx !== -1 && rooms[roomIdx].estado === 'reservada') {
          const hasOtherActive = reservas.some(
            (r) =>
              r.roomId === cancelledRoomId &&
              r.id !== id &&
              r.estado === 'reservada'
          );
          if (!hasOtherActive) {
            rooms[roomIdx].estado = 'disponible';
            await saveRooms(rooms);
          }
        }
      } catch (syncErr) {
        logger.warn(
          { err: syncErr },
          'Failed to sync room estado on reservation cancel'
        );
      }

      broadcast('reserva:cancel', reservas[idx]);
      res.json(reservas[idx]);
    } catch (e) {
      logger.error(
        { err: e, reservaId: req.params.id },
        'Error canceling reserva'
      );
      res.status(500).json({ error: e.message });
    }
  },

  async checkIn(req, res) {
    try {
      const { id } = req.params;
      const reservas = await getReservas();

      const idx = reservas.findIndex((r) => r.id === id);
      if (idx === -1) {
        return res.status(404).json({ error: 'Reserva no encontrada' });
      }

      if (reservas[idx].estado !== 'reservada') {
        return res
          .status(400)
          .json({ error: 'Solo se puede hacer check-in a reservas activas' });
      }

      // Sync room to ocupada with guest data and PIN
      try {
        const reserva = reservas[idx];
        const rooms = await getRooms();
        const roomIdx = rooms.findIndex((r) => String(r.id) === reserva.roomId);
        if (roomIdx !== -1 && rooms[roomIdx].estado !== 'ocupada') {
          const pin = generarPin();
          rooms[roomIdx] = {
            ...rooms[roomIdx],
            huesped: reserva.huesped || rooms[roomIdx].huesped,
            documento: reserva.documento || rooms[roomIdx].documento,
            telefono: reserva.telefono || rooms[roomIdx].telefono,
            email: reserva.email || rooms[roomIdx].email,
            checkIn: new Date().toISOString(),
            checkOut: reserva.checkOut || null,
            noches: reserva.noches || null,
            pin,
            estado: 'ocupada',
          };
          await saveRooms(rooms);
          broadcast('room:update', rooms[roomIdx]);
        }
      } catch (syncErr) {
        logger.warn(
          { err: syncErr },
          'Failed to sync room on reservation check-in'
        );
      }

      reservas[idx].estado = 'checkin';
      reservas[idx].checkInTime = new Date().toISOString();
      await saveReservas(reservas);

      broadcast('reserva:checkin', reservas[idx]);
      res.json(reservas[idx]);
    } catch (e) {
      logger.error(
        { err: e, reservaId: req.params.id },
        'Error checking in reserva'
      );
      res.status(500).json({ error: e.message });
    }
  },

  async checkOut(req, res) {
    try {
      const { id } = req.params;
      const reservas = await getReservas();

      const idx = reservas.findIndex((r) => r.id === id);
      if (idx === -1) {
        return res.status(404).json({ error: 'Reserva no encontrada' });
      }

      reservas[idx].estado = 'completada';
      reservas[idx].checkOutTime = new Date().toISOString();
      await saveReservas(reservas);

      broadcast('reserva:checkout', reservas[idx]);
      res.json(reservas[idx]);
    } catch (e) {
      logger.error(
        { err: e, reservaId: req.params.id },
        'Error checking out reserva'
      );
      res.status(500).json({ error: e.message });
    }
  },

  async getAvailability(req, res) {
    try {
      const { roomId, startDate, endDate } = req.query;
      if (!roomId || !startDate || !endDate) {
        return res
          .status(400)
          .json({ error: 'roomId, startDate, endDate required' });
      }
      const reservas = await getReservas();
      const check = new Date(startDate);
      const end = new Date(endDate);

      const roomReservas = reservas.filter((r) => {
        if (r.roomId !== roomId) return false;
        if (r.estado === 'cancelada' || r.estado === 'completada') return false;
        const rCheckIn = new Date(r.checkIn);
        const rCheckOut = new Date(r.checkOut);
        return check <= rCheckOut && end >= rCheckIn;
      });

      const occupiedDates = [];
      roomReservas.forEach((r) => {
        const start = new Date(r.checkIn);
        const end = new Date(r.checkOut);
        for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
          occupiedDates.push(d.toISOString().split('T')[0]);
        }
      });

      res.json({
        roomId,
        startDate,
        endDate,
        totalReservas: roomReservas.length,
        occupiedDates: [...new Set(occupiedDates)].sort(),
        available: roomReservas.length === 0,
      });
    } catch (e) {
      logger.error({ err: e }, 'Error getting availability');
      res.status(500).json({ error: e.message });
    }
  },
};

// Periodic lifecycle reconciliation — runs every 5 minutes (D29/D30)
const LIFECYCLE_INTERVAL = 5 * 60 * 1000;
let lifecycleTimer = null;

function startLifecycleReconciliation() {
  if (lifecycleTimer) return;
  lifecycleTimer = setInterval(async () => {
    try {
      await reconcileLifecycle();
      await syncRoomStates();
    } catch (err) {
      logger.warn({ err }, 'Lifecycle reconciliation error');
    }
  }, LIFECYCLE_INTERVAL);
  if (lifecycleTimer.unref) lifecycleTimer.unref();
}

// Run once on startup
reconcileLifecycle()
  .then(() => syncRoomStates())
  .catch(() => {});
startLifecycleReconciliation();

module.exports = reservasController;
