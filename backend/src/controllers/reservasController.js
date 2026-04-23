const fs = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');

const jsonStore = require('../data/jsonStore');

const RESERVAS_FILE = path.join(__dirname, '../../reservas.json');

function getReservas() {
  try {
    if (!fs.existsSync(RESERVAS_FILE)) {
      return [];
    }
    return jsonStore.read(RESERVAS_FILE) || [];
  } catch (e) {
    console.error('Error reading reservas:', e);
    return [];
  }
}

function saveReservas(reservas) {
  try {
    fs.writeFileSync(RESERVAS_FILE, JSON.stringify(reservas, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving reservas:', e);
  }
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

const reservasController = {
  async getAll(req, res) {
    try {
      const reservas = getReservas();
      res.json(reservas);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async getByRoom(req, res) {
    try {
      const { roomId } = req.params;
      const reservas = getReservas();
      const roomReservas = reservas.filter(r => r.roomId === roomId);
      res.json(roomReservas);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async getByDateRange(req, res) {
    try {
      const { start, end } = req.query;
      const reservas = getReservas();
      
      if (!start || !end) {
        return res.status(400).json({ error: 'Start and end dates required' });
      }
      
      const startDate = new Date(start);
      const endDate = new Date(end);
      
      const filtered = reservas.filter(r => {
        const checkIn = new Date(r.checkIn);
        const checkOut = new Date(r.checkOut);
        return checkIn <= endDate && checkOut >= startDate;
      });
      
      res.json(filtered);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async create(req, res) {
    try {
      const { roomId, huesped, documento, telefono, email, checkIn, checkOut, personas, observaciones, tipoHabitacion, numeroHabitacion } = req.body;

      if (!roomId || !huesped || !checkIn || !checkOut) {
        return res.status(400).json({ error: 'Datos incompletos: roomId, huesped, checkIn, checkOut requeridos' });
      }

      const reservas = getReservas();
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);

      const hasConflict = reservas.some(r => {
        if (r.roomId !== roomId) return false;
        if (r.estado === 'cancelada') return false;
        
        const rCheckIn = new Date(r.checkIn);
        const rCheckOut = new Date(r.checkOut);
        return checkInDate < rCheckOut && checkOutDate > rCheckIn;
      });

      if (hasConflict) {
        return res.status(400).json({ error: 'La habitación ya tiene reservas en esas fechas' });
      }

      const reserva = {
        id: generateId(),
        roomId,
        numeroHabitacion: numeroHabitacion,
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
        createdAt: new Date().toISOString()
      };

      reservas.push(reserva);
      saveReservas(reservas);

      res.status(201).json(reserva);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const reservas = getReservas();
      
      const idx = reservas.findIndex(r => r.id === id);
      if (idx === -1) {
        return res.status(404).json({ error: 'Reserva no encontrada' });
      }

      const checkInDate = new Date(updates.checkIn || reservas[idx].checkIn);
      const checkOutDate = new Date(updates.checkOut || reservas[idx].checkOut);
      const roomId = updates.roomId || reservas[idx].roomId;

      const hasConflict = reservas.some(r => {
        if (r.id === id) return false;
        if (r.roomId !== roomId) return false;
        if (r.estado === 'cancelada') return false;
        
        const rCheckIn = new Date(r.checkIn);
        const rCheckOut = new Date(r.checkOut);
        return checkInDate < rCheckOut && checkOutDate > rCheckIn;
      });

      if (hasConflict) {
        return res.status(400).json({ error: 'La habitación ya tiene reservas en esas fechas' });
      }

      reservas[idx] = { ...reservas[idx], ...updates, updatedAt: new Date().toISOString() };
      saveReservas(reservas);

      res.json(reservas[idx]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async cancel(req, res) {
    try {
      const { id } = req.params;
      const reservas = getReservas();
      
      const idx = reservas.findIndex(r => r.id === id);
      if (idx === -1) {
        return res.status(404).json({ error: 'Reserva no encontrada' });
      }

      reservas[idx].estado = 'cancelada';
      reservas[idx].canceledAt = new Date().toISOString();
      saveReservas(reservas);

      res.json(reservas[idx]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async checkIn(req, res) {
    try {
      const { id } = req.params;
      const reservas = getReservas();
      
      const idx = reservas.findIndex(r => r.id === id);
      if (idx === -1) {
        return res.status(404).json({ error: 'Reserva no encontrada' });
      }

      if (reservas[idx].estado !== 'reservada') {
        return res.status(400).json({ error: 'Solo se puede hacer check-in a reservas activas' });
      }

      reservas[idx].estado = 'checkin';
      reservas[idx].checkInTime = new Date().toISOString();
      saveReservas(reservas);

      res.json(reservas[idx]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async checkOut(req, res) {
    try {
      const { id } = req.params;
      const reservas = getReservas();
      
      const idx = reservas.findIndex(r => r.id === id);
      if (idx === -1) {
        return res.status(404).json({ error: 'Reserva no encontrada' });
      }

      reservas[idx].estado = 'completada';
      reservas[idx].checkOutTime = new Date().toISOString();
      saveReservas(reservas);

      res.json(reservas[idx]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  getAvailability(roomId, startDate, endDate) {
    const reservas = getReservas();
    const check = new Date(startDate);
    const end = new Date(endDate);
    
    const roomReservas = reservas.filter(r => {
      if (r.roomId !== roomId) return false;
      if (r.estado === 'cancelada' || r.estado === 'completada') return false;
      
      const rCheckIn = new Date(r.checkIn);
      const rCheckOut = new Date(r.checkOut);
      return check <= rCheckOut && end >= rCheckIn;
    });

    const occupiedDates = [];
    roomReservas.forEach(r => {
      const start = new Date(r.checkIn);
      const end = new Date(r.checkOut);
      for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        occupiedDates.push(d.toISOString().split('T')[0]);
      }
    });

    return {
      roomId,
      startDate,
      endDate,
      totalReservas: roomReservas.length,
      occupiedDates: [...new Set(occupiedDates)].sort(),
      available: roomReservas.length === 0
    };
  }
};

module.exports = reservasController;
