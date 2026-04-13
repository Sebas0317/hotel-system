#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { faker } = require('@faker-js/faker');

const ROOMS_FILE = path.join(__dirname, '..', 'rooms.json');

function loadRooms() {
  const data = fs.readFileSync(ROOMS_FILE, 'utf-8');
  return JSON.parse(data);
}

function saveRooms(rooms) {
  fs.writeFileSync(ROOMS_FILE, JSON.stringify(rooms, null, 2), 'utf-8');
}

function generateFakeData() {
  const rooms = loadRooms();
  const today = new Date();
  
  console.log(`Found ${rooms.filter(r => r.estado === 'ocupada' || r.estado === 'reservada').length} rooms to update`);
  
  rooms.forEach((room, idx) => {
    if (room.estado !== 'ocupada' && room.estado !== 'reservada') return;
    
    const capacidad = room.capacidad || 2;
    const isOccupied = room.estado === 'ocupada';
    
    // adults + ninos must equal capacidad
    const adultos = Math.floor(Math.random() * capacidad) + 1;
    const ninos = capacidad - adultos;
    const hasPet = Math.random() > 0.8;
    
    // Generate check-in date (past date)
    const checkInDate = new Date(today);
    checkInDate.setDate(checkInDate.getDate() - Math.floor(Math.random() * 10) - 1);
    
    // Generate check-out date
    const nights = Math.floor(Math.random() * 5) + 1;
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + nights);
    
    // Generate fake guest data
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    
    // Generate additional guests based on remaining capacity
    const personasAdicionales = [];
    if (ninos > 0) {
      for (let i = 0; i < ninos; i++) {
        personasAdicionales.push({
          nombre: faker.person.firstName(),
          documento: faker.string.numeric(10),
        });
      }
    }
    
    const fakeData = {
      huesped: `${firstName} ${lastName}`,
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      telefono: faker.phone.number('### ### ####'),
      documento: faker.string.numeric(10),
      observaciones: Math.random() > 0.7 ? faker.lorem.sentence() : '',
      adultos: adultos,
      ninos: ninos,
      personasAdicionales: personasAdicionales,
      tieneMascota: hasPet,
      nombreMascota: hasPet ? faker.animal.dog() : '',
      noches: isOccupied ? Math.ceil((today - checkInDate) / (1000 * 60 * 60 * 24)) + 1 : nights,
      checkIn: checkInDate.toISOString(),
      checkOut: checkOutDate.toISOString(),
    };
    
    rooms[idx] = { ...rooms[idx], ...fakeData };
    
    console.log(`Room #${room.numero} (cap: ${capacidad}, ${room.estado}): ${fakeData.huesped}, ${adultos} adultos, ${ninos} niños${hasPet ? ', 🐾' : ''}`);
  });
  
  saveRooms(rooms);
  console.log('\n✅ Fake data generated successfully!');
}

generateFakeData();