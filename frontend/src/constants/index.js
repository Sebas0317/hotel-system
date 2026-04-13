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
  disponible:     { label: 'Disponible', color: '#16a34a', bg: '#dcfce7', border: '#86efac', dot: '#16a34a' },
  reservada:     { label: 'Reservada', color: '#2563eb', bg: '#dbeafe', border: '#93c5fd', dot: '#2563eb' },
  ocupada:       { label: 'Ocupada',   color: '#ea580c', bg: '#ffedd5', border: '#fdba74', dot: '#ea580c' },
  limpieza:      { label: 'Limpieza',  color: '#9333ea', bg: '#f3e8ff', border: '#c4b5fd', dot: '#9333ea' },
  mantenimiento: { label: 'Mantenimiento', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', dot: '#dc2626' },
  fuera_servicio: { label: 'Fuera de servicio', color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db', dot: '#6b7280' },
};

/**
 * Room type icons mapping (using Unicode symbols)
 */
export const TIPO_ICON = {
  'Suite Bosque': '\uD83C\uDF32',
  'Suite Sunset': '\uD83C\uDF05',
  'Suite Edén': '\uD83C\uDF3F',
  'Habitación Pareja': '\uD83D\uDC91',
  'Habitación Doble Estándar': '\uD83D\uDECF',
  'Habitación Cuádruple Estándar': '\uD83D\uDC66\uD83D\uDC67',
  'Cabana Familiar en Bote': '\u26F5',
};

/**
 * Valid payment methods
 */
export const METODOS_PAGO = [
  { key: 'efectivo',      icon: '\uD83D\uDCB5', label: 'Efectivo' },
  { key: 'tarjeta',       icon: '\uD83D\uDCB3', label: 'Tarjeta' },
  { key: 'transferencia', icon: '\uD83D\uDCF2', label: 'Transferencia' },
];

/**
 * Consumption category display config
 */
export const CATEGORIAS_CONSUMO = [
  { key: 'restaurante', label: 'Restaurante' },
  { key: 'bar',         label: 'Bar' },
  { key: 'servicios',   label: 'Servicios' },
];

/**
 * Category icons for display
 */
export const CAT_ICONS = {
  restaurante: '\uD83C\uDF7D\uFE0F',
  bar: '\uD83C\uDF79',
  servicios: '\uD83D\uDD0E',
};

/**
 * Amenity icons and labels for room display
 * Consolidated from PantallaCheckin.jsx and ecoweb/RoomDetails.tsx
 */
export const AMENIDADES = {
  jacuzzi_privado: { icono: '🛁', label: 'Jacuzzi Privado' },
  wifi: { icono: '📶', label: 'WiFi' },
  ac: { icono: '❄️', label: 'Aire Acondicionado' },
  tv: { icono: '📺', label: 'TV' },
  bano_privado: { icono: '🚿', label: 'Baño Privado' },
  balcon: { icono: '🌅', label: 'Balcón' },
  terraza: { icono: '☀️', label: 'Terraza' },
  vista_bosque: { icono: '🌲', label: 'Vista al Bosque' },
  vista_bosque_premium: { icono: '✨', label: 'Vista Premium' },
  orientacion_solar: { icono: '🌅', label: 'Orientación Solar' },
  ducha_exterior: { icono: '🚿', label: 'Ducha Exterior' },
  jardin_privado: { icono: '🌸', label: 'Jardín Privado' },
  arquitectura_sostenible: { icono: '🌿', label: 'Arquitectura Sostenible' },
  vista_lago: { icono: '🌊', label: 'Vista al Lago' },
  hamacas: { icono: '🌴', label: 'Hamacas' },
  cocina: { icono: '🍳', label: 'Cocina Equipada' },
  chimenea: { icono: '🔥', label: 'Chimenea' },
  terra_privada: { icono: '☀️', label: 'Terraza Privada' },
  minibar: { icono: '🍷', label: 'Minibar' },
  caja_fuerte: { icono: '🔐', label: 'Caja Fuerte' },
  room_service: { icono: '🛎️', label: 'Room Service' },
  mascota: { icono: '🐕', label: 'Mascotas Bienvenidas' },
  parking: { icono: '🅿️', label: 'Estacionamiento' },
  piscina: { icono: '🏊', label: 'Piscina' },
  spa: { icono: '💆', label: 'Spa' },
  Restaurante: { icono: '🍽️', label: 'Restaurante' },
  bar: { icono: '🍸', label: 'Bar' },
  lavanderia: { icono: '👕', label: 'Lavandería' },
  gym: { icono: '🏋️', label: 'Gimnasio' },
};

/**
 * @deprecated Use AMENIDADES instead. Kept for backward compatibility.
 */
export const AMENIDADES_CFG = AMENIDADES;

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