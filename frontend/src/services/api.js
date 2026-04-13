// API base URL - empty string uses Vite dev server proxy
export const API_BASE = '';

/**
 * Custom API error class with status code
 */
export class ApiError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

/**
 * Check if the backend is reachable
 * @returns {Promise<boolean>}
 */
export async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`, { 
      signal: AbortSignal.timeout(5000) 
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Generic fetch wrapper with error handling
 * @param {string} endpoint - API endpoint path
 * @param {Object} options - Fetch options (method, body, etc.)
 * @param {number} [timeout=10000] - Request timeout in ms
 * @returns {Promise<any>} Parsed JSON response
 */
async function apiFetch(endpoint, options = {}, timeout = 10000) {
  const url = `${API_BASE}${endpoint}`;
  const token = localStorage.getItem('adminToken');
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(timeout),
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(data.error || 'Request failed', response.status);
    }

    return data;
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new ApiError('Request timed out', 408);
    }
    throw err;
  }
}

// ── Auth API ──

/**
 * Login as admin with password
 * @param {string} password - Admin password
 * @returns {Promise<{token: string, expiresIn: string}>}
 */
export async function loginAdmin(password) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: { password },
  });
}

/**
 * Attach JWT token to all subsequent API requests
 * @param {string} token - JWT token
 */
export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('adminToken', token);
  } else {
    localStorage.removeItem('adminToken');
  }
}

/**
 * Get stored JWT token
 * @returns {string|null}
 */
export function getAuthToken() {
  return localStorage.getItem('adminToken');
}

// ── Room API ──

/**
 * Fetch all rooms
 * @returns {Promise<Array>} Array of room objects
 */
export async function fetchRooms() {
  return apiFetch('/rooms');
}

/**
 * Fetch all reservations (reservada + ocupada)
 * @returns {Promise<Array>} Array of reservation objects
 */
export async function fetchReservaciones() {
  return apiFetch('/rooms/reservaciones');
}

/**
 * Validate room PIN
 * @param {string} numero - Room number
 * @param {string} pin - 4-digit PIN
 * @returns {Promise<Object>} Room object if valid
 */
export async function validarPin(numero, pin) {
  return apiFetch('/rooms/validar', {
    method: 'POST',
    body: { numero, pin },
  });
}

/**
 * Check out a guest
 * @param {string|number} roomId - Room ID
 * @param {Object} params - Checkout parameters
 * @param {string} params.metodoPago - Payment method
 * @param {number} params.valorRecibido - Amount received
 * @returns {Promise<Object>} Checkout result with totals
 */
export async function checkout(roomId, { metodoPago, valorRecibido }) {
  return apiFetch(`/rooms/${roomId}/checkout`, {
    method: 'POST',
    body: { metodoPago, valorRecibido },
  });
}

/**
 * Guest requests checkout (public - no auth required)
 * @param {string|number} roomId - Room ID
 * @param {string} checkOutDate - Optional check-out date (YYYY-MM-DD)
 * @returns {Promise<Object>} Result with updated room
 */
export async function solicitarCheckout(roomId, checkOutDate) {
  return apiFetch(`/rooms/${roomId}/solicitar-checkout`, {
    method: 'POST',
    body: { checkOutDate },
  });
}

/**
 * Cancel a reservation
 * @param {string|number} roomId - Room ID
 * @returns {Promise<Object>} Cancel result with updated room
 */
export async function cancelReservation(roomId) {
  return apiFetch(`/rooms/${roomId}/cancel`, {
    method: 'POST',
  });
}

/**
 * Create a reservation for a room
 * @param {string|number} roomId - Room ID
 * @param {Object} params - Reservation parameters
 * @param {string} params.huesped - Guest name
 * @param {string} [params.telefono] - Guest phone
 * @param {string} [params.email] - Guest email
 * @param {number} params.noches - Number of nights
 * @returns {Promise<Object>} Updated room object
 */
export async function reservar(roomId, { huesped, telefono, email, noches }) {
  return apiFetch(`/rooms/${roomId}/reservar`, {
    method: 'POST',
    body: { huesped, telefono, email, noches },
  });
}

/**
 * Update guest data for an occupied room
 * @param {string|number} roomId - Room ID
 * @param {Object} params - Guest data to update
 * @param {string} [params.huesped] - Guest name
 * @param {string} [params.telefono] - Guest phone
 * @param {string} [params.email] - Guest email
 * @returns {Promise<Object>} Updated room object
 */
export async function updateGuest(roomId, { huesped, telefono, email }) {
  return apiFetch(`/rooms/${roomId}/update-guest`, {
    method: 'POST',
    body: { huesped, telefono, email },
  });
}

/**
 * Update room status (only for non-occupied rooms)
 * @param {string|number} roomId - Room ID
 * @param {string} estado - New status ('disponible' | 'reservada')
 * @returns {Promise<Object>} Updated room object
 */
export async function updateRoomStatus(roomId, estado) {
  return apiFetch(`/rooms/${roomId}/status`, {
    method: 'PATCH',
    body: { estado },
  });
}

// ── Consumo API ──

/**
 * Register a new consumption
 * @param {Object} params - Consumption parameters
 * @param {string|number} params.roomId - Room ID
 * @param {string} params.descripcion - Description
 * @param {number} params.precio - Price
 * @param {string} params.categoria - Category
 * @returns {Promise<Object>} Created consumption object
 */
export async function createConsumo({ roomId, descripcion, precio, categoria }) {
  return apiFetch('/consumos', {
    method: 'POST',
    body: { roomId, descripcion, precio, categoria },
  });
}

/**
 * Fetch consumos for a specific room
 * @param {string|number} roomId - Room ID
 * @returns {Promise<Array>} Array of consumption objects
 */
export async function fetchConsumos(roomId) {
  return apiFetch(`/consumos/${roomId}`);
}

// ── Prices API ──

/**
 * Fetch all prices (tariffs + products)
 * @returns {Promise<Object>} Prices configuration
 */
export async function fetchPrices() {
  return apiFetch('/prices');
}

/**
 * Update prices
 * @param {Object} prices - Prices object with tarifas and productos
 * @returns {Promise<Object>} Updated prices
 */
export async function updatePrices(prices) {
  return apiFetch('/prices', {
    method: 'PUT',
    body: prices,
  });
}

/**
 * Check in a guest
 * @param {Object} params - Check-in parameters
 * @returns {Promise<Object>} Updated room object
 */
export async function checkIn({ numero, huesped, tipo, email, telefono, documento, noches, checkIn: checkInDate, checkOut, observaciones, adultos, ninos, tieneMascota, nombreMascota, personasAdicionales }) {
  return apiFetch('/rooms/checkin', {
    method: 'POST',
    body: { 
      numero, 
      huesped, 
      tipo, 
      email, 
      telefono, 
      documento, 
      noches, 
      checkIn: checkInDate, 
      checkOut, 
      observaciones, 
      adultos, 
      ninos, 
      tieneMascota, 
      nombreMascota, 
      personasAdicionales 
    },
  });
}

/**
 * Get all history entries
 * @returns {Promise<Array>} History array
 */
export async function fetchHistory() {
  return apiFetch('/history', { method: 'GET' });
}

/**
 * Get state history (room status changes)
 * @returns {Promise<Array>} State history array
 */
export async function fetchStateHistory() {
  return apiFetch('/state-history', { method: 'GET' });
}
