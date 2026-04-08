/**
 * Hotel product catalog organized by category
 * Prices are in COP (Colombian Pesos) as integers
 */
export const PRODUCTOS = {
  restaurante: [
    { nombre: 'Desayuno americano',     precio: 28000 },
    { nombre: 'Desayuno buffet',       precio: 35000, incluye: true },
    { nombre: 'Almuerzo regional',    precio: 35000 },
    { nombre: 'Bandeja paisa',        precio: 38000 },
    { nombre: 'Cena BBQ',             precio: 45000 },
    { nombre: 'Menú infantil',        precio: 22000 },
  ],
  bar: [
    { nombre: 'Agua mineral',          precio: 6000  },
    { nombre: 'Jugo natural',         precio: 12000 },
    { nombre: 'Cerveza artesanal',    precio: 15000 },
    { nombre: 'Cocteles tropicales',  precio: 28000 },
    { nombre: 'Vino por copa',        precio: 25000 },
  ],
  servicios: [
    { nombre: 'Servicio a habitación',   precio: 12000 },
    { nombre: 'Lavandería',               precio: 25000 },
    { nombre: 'Masaje relajante 60min', precio: 100000 },
    { nombre: 'Tour guiado senderos',     precio: 50000 },
    { nombre: 'Parqueadero',              precio: 15000 },
    { nombre: 'Mascota por noche',       precio: 50000 },
  ],
};

/**
 * Room state configuration with visual styling
 */
export const ESTADO_CFG = {
  ocupada:        { label: 'Ocupada',         color: '#d97706', bg: '#fef3c7', border: '#fcd34d', dot: '#d97706' },
  reservada:      { label: 'Reservada',       color: '#059669', bg: '#d1fae5', border: '#6ee7b7', dot: '#059669' },
  disponible:     { label: 'Disponible',      color: '#0891b2', bg: '#cffafe', border: '#a5f3fc', dot: '#0891b2' },
  limpieza:       { label: 'Limpieza',        color: '#7c3aed', bg: '#ede9fe', border: '#c4b5fd', dot: '#7c3aed' },
  mantenimiento:  { label: 'Mantenimiento',   color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', dot: '#dc2626' },
};

/**
 * Room type icons mapping
 */
export const TIPO_ICON = {
  'Suite Bosque': '🌲',
  'Suite Sunset': '🌅',
  'Suite Edén': '🌿',
  'Habitación Pareja': '💑',
  'Habitación Doble Estándar': '🛏️',
  'Habitación Cuádruple Estándar': '👨‍👩‍👧‍👦',
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
  jacuzzi_privado: { icon: '🛁', label: 'Jacuzzi privado' },
  wifi: { icon: '📶', label: 'WiFi' },
  ac: { icon: '❄️', label: 'Aire acondicionado' },
  tv: { icon: '📺', label: 'Televisor' },
  baño_privado: { icon: '🚿', label: 'Baño privado' },
  balcon: { icon: '🌅', label: 'Balcón' },
  terraza: { icon: '🏡', label: 'Terraza' },
  vista_bosque: { icon: '🌲', label: 'Vista al bosque' },
  vista_bosque_premium: { icon: '🌄', label: 'Vista premium' },
  orientacion_solar: { icon: '☀️', label: 'Orientación solar' },
  ducha_exterior: { icon: '🚿', label: 'Ducha exterior' },
  jardin_privado: { icon: '🌱', label: 'Jardín privado' },
  arquitectura_sostenible: { icon: '🪵', label: 'Arquitectura sostenible' },
  vista_lago: { icon: '🌊', label: 'Vista al lago' },
  hamacas: { icon: '🌴', label: 'Hamacas' },
};

/**
 * Room type labels for display
 */
export const TIPO_LABEL = {
  'Suite Bosque': 'Suite Bosque',
  'Suite Sunset': 'Suite Sunset',
  'Suite Edén': 'Suite Edén',
  'Habitación Pareja': 'Habitación Pareja',
  'Habitación Doble Estándar': 'Habitación Doble',
  'Habitación Cuádruple Estándar': 'Habitación Cuádruple',
  'Cabana Familiar en Bote': 'Cabaña Familiar',
};

/**
 * Available room types for check-in
 */
export const TIPOS_HABITACION = [
  { value: 'Suite Bosque', label: 'Suite Bosque' },
  { value: 'Suite Sunset', label: 'Suite Sunset' },
  { value: 'Suite Edén', label: 'Suite Edén' },
  { value: 'Habitación Pareja', label: 'Habitación Pareja' },
  { value: 'Habitación Doble Estándar', label: 'Habitación Doble' },
  { value: 'Habitación Cuádruple Estándar', label: 'Habitación Cuádruple' },
  { value: 'Cabana Familiar en Bote', label: 'Cabaña Familiar' },
];

/**
 * Hotel configuration
 */
export const HOTEL_CFG = {
  nombre: 'El Bosque Hotel Boutique',
  nombreMarketing: 'Eco Hotel El Bosque',
  ubicacion: 'Doradal, Colombia',
  horarios: {
    checkIn: { inicio: '15:00', fin: '16:00' },
    checkOut: { inicio: '12:00', fin: '12:30' },
  },
  politicas: {
    edadMinima: 0,
    mascotas: true,
    tarifaMascota: 50000,
  },
};