#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOMS_FILE = path.join(__dirname, '..', 'rooms.json');
const HISTORY_FILE = path.join(__dirname, '..', 'history.json');

function readJSON(filePath) {
  const data = fs.readFileSync(filePath, 'utf-8');
  return data ? JSON.parse(data) : { reservas: [] };
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function migrateToHistory() {
  const rooms = readJSON(ROOMS_FILE);
  let history = readJSON(HISTORY_FILE);
  if (!history.reservas) history = { reservas: [] };
  
  const occupiedReserved = rooms.filter(r => 
    (r.estado === 'ocupada' || r.estado === 'reservada') && r.huesped
  );
  
  console.log(`Found ${occupiedReserved.length} occupied/reserved rooms to migrate to history`);
  
  occupiedReserved.forEach(room => {
    const entry = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: room.checkIn || new Date().toISOString(),
      tipo: room.estado === 'reservada' ? 'reserva' : 'checkin',
      roomId: room.id,
      numero: room.numero,
      huesped: room.huesped,
      email: room.email || '',
      telefono: room.telefono || '',
      documento: room.documento || '',
      adultos: room.adultos || 1,
      ninos: room.ninos || 0,
      tieneMascota: room.tieneMascota || false,
      nombreMascota: room.nombreMascota || '',
      personasAdicionales: room.personasAdicionales || [],
      observaciones: room.observaciones || '',
      checkIn: room.checkIn || null,
      checkOut: room.checkOut || null,
      noches: room.noches || 1,
      tarifa: room.tarifa || 0,
      estado: room.estado,
    };
    
    history.reservas.unshift(entry);
    console.log(`  - Room #${room.numero} (${room.estado}): ${room.huesped}`);
  });
  
  writeJSON(HISTORY_FILE, history);
  console.log(`\n✅ Migration complete! ${occupiedReserved.length} entries added to history.`);
}

migrateToHistory();