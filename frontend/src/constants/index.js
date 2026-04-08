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
  ocupada:        { label: 'Occupied',      color: '#d97706', bg: '#fef3c7', border: '#fcd34d', dot: '#d97706' },
  reservada:      { label: 'Reserved',     color: '#059669', bg: '#d1fae5', border: '#6ee7b7', dot: '#059669' },
  disponible:     { label: 'Available',    color: '#0891b2', bg: '#cffafe', border: '#a5f3fc', dot: '#0891b2' },
  limpieza:       { label: 'Cleaning',     color: '#7c3aed', bg: '#ede9fe', border: '#c4b5fd', dot: '#7c3aed' },
  mantenimiento:  { label: 'Maintenance',  color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', dot: '#dc2626' },
  'fuera-servicio': { label: 'Out of Service', color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db', dot: '#6b7280' },
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
  { key: 'efectivo',      icon: '\uD83D\uDCB5', label: 'Cash' },
  { key: 'tarjeta',       icon: '\uD83D\uDCB3', label: 'Card' },
  { key: 'transferencia', icon: '\uD83D\uDCF2', label: 'Transfer' },
];

/**
 * Consumption category display config
 */
export const CATEGORIAS_CONSUMO = [
  { key: 'restaurante', label: 'Restaurant' },
  { key: 'bar',         label: 'Bar' },
  { key: 'servicios',   label: 'Services' },
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
 */
export const AMENIDADES_CFG = {
  jacuzzi_privado: { icon: '\uD83E\uDDBB', label: 'Private Jacuzzi' },
  wifi: { icon: '\uD83D\uDCF6', label: 'WiFi' },
  ac: { icon: '\u2744\uFE0F', label: 'Air Conditioning' },
  tv: { icon: '\uD83D\uDCFA', label: 'Television' },
  bano_privado: { icon: '\uD83E\uDDBF', label: 'Private Bathroom' },
  balcon: { icon: '\uD83C\uDF05', label: 'Balcony' },
  terraza: { icon: '\uD83C\uDFE1', label: 'Terrace' },
  vista_bosque: { icon: '\uD83C\uDF32', label: 'Forest View' },
  vista_bosque_premium: { icon: '\uD83C\uDF04', label: 'Premium View' },
  orientacion_solar: { icon: '\u2600\uFE0F', label: 'Sun Orientation' },
  ducha_exterior: { icon: '\uD83E\uDDBF', label: 'Outdoor Shower' },
  jardin_privado: { icon: '\uD83C\uDF31', label: 'Private Garden' },
  arquitectura_sostenible: { icon: '\uD83E\uDDF4', label: 'Sustainable Architecture' },
  vista_lago: { icon: '\uD83C\uDF0A', label: 'Lake View' },
  hamacas: { icon: '\uD83C\uDF34', label: 'Hammocks' },
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