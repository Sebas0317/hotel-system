// API base URL - uses /v1 prefix for versioned API
// Override with VITE_API_BASE env var for Vercel production (e.g. /_/backend/v1)
export const API_BASE = import.meta.env.VITE_API_BASE || '/v1';

// ── Room token management ──
// Stores the signed room token issued after PIN validation.
// Used to prove room ownership on guest-facing API calls.
let _roomToken = null;

export function setRoomToken(token) {
  _roomToken = token;
}

export function getRoomToken() {
  return _roomToken;
}

export function clearRoomToken() {
  _roomToken = null;
}

/**
 * Custom API error class with status code
 */
export class ApiError extends Error {
  constructor(message, status = 500) {
    const safeMessage =
      typeof message === 'string' ? message : 'Error inesperado';
    super(safeMessage);
    this.status = status;
    this.name = 'ApiError';
  }
}

export function safeText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  const t = typeof value;
  if (t === 'string') return value;
  if (t === 'number' || t === 'boolean' || t === 'bigint') return String(value);
  if (value instanceof Date) return value.toISOString();
  if (t === 'object') {
    if (typeof value.valueOf === 'function') {
      try {
        const primitive = value.valueOf();
        const pt = typeof primitive;
        if (
          primitive !== value &&
          (pt === 'string' ||
            pt === 'number' ||
            pt === 'boolean' ||
            pt === 'bigint')
        ) {
          return String(primitive);
        }
      } catch {
        // Ignore and continue
      }
    }
    try {
      const serialized = JSON.stringify(value);
      if (serialized && serialized !== '{}') return serialized;
    } catch {
      // Ignore and return fallback
    }
  }
  return fallback;
}

