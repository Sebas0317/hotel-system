#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOMS_FILE = path.join(__dirname, '..', 'rooms.json');
const RESERVAS_FILE = path.join(__dirname, '..', 'reservas.json');

const NAMES = [
  'Sofia Rojas', 'Daniel Mejia', 'Camila Ruiz', 'Mateo Cardenas', 'Laura Pineda',
  'Andres Molina', 'Valentina Gil', 'Sebastian Vega', 'Mariana Torres', 'Juan David Lopez',
  'Natalia Arias', 'Felipe Restrepo', 'Paula Jimenez', 'Santiago Castro', 'Diana Ospina',
];

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function toIsoDate(date) {
  return date.toISOString().split('T')[0];
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildReserva({ id, room, checkIn, checkOut, guest, personas }) {
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const noches = Math.max(1, Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)));
  const doc = String(randomInt(10000000, 99999999));
  const phone = `3${randomInt(10, 29)}${randomInt(1000000, 9999999)}`;
  const email = guest.toLowerCase().replace(/\s+/g, '.') + '@mail.com';

  return {
    id,
    roomId: room.id,
    roomNumero: room.numero,
    huesped: guest,
    documento: doc,
    telefono: phone,
    email,
    checkIn,
    checkOut,
    noches,
    personas,
    estado: 'reservada',
    createdAt: new Date().toISOString(),
  };
}

function generateForRoom(room, count, seedOffset) {
  const today = new Date();
  let cursor = addDays(today, randomInt(0, 7) + seedOffset);
  const reservas = [];

  for (let i = 0; i < count; i++) {
    const stayNights = randomInt(1, 4);
    const gapDays = randomInt(1, 5);
    const checkIn = toIsoDate(cursor);
    const checkOut = toIsoDate(addDays(cursor, stayNights));
    const guest = NAMES[(seedOffset + i) % NAMES.length];
    const personas = Math.min(room.capacidad || 2, randomInt(1, 4));
    const id = `sim-${room.id}-${checkIn}-${i + 1}`;

    reservas.push(buildReserva({ id, room, checkIn, checkOut, guest, personas }));
    cursor = addDays(cursor, stayNights + gapDays);
  }

  return reservas;
}

function main() {
  const rooms = readJson(ROOMS_FILE, []);
  const existing = readJson(RESERVAS_FILE, []);
  const clean = existing.filter(r => !String(r.id || '').startsWith('sim-'));

  const targetRooms = rooms.slice(0, 12);
  const generated = [];

  targetRooms.forEach((room, idx) => {
    const count = idx === 0 ? 8 : randomInt(3, 5); // Primera habitación con muchas reservas
    generated.push(...generateForRoom(room, count, idx));
  });

  const finalData = [...clean, ...generated].sort((a, b) => {
    if (a.roomId === b.roomId) return String(a.checkIn).localeCompare(String(b.checkIn));
    return String(a.roomId).localeCompare(String(b.roomId));
  });

  writeJson(RESERVAS_FILE, finalData);
  console.log(`Reservas simuladas generadas: ${generated.length}`);
  console.log(`Total reservas en archivo: ${finalData.length}`);
}

main();
