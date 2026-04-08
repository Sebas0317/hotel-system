/**
 * Mock data generator for demonstration purposes.
 * Generates realistic random consumptions for a given room.
 * Uses a seeded approach based on room ID so data is consistent across renders.
 */

const SAMPLE_CONSUMOS = {
  restaurante: [
    { descripcion: 'Desayuno americano', precio: 18000 },
    { descripcion: 'Almuerzo del día', precio: 25000 },
    { descripcion: 'Bandeja paisa', precio: 28000 },
    { descripcion: 'Cena ejecutiva', precio: 32000 },
    { descripcion: 'Ensalada fresca', precio: 12000 },
    { descripcion: 'Sopa del día', precio: 10000 },
  ],
  bar: [
    { descripcion: 'Cerveza Club Colombia', precio: 8000 },
    { descripcion: 'Café americano', precio: 5000 },
    { descripcion: 'Jugo natural', precio: 7000 },
    { descripcion: 'Agua Cristal 600ml', precio: 4000 },
    { descripcion: 'Vino tinto (copa)', precio: 18000 },
  ],
  servicios: [
    { descripcion: 'Servicio de lavandería', precio: 20000 },
    { descripcion: 'Toallas extra (par)', precio: 5000 },
    { descripcion: 'Servicio a la habitación', precio: 8000 },
    { descripcion: 'Tour ciudad (por persona)', precio: 35000 },
  ],
};

/**
 * Simple hash function to produce a deterministic number from a string.
 * Ensures the same room always gets the same mock data.
 * @param {string} str - Input string (e.g., room ID)
 * @returns {number} Hash value
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Generates a pseudo-random number from a seed.
 * @param {number} seed - Seed value
 * @param {number} index - Step index (for multiple calls)
 * @returns {number} Value between 0 and 1
 */
function seededRandom(seed, index) {
  const x = Math.sin(seed + index * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

/**
 * Generates mock consumptions for a room based on its ID.
 * Only generates data for occupied rooms with a check-in date.
 * @param {Object} room - Room object with id, estado, checkIn
 * @returns {Array} Array of mock consumo objects
 */
export function generarConsumosMock(room) {
  // Only generate for occupied rooms with a guest
  if (room.estado !== 'ocupada' || !room.huesped || !room.checkIn) {
    return [];
  }

  const seed = hashString(room.id);
  const numConsumos = Math.floor(seededRandom(seed, 0) * 6) + 1; // 1-6 consumos
  const consumos = [];
  const categorias = ['restaurante', 'bar', 'servicios'];
  const checkInDate = new Date(room.checkIn);

  for (let i = 0; i < numConsumos; i++) {
    // Pick a random category and product
    const catIndex = Math.floor(seededRandom(seed, i * 3 + 1) * categorias.length);
    const categoria = categorias[catIndex];
    const productos = SAMPLE_CONSUMOS[categoria];
    const prodIndex = Math.floor(seededRandom(seed, i * 3 + 2) * productos.length);
    const producto = productos[prodIndex];

    // Generate a date between check-in and now
    const daysSinceCheckIn = Math.max(
      0,
      Math.floor(seededRandom(seed, i * 3 + 3) * 5)
    );
    const fecha = new Date(checkInDate);
    fecha.setDate(fecha.getDate() + daysSinceCheckIn);
    fecha.setHours(
      8 + Math.floor(seededRandom(seed, i * 5 + 4) * 14),
      Math.floor(seededRandom(seed, i * 5 + 5) * 60)
    );

    consumos.push({
      id: `${room.id}-mock-${i}`,
      roomId: room.id,
      descripcion: producto.descripcion,
      categoria,
      precio: producto.precio,
      fecha: fecha.toISOString(),
    });
  }

  // Sort by date
  consumos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  return consumos;
}

/**
 * Calculates the estimated available date for a room.
 * For occupied rooms: check-in + random 1-7 nights.
 * For reserved rooms: reservation start + 1-5 nights.
 * For available rooms: returns null (already available).
 * @param {Object} room - Room object
 * @returns {Date|null} Estimated availability date
 */
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

/**
 * Generates mock contact info for a guest based on room ID.
 * @param {Object} room - Room object
 * @returns {Object} Mock contact info { telefono, email, documento }
 */
export function generarContactoMock(room) {
  if (!room.huesped) return null;

  const seed = hashString(room.id);
  const r = (i) => seededRandom(seed, i + 200);

  // Generate a realistic Colombian phone number
  const telefono = `3${Math.floor(r(1) * 9)}${Math.floor(r(2) * 10)} ${Math.floor(r(3) * 1000)} ${Math.floor(r(4) * 10000)}`;

  // Generate a mock email from guest name
  const nombreNormalizado = room.huesped
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '.');
  const dominios = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
  const email = `${nombreNormalizado}@${dominios[Math.floor(r(5) * dominios.length)]}`;

  // Generate a mock Colombian ID number
  const documento = `${Math.floor(r(6) * 90000000 + 10000000)}`;

  return { telefono, email, documento };
}