export function safeNumber(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeRoom(room, index = 0) {
  const r = room && typeof room === 'object' ? room : {};
  const rawPiso = r.piso;
  const piso =
    typeof rawPiso === 'number'
      ? rawPiso
      : typeof rawPiso === 'string' &&
          rawPiso.trim() !== '' &&
          Number.isFinite(Number(rawPiso))
        ? Number(rawPiso)
        : safeText(rawPiso, '1');

  return {
    ...r,
    id: safeText(r.id, `room-${index}`),
    numero: safeText(r.numero, ''),
    tipo: safeText(r.tipo, ''),
    estado: safeText(r.estado, 'disponible'),
    huesped: safeText(r.huesped, ''),
    email: safeText(r.email, ''),
    telefono: safeText(r.telefono, ''),
    documento: safeText(r.documento, ''),
    checkIn: safeText(r.checkIn, ''),
    checkOut: safeText(r.checkOut, ''),
    piso,
    capacidad: safeNumber(r.capacidad, 0),
    camas: safeNumber(r.camas, 0),
    tarifa: safeNumber(r.tarifa, 0),
    noches: safeNumber(r.noches, 0),
    adultos: safeNumber(r.adultos, 1),
    ninos: safeNumber(r.ninos, 0),
  };
}

function normalizeConsumo(consumo, index = 0) {
  const c = consumo && typeof consumo === 'object' ? consumo : {};
  return {
    ...c,
    id: safeText(c.id, `consumo-${index}`),
    roomId: safeText(c.roomId, ''),
    descripcion: safeText(c.descripcion, ''),
    categoria: safeText(c.categoria, 'servicios'),
    precio: safeNumber(c.precio, 0),
    fecha: safeText(c.fecha, ''),
  };
}

function normalizeReserva(reserva, index = 0) {
  const r = reserva && typeof reserva === 'object' ? reserva : {};
  return {
    ...r,
    id: safeText(r.id, `reserva-${index}`),
    roomId: safeText(r.roomId, ''),
    numero: safeText(r.numero, ''),
    estado: safeText(r.estado, ''),
    huesped: safeText(r.huesped, ''),
    checkIn: safeText(r.checkIn, ''),
    checkOut: safeText(r.checkOut, ''),
    noches: safeNumber(r.noches, 0),
    tarifa: safeNumber(r.tarifa, 0),
  };
}

export function normalizeErrorMessage(input, fallback = 'Request failed') {
  if (typeof input === 'string') return input;
  if (
    typeof input === 'number' ||
    typeof input === 'boolean' ||
    typeof input === 'bigint'
  ) {
    return String(input);
  }
  if (input && typeof input === 'object') {
    const nested = input.message ?? input.error ?? input.detail;
    if (nested !== undefined && nested !== input) {
      return normalizeErrorMessage(nested, fallback);
    }
    try {
      const serialized = JSON.stringify(input);
      if (serialized && serialized !== '{}') return serialized;
    } catch {
      // Ignore and fall through to fallback
    }
  }
  return fallback;
}

/**
 * Check if the backend is reachable
 * @returns {Promise<boolean>}
 */
export async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`, {
      signal: AbortSignal.timeout(5000),
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
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(timeout),
  };

  try {
    const response = await fetch(url, config);
    const raw = await response.text();
    let data = null;

    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        // Non-JSON response (often HTML from dev-server fallback/proxy mismatch)
        const snippet = raw.slice(0, 120).trim();
        throw new ApiError(
          `Respuesta inválida del servidor para ${endpoint}. Verifica proxy/backend. Fragmento: ${snippet}`,
          response.status || 500
        );
      }
    }

    if (!response.ok) {
      const message = normalizeErrorMessage(
        data?.error ?? data?.message ?? response.statusText,
        'Request failed'
      );
      throw new ApiError(message, response.status);
    }

    return data;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new ApiError('Request timed out', 408);
    }
    throw new ApiError(
      normalizeErrorMessage(err?.message ?? err, 'Error de red'),
      500
    );
  }
}

// ── Auth API ──

/**
 * Login with email/username and password
 * @param {string} identifier - Email or username
 * @param {string} password - Password
 * @returns {Promise<{requires2FA?: boolean, userId?: string, usuario?: object}>}
 */
export async function loginAdmin(identifier, password) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: { identifier, password },
  });
}

export async function verify2FA(userId, code) {
  return apiFetch('/auth/2fa/verify', {
    method: 'POST',
    body: { userId, code },
  });
}

export async function fetchAuthStatus() {
  return apiFetch('/auth/status');
}

export async function fetchSetup() {
  return apiFetch('/auth/setup');
}

export async function sendLoginCode(identifier, password) {
  return apiFetch('/auth/login-code/send', {
    method: 'POST',
    body: { identifier, password },
  });
}

export async function sendVerificationCode(userId) {
  return apiFetch('/auth/verification/enviar', {
    method: 'POST',
    body: { userId },
  });
}

export async function verifyEmailCode(userId, code) {
  return apiFetch('/auth/verification/verificar', {
    method: 'POST',
    body: { userId, code },
  });
}

export async function requestPasswordRecovery(identifier) {
  return apiFetch('/auth/recovery/solicitar', {
    method: 'POST',
    body: { identifier },
  });
}

export async function verifyRecoveryCode(identifier, code) {
  return apiFetch('/auth/recovery/verificar', {
    method: 'POST',
    body: { identifier, code },
  });
}

export async function changePassword(
  nuevaContrasena,
  resetToken,
  currentPassword
) {
  return apiFetch('/auth/recovery/cambiar', {
    method: 'POST',
    body: { nuevaContrasena, resetToken, currentPassword },
  });
}

export async function toggle2FA(userId) {
  return apiFetch('/auth/2fa/toggle', {
    method: 'POST',
    body: { userId },
  });
}

/**
 * Register a new user
 * @param {Object} params
 * @param {string} params.username
 * @param {string} params.email
 * @param {string} params.password
 * @param {string} [params.firstName]
 * @param {string} [params.lastName]
 * @returns {Promise<{mensaje: string, usuario: object, requiereVerificarCorreo: boolean}>}
 */
export async function registerUser({
  username,
  email,
  password,
  firstName,
  lastName,
}) {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: { username, email, password, firstName, lastName },
  });
}

/**
 * Get current authenticated user's profile
 */
export async function getAuthProfile() {
  return apiFetch('/auth/profile');
}

/**
 * Update current user's profile
 */
export async function updateAuthProfile(data) {
  return apiFetch('/auth/profile', {
    method: 'PUT',
    body: data,
  });
}

/**
 * Change own password (requires current password)
 */
export async function changeOwnPassword(currentPassword, newPassword) {
  return apiFetch('/auth/profile/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  });
}

// ── User Management API (Admin) ──

/**
 * List all users with optional filters
 * @param {Object} [params]
 * @param {string} [params.search]
 * @param {string} [params.role]
 * @param {string} [params.isActive]
 * @param {string} [params.sort]
 */
export async function fetchUsers(params = {}) {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.role) qs.set('role', params.role);
  if (params.isActive !== undefined) qs.set('isActive', params.isActive);
  if (params.sort) qs.set('sort', params.sort);
  const query = qs.toString();
  return apiFetch(`/users${query ? `?${query}` : ''}`);
}

/**
 * Get a single user by ID
 */
export async function fetchUser(id) {
  return apiFetch(`/users/${id}`);
}

/**
 * Create a new user (admin only)
 */
export async function createUser(data) {
  return apiFetch('/users', {
    method: 'POST',
    body: data,
  });
}

/**
 * Update a user (admin only)
 */
export async function updateUser(id, data) {
  return apiFetch(`/users/${id}`, {
    method: 'PUT',
    body: data,
  });
}

/**
 * Delete a user (admin only)
 */
export async function deleteUser(id) {
  return apiFetch(`/users/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Reset a user's password (admin only)
 */
export async function resetUserPassword(id, newPassword, twoFactorCode) {
  const body = { newPassword };
  if (twoFactorCode) body.twoFactorCode = twoFactorCode;
  return apiFetch(`/users/${id}/reset-password`, {
    method: 'POST',
    body,
  });
}

/**
 * Get available roles
 */
export async function fetchUserRoles() {
  return apiFetch('/users/roles');
}

/**
 * Get user statistics
 */
export async function fetchUserStats() {
  return apiFetch('/users/stats');
}

/**
 * Store user info (including role) for role-based UI.
 * Only non-sensitive metadata (role, username) — JWT stays in httpOnly cookie.
 * @param {object} user
 */
export function setUserInfo(user) {
  if (user) {
    sessionStorage.setItem('userInfo', JSON.stringify(user));
  } else {
    sessionStorage.removeItem('userInfo');
  }
}

/**
 * Get stored user info
 * @returns {object|null}
 */
export function getUserInfo() {
  try {
    const raw = sessionStorage.getItem('userInfo');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Logout — calls backend to clear httpOnly cookie, then clears local state
 */
export async function logout() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch {
    // Best-effort — clear local state regardless
  }
  setUserInfo(null);
}

// ── Room API ──

/**
 * Fetch all rooms
 * @returns {Promise<Array>} Array of room objects
 */
export async function fetchRooms() {
  const data = await apiFetch('/rooms');
  return Array.isArray(data)
    ? data.map((room, i) => normalizeRoom(room, i))
    : [];
}

/**
 * Fetch all reservations (reservada + ocupada)
 * @returns {Promise<Array>} Array of reservation objects
 */
export async function fetchReservaciones() {
  const data = await apiFetch('/rooms/reservaciones');
  return Array.isArray(data)
    ? data.map((room, i) => normalizeRoom(room, i))
    : [];
}

export async function fetchReservas(pagination) {
  let endpoint = '/reservas';
  if (pagination?.page || pagination?.limit) {
    const params = new URLSearchParams();
    if (pagination.page) params.set('page', pagination.page);
    if (pagination.limit) params.set('limit', pagination.limit);
    endpoint += `?${params.toString()}`;
  }
  const data = await apiFetch(endpoint);
  const items = Array.isArray(data) ? data : data?.data || [];
  return items.map((reserva, i) => normalizeReserva(reserva, i));
}

export async function fetchReservasByRoom(roomId) {
  const data = await apiFetch(`/reservas/room/${roomId}`);
  return Array.isArray(data)
    ? data.map((reserva, i) => normalizeReserva(reserva, i))
    : [];
}

export async function fetchReservasByDateRange(start, end) {
  return apiFetch(`/reservas/availability?start=${start}&end=${end}`);
}

export async function createReserva(data) {
  return apiFetch('/reservas', {
    method: 'POST',
    body: data,
  });
}

export async function updateReserva(id, data) {
  return apiFetch(`/reservas/${id}`, {
    method: 'PUT',
    body: data,
  });
}

export async function cancelReserva(id) {
  return apiFetch(`/reservas/${id}/cancel`, {
    method: 'PATCH',
  });
}

export async function checkInReserva(id) {
  return apiFetch(`/reservas/${id}/checkin`, {
    method: 'PATCH',
  });
}

export async function checkOutReserva(id) {
  return apiFetch(`/reservas/${id}/checkout`, {
    method: 'PATCH',
  });
}

/**
 * Validate room PIN
 * @param {string} numero - Room number
 * @param {string} pin - 6-digit PIN
 * @returns {Promise<object>} Room data
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
  const headers = {};
  const token = getRoomToken();
  if (token) headers['x-room-token'] = token;
  return apiFetch(`/rooms/${roomId}/solicitar-checkout`, {
    method: 'POST',
    headers,
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
export async function createConsumo({
  roomId,
  descripcion,
  precio,
  categoria,
}) {
  return apiFetch('/consumos', {
    method: 'POST',
    body: { roomId, descripcion, precio, categoria },
  });
}

/**
 * Fetch consumos for a specific room
 * @param {string|number} roomId - Room ID
 * @param {Object} [pagination] - Optional pagination params
 * @param {number} [pagination.page]
 * @param {number} [pagination.limit]
 * @returns {Promise<Array>} Array of consumption objects
 */
export async function fetchConsumos(roomId, pagination) {
  let endpoint = `/consumos/${roomId}`;
  if (pagination?.page || pagination?.limit) {
    const params = new URLSearchParams();
    if (pagination.page) params.set('page', pagination.page);
    if (pagination.limit) params.set('limit', pagination.limit);
    endpoint += `?${params.toString()}`;
  }
  const headers = {};
  const token = getRoomToken();
  if (token) headers['x-room-token'] = token;
  const data = await apiFetch(endpoint, { headers });
  return Array.isArray(data)
    ? data.map((consumo, i) => normalizeConsumo(consumo, i))
    : [];
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
export async function checkIn({
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
  personasAdicionales,
}) {
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
      personasAdicionales,
    },
  });
}

