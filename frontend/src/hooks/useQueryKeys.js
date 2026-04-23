/**
 * Query keys for type-safe caching
 * Following TanStack Query best practices
 */
export const queryKeys = {
  // Rooms
  rooms: ['rooms'],
  room: (id) => ['room', id],
  
  // History
  history: ['history'],
  reservationHistory: ['reservationHistory'],
  
  // Accounting
  accounting: ['accounting'],
  
  // Consumos
  consumos: (roomId) => ['consumos', roomId],
  
  // Auth
  lastLogin: ['lastLogin'],
  loginLogs: ['loginLogs'],
};

/**
 * Stale times for each data type (in milliseconds)
 * Adjust based on how often data changes
 */
export const staleTimes = {
  rooms: 1000 * 60 * 5,      // 5 minutes
  history: 1000 * 60 * 10,  // 10 minutes
  accounting: 1000 * 60,   // 1 minute
  consumos: 1000 * 60 * 2,  // 2 minutes
};