'use strict';

const { PrismaClient } = require('@prisma/client');
const { randomFillSync } = require('crypto');

const prisma = new PrismaClient();

const rooms = [
  { numero: '101', tipo: 'estandar', camas: '1 queen', capacidad: 2, piso: 1 },
  { numero: '102', tipo: 'estandar', camas: '1 queen', capacidad: 2, piso: 1 },
  { numero: '103', tipo: 'estandar', camas: '2 doble', capacidad: 4, piso: 1 },
  { numero: '201', tipo: 'suite', camas: '1 king', capacidad: 2, piso: 2 },
  { numero: '202', tipo: 'suite', camas: '1 king + sofa', capacidad: 3, piso: 2 },
  { numero: '203', tipo: 'suite', camas: '2 king', capacidad: 4, piso: 2 },
  { numero: '301', tipo: 'familiar', camas: '2 queen + sofa', capacidad: 5, piso: 3 },
  { numero: '302', tipo: 'familiar', camas: '2 queen', capacidad: 4, piso: 3 },
  { numero: 'Cab-1', tipo: 'cabaña', camas: '1 queen', capacidad: 2, piso: 0 },
  { numero: 'Cab-2', tipo: 'cabaña', camas: '2 doble', capacidad: 4, piso: 0 },
];

function generateId() {
  const ts = Date.now().toString(36);
  const buf = randomFillSync(new Uint8Array(4));
  const rand = Array.from(buf).map(b => b.toString(36)).join('');
  return `${ts}-${rand}`;
}

async function main() {
  for (const r of rooms) {
    await prisma.room.create({
      data: { id: generateId(), ...r, estado: 'disponible' }
    });
  }
  console.log('Created', rooms.length, 'rooms');
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
