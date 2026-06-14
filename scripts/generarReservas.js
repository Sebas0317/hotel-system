const fs = require('fs');
const path = require('path');

const ROOMS_FILE = path.join(__dirname, '../rooms.json');

const NOMBRES = [
  'Juan Garcia', 'Maria Lopez', 'Carlos Martinez', 'Ana Rodriguez', 'Luis Perez',
  'Carmen Sanchez', 'Miguel Torres', 'Laura Diaz', 'Francisco Gomez', 'Elena Fernandez',
  'David Alvarez', 'Isabel Romero', 'Javier Silva', 'Patricia Rivera', 'Fernando Castro',
  'Rosa Morales', 'Antonio Ortega', 'Dolores Guerrero', 'Manuel Vargas', 'Sofia Medina',
  'Ricardo Fuentes', 'Andrea Estrada', 'Oscar Vega', 'Claudia Paredes', 'Diego Rios',
  'Natalia Paredes', 'Andres Aguilar', 'Veronica Mendoza', 'Sergio Delgado', 'Lucia Castillo'
];

const TIPOS_DOC = ['CC', 'CE', 'TI', 'PASAPORTE'];

function generarPin() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function generarReserva(room, fechaInicio, noches) {
  const inicio = new Date(fechaInicio);
  const checkIn = inicio.toISOString().split('T')[0];
  
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + noches);
  const checkOut = fin.toISOString().split('T')[0];

  const huesped = NOMBRES[Math.floor(Math.random() * NOMBRES.length)];
  
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    numero: room.numero,
    tipo: room.tipo,
    huesped,
    documento: `${Math.floor(10000000 + Math.random() * 90000000)}`,
    telefono: `3${Math.floor(100000000 + Math.random() * 900000000)}`,
    email: `${huesped.toLowerCase().replace(' ', '.')}@email.com`,
    personas: Math.floor(1 + Math.random() * 3),
    checkIn,
    checkOut,
    noches,
    observaciones: '',
    estado: 'reservada',
    createdAt: new Date().toISOString()
  };
}

function agregarReservas(dias = 14, reservasPorDia = 3) {
  const data = JSON.parse(fs.readFileSync(ROOMS_FILE, 'utf8'));
  
  const reservasCreadas = [];
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  for (let d = 0; d < dias; d++) {
    const fecha = new Date(hoy);
    fecha.setDate(fecha.getDate() + d);
    
    const numReservas = Math.floor(Math.random() * reservasPorDia) + 1;
    
    for (let r = 0; r < numReservas; r++) {
      const disponibles = data.rooms.filter(room => {
        return room.estado === 'disponible' || !room.checkIn;
      });
      
      if (disponibles.length === 0) break;
      
      const room = disponibles[Math.floor(Math.random() * disponibles.length)];
      const noches = Math.floor(Math.random() * 5) + 1;
      
      const reserva = generarReserva(room, fecha, noches);
      reservasCreadas.push(reserva);
    }
  }

  console.log(`\n📋 Resumen de reservas generadas:`);
  console.log(`   - Total reservas: ${reservasCreadas.length}`);
  console.log(`   - Habitaciones usadas: ${[...new Set(reservasCreadas.map(r => r.numero))].length}`);

  // Write reservations to disk
  const reservasFile = path.join(__dirname, '../reservas.json');
  let existingReservas = [];
  if (fs.existsSync(reservasFile)) {
    existingReservas = JSON.parse(fs.readFileSync(reservasFile, 'utf8'));
  }
  const todasReservas = [...existingReservas, ...reservasCreadas];
  fs.writeFileSync(reservasFile, JSON.stringify(todasReservas, null, 2), 'utf8');

  console.log(`\n💾 Reservas guardadas en ${reservasFile}`);
  console.log(`   Total en archivo: ${todasReservas.length}\n`);

  return reservasCreadas;
}

const dias = process.argv[2] ? parseInt(process.argv[2]) : 14;
const reservasPorDia = process.argv[3] ? parseInt(process.argv[3]) : 3;

console.log(`🏨 Generando reservas falsas...`);
console.log(`   - Dias: ${dias}`);
console.log(`   - Max reservas por dia: ${reservasPorDia}\n`);

agregarReservas(dias, reservasPorDia);
