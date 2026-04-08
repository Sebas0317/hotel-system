/**
 * Hotel product catalog organized by category
 * Prices are in COP (Colombian Pesos) as integers
 */
export const PRODUCTOS = {
  restaurante: [
    { nombre: 'Desayuno americano',     precio: 18000 },
    { nombre: 'Desayuno continental',   precio: 12000 },
    { nombre: 'Almuerzo del día',       precio: 25000 },
    { nombre: 'Bandeja paisa',          precio: 28000 },
    { nombre: 'Cena ejecutiva',         precio: 32000 },
    { nombre: 'Sanduche de pollo',      precio: 15000 },
    { nombre: 'Ensalada fresca',        precio: 12000 },
    { nombre: 'Porción de frutas',      precio: 8000  },
    { nombre: 'Sopa del día',           precio: 10000 },
    { nombre: 'Ajiaco bogotano',        precio: 22000 },
  ],
  bar: [
    { nombre: 'Agua Cristal 600ml',          precio: 4000  },
    { nombre: 'Gaseosa 350ml',               precio: 5000  },
    { nombre: 'Jugo natural',                precio: 7000  },
    { nombre: 'Cerveza Club Colombia',       precio: 8000  },
    { nombre: 'Cerveza Águila',              precio: 7000  },
    { nombre: 'Aguardiente Antioqueño',      precio: 45000 },
    { nombre: 'Ron Medellín Añejo',          precio: 55000 },
    { nombre: 'Vino tinto (copa)',           precio: 18000 },
    { nombre: 'Café americano',              precio: 5000  },
    { nombre: 'Cappuccino',                  precio: 7000  },
    { nombre: 'Aromática',                   precio: 4000  },
    { nombre: 'Michelada',                   precio: 12000 },
  ],
  servicios: [
    { nombre: 'Toallas extra (par)',           precio: 5000  },
    { nombre: 'Servicio de lavandería',        precio: 20000 },
    { nombre: 'Planchado de ropa',             precio: 15000 },
    { nombre: 'Servicio a la habitación',      precio: 8000  },
    { nombre: 'Bloqueador solar',              precio: 12000 },
    { nombre: 'Kit de afeitado',               precio: 8000  },
    { nombre: 'Parqueadero adicional (día)',   precio: 15000 },
    { nombre: 'Llamada nacional',              precio: 3000  },
    { nombre: 'Tour ciudad (por persona)',     precio: 35000 },
    { nombre: 'Masaje relajante 60min',        precio: 80000 },
    { nombre: 'Flotadores / accesorios piscina', precio: 10000 },
    { nombre: 'Adaptador eléctrico',           precio: 6000  },
  ],
};

/**
 * Room state configuration with visual styling
 */
export const ESTADO_CFG = {
  ocupada:        { label: 'Ocupada',         color: '#ef4444', bg: '#fef2f2', border: '#fca5a5', dot: '#ef4444' },
  reservada:      { label: 'Reservada',       color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b' },
  disponible:     { label: 'Disponible',      color: '#10b981', bg: '#f0fdf4', border: '#6ee7b7', dot: '#10b981' },
  limpieza:       { label: 'En limpieza',     color: '#8b5cf6', bg: '#f5f3ff', border: '#c4b5fd', dot: '#8b5cf6' },
  mantenimiento:  { label: 'Mantenimiento',   color: '#f97316', bg: '#fff7ed', border: '#fdba74', dot: '#f97316' },
  'fuera-servicio': { label: 'Fuera de servicio', color: '#6b7280', bg: '#f9fafb', border: '#d1d5db', dot: '#6b7280' },
};

/**
 * Room type icons mapping
 */
export const TIPO_ICON = {
  'Suite Bosque': '🌲',
  'Suite Sunset': '🌅',
  'Suite Eden': '🌿',
  'Habitacion Pareja': '💑',
  'Habitacion Doble': '🛏️🛏️',
  'Habitacion Cuadruple': '👨‍👩‍👧‍👦',
  'Cabana Familiar en Bote': '⛵',
};

/**
 * Valid payment methods
 */
export const METODOS_PAGO = [
  { key: 'efectivo',      icon: '💵', label: 'Efectivo' },
  { key: 'tarjeta',       icon: '💳', label: 'Tarjeta' },
  { key: 'transferencia', icon: '📲', label: 'Transferencia' },
];

/**
 * Consumption category display config
 */
export const CATEGORIAS_CONSUMO = [
  { key: 'restaurante', label: '🍽️ Restaurante' },
  { key: 'bar',         label: '🍹 Bar' },
  { key: 'servicios',   label: '🛎️ Servicios' },
];

/**
 * Category icons for display
 */
export const CAT_ICONS = {
  restaurante: '🍽️',
  bar: '🍹',
  servicios: '🛎️',
};

/**
 * Amenity icons and labels for room display
 */
export const AMENIDADES_CFG = {
  jacuzzi: { icon: '🛁', label: 'Jacuzzi' },
  wifi: { icon: '📶', label: 'WiFi' },
  ac: { icon: '❄️', label: 'Aire Acondicionado' },
  balcon: { icon: '🌅', label: 'Balcón' },
  'vista-bosque': { icon: '🌲', label: 'Vista al Bosque' },
  'vista-puesta-sol': { icon: '🌇', label: 'Vista Puesta de Sol' },
  sala: { icon: '🛋️', label: 'Sala' },
  cocina: { icon: '🍳', label: 'Cocina' },
  terraza: { icon: '🏡', label: 'Terraza' },
  ' Ducha Exclusiva': { icon: '🚿', label: 'Ducha Exclusiva' },
  chimenea: { icon: '🔥', label: 'Chimenea' },
  hamaca: { icon: '🌴', label: 'Hamaca' },
  'vista-lago': { icon: '🌊', label: 'Vista al Lago' },
};

/**
 * Room type labels for display
 */
export const TIPO_LABEL = {
  'Suite Bosque': 'Suite Bosque',
  'Suite Sunset': 'Suite Sunset',
  'Suite Eden': 'Suite Eden',
  'Habitacion Pareja': 'Habitación Pareja',
  'Habitacion Doble': 'Habitación Doble',
  'Habitacion Cuadruple': 'Habitación Cuádruple',
  'Cabana Familiar en Bote': 'Cabaña Familiar en Bote',
};

/**
 * Available room types for check-in
 */
export const TIPOS_HABITACION = [
  { value: 'Suite Bosque', label: 'Suite Bosque' },
  { value: 'Suite Sunset', label: 'Suite Sunset' },
  { value: 'Suite Eden', label: 'Suite Eden' },
  { value: 'Habitacion Pareja', label: 'Habitación Pareja' },
  { value: 'Habitacion Doble', label: 'Habitación Doble' },
  { value: 'Habitacion Cuadruple', label: 'Habitación Cuádruple' },
  { value: 'Cabana Familiar en Bote', label: 'Cabaña Familiar en Bote' },
];