/**
 * Get all history entries
 * @param {Object} [pagination] - Optional pagination params
 * @param {number} [pagination.page]
 * @param {number} [pagination.limit]
 * @returns {Promise<Array|Object>} History array or paginated response
 */
export async function fetchHistory(pagination) {
  let endpoint = '/history';
  if (pagination?.page || pagination?.limit) {
    const params = new URLSearchParams();
    if (pagination.page) params.set('page', pagination.page);
    if (pagination.limit) params.set('limit', pagination.limit);
    endpoint += `?${params.toString()}`;
  }
  return apiFetch(endpoint, { method: 'GET' });
}

/**
 * Get state history (room status changes)
 * @returns {Promise<Array>} State history array
 */
export async function fetchStateHistory() {
  return apiFetch('/state-history', { method: 'GET' });
}

/**
 * Get accounting summary
 * @returns {Promise<Object>} Accounting data
 */
export async function fetchAccountingSummary() {
  return apiFetch('/accounting/summary', { method: 'GET' });
}

/**
 * Download accounting Excel report
 */
export async function downloadAccountingReport() {
  const url = `${API_BASE}/accounting/export`;

  let response;
  try {
    response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new ApiError('La descarga tardó demasiado', 408);
    }
    throw new ApiError('No se pudo descargar el reporte', 500);
  }

  if (!response.ok) {
    let message = 'Error al descargar reporte';
    try {
      const data = await response.json();
      message = data?.error || data?.message || message;
    } catch {
      // Ignore parse errors and keep fallback message
    }
    throw new ApiError(message, response.status);
  }

  const blob = await response.blob();
  if (!blob || blob.size === 0) {
    throw new ApiError('El reporte está vacío', 500);
  }

  const a = document.createElement('a');
  const blobUrl = window.URL.createObjectURL(blob);
  a.href = blobUrl;
  a.download = `ecobosque_contabilidad_${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(blobUrl);
  document.body.removeChild(a);
}

/**
 * Get last login info
 */
export async function fetchLastLogin() {
  return apiFetch('/auth/last-login', { method: 'GET' });
}

/**
 * Get login audit logs
 */
export async function fetchLoginLogs(limit = 50) {
  return apiFetch(`/auth/login-logs?limit=${limit}`, { method: 'GET' });
}

/**
 * Get security audit events
 */
export async function fetchSecurityEvents(limit = 100) {
  return apiFetch(`/auth/security-events?limit=${limit}`, { method: 'GET' });
}

/**
 * Sanitize a CSV cell value to prevent formula injection (=, +, -, @, tab)
 */
function sanitizeCSV(value) {
  const str = String(value ?? '');
  if (/^[=+\-@\t]/.test(str)) {
    return `'${str}`;
  }
  // Escape double quotes by doubling them, then wrap in quotes if contains comma, quote, or newline
  if (/[,"\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Download login logs as CSV
 */
export function downloadLoginLogsCSV(logs) {
  if (!logs || logs.length === 0) return;
  const headers = ['Fecha/Hora', 'IP', 'User Agent', 'País'];
  const rows = logs.map((l) => [
    l.timestamp ? new Date(l.timestamp).toLocaleString('es-CO') : '',
    l.ip || '',
    l.userAgent || '',
    l.country || '',
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map(sanitizeCSV).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ecobosque_login_logs_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
