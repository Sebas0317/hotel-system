const SAMPLE_CONSUMOS = {
  restaurante: [
    { descripcion: 'Desayuno americano', precio: 18000 },
    { descripcion: 'Almuerzo del día', precio: 25000 },
    { descripcion: 'Bandeja paisa', precio: 28000 },
    { descripcion: 'Cena ejecutiva', precio: 32000 },
  ],
  bar: [
    { descripcion: 'Cerveza Club Colombia', precio: 8000 },
    { descripcion: 'Café americano', precio: 5000 },
    { descripcion: 'Jugo natural', precio: 7000 },
  ],
  servicios: [
    { descripcion: 'Servicio de lavandería', precio: 20000 },
    { descripcion: 'Toallas extra (par)', precio: 5000 },
  ],
};

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed, index) {
  const x = Math.sin(seed + index * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

export function generarConsumosMock(room) {
  if (room.estado !== 'ocupada' || !room.huesped || !room.checkIn) return [];

  const seed = hashString(room.id);
  const numConsumos = Math.floor(seededRandom(seed, 0) * 6) + 1;
  const consumos = [];
  const categorias = ['restaurante', 'bar', 'servicios'];
  const checkInDate = new Date(room.checkIn);

  for (let i = 0; i < numConsumos; i++) {
    const catIndex = Math.floor(seededRandom(seed, i * 3 + 1) * categorias.length);
    const categoria = categorias[catIndex];
    const productos = SAMPLE_CONSUMOS[categoria];
    const prodIndex = Math.floor(seededRandom(seed, i * 3 + 2) * productos.length);
    const producto = productos[prodIndex];

    const daysSinceCheckIn = Math.max(0, Math.floor(seededRandom(seed, i * 3 + 3) * 5));
    const fecha = new Date(checkInDate);
    fecha.setDate(fecha.getDate() + daysSinceCheckIn);
    fecha.setHours(8 + Math.floor(seededRandom(seed, i * 5 + 4) * 14), Math.floor(seededRandom(seed, i * 5 + 5) * 60));

    consumos.push({
      id: `${room.id}-mock-${i}`,
      roomId: room.id,
      descripcion: producto.descripcion,
      categoria,
      precio: producto.precio,
      fecha: fecha.toISOString(),
    });
  }

  consumos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  return consumos;
}

export function calcularFechaDisponible(room) {
  if (room.estado === 'disponible') return null;
  if (!room.checkIn) return null;

  const seed = hashString(room.id);
  const nights = room.estado === 'ocupada'
    ? Math.floor(seededRandom(seed, 100) * 7) + 1
    : Math.floor(seededRandom(seed, 101) * 5) + 1;

  const fecha = new Date(room.checkIn);
  fecha.setDate(fecha.getDate() + nights);
  return fecha;
}

export function generarContactoMock(room) {
  if (!room.huesped) return null;

  const seed = hashString(room.id);
  const r = (i) => seededRandom(seed, i + 200);

  const telefono = `3${Math.floor(r(1) * 9)}${Math.floor(r(2) * 10)} ${Math.floor(r(3) * 1000)} ${Math.floor(r(4) * 10000)}`;

  const nombreNormalizado = room.huesped
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '.');
  const dominios = ['gmail.com', 'yahoo.com', 'hotmail.com'];
  const email = `${nombreNormalizado}@${dominios[Math.floor(r(5) * dominios.length)]}`;

  const documento = `${Math.floor(r(6) * 90000000 + 10000000)}`;

  return { telefono, email, documento };
}