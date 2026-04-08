/**
 * Format a number as Colombian Peso currency
 * @param {number} n - Amount to format
 * @returns {string} Formatted currency string
 */
export const COP = (n) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(n);

/**
 * Format an ISO date string to Colombian locale
 * @param {string} iso - ISO date string
 * @returns {string} Formatted date/time or em-dash if falsy
 */
export const FECHA = (iso) =>
  iso
    ? new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
    : '—';

/**
 * Calculate total from an array of items with precio property
 * @param {Array} items - Array of objects with precio field
 * @returns {number} Sum of all prices
 */
export const calcularTotal = (items) =>
  items.reduce((sum, item) => sum + (item.precio || 0), 0);

/**
 * Group rooms by floor
 * @param {Array} rooms - Room array
 * @returns {Object} Object keyed by floor name with room arrays
 */
export const agruparPorPiso = (rooms) => {
  return { 'Todas las habitaciones': rooms };
};

/**
 * Filter rooms by status, type, and search term
 * @param {Array} rooms - All rooms
 * @param {string} filtro - Status filter ('todos' or specific state)
 * @param {string} buscar - Search term for room number or guest name
 * @param {string} tipo - Type filter ('todos' or specific type)
 * @returns {Array} Filtered rooms
 */
export const filtrarRooms = (rooms, filtro, buscar, tipo = 'todos') =>
  rooms.filter((r) => {
    const matchFiltro = filtro === 'todos' || r.estado === filtro;
    const matchTipo = tipo === 'todos' || r.tipo === tipo;
    const matchBuscar =
      !buscar ||
      r.numero.toLowerCase().includes(buscar.toLowerCase()) ||
      (r.huesped || '').toLowerCase().includes(buscar.toLowerCase());
    return matchFiltro && matchTipo && matchBuscar;
  });
