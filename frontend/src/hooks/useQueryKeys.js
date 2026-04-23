/**
 * Query keys for type-safe caching
 * Following TanStack Query best practices
 */
export const queryKeys = {
  // Rooms
  rooms: ['rooms'] as const,
  room: (id: string) => ['room', id] as const,
  
  // History
  history: ['history'] as const,
  reservationHistory: ['reservationHistory'] as const,
  
  // Accounting
  accounting: ['accounting'] as const,
  
  // Consumos
  consumos: (roomId: string) => ['consumos', roomId] as const,
  
  // Auth
  lastLogin: ['lastLogin'] as const,
  loginLogs: ['loginLogs'] as const,
};

/**
 * Stale times for each data type (in milliseconds)
 * Adjust based on how often data changes
 */
export const staleTimes = {
  rooms: 1000 * 60 * 5,      // 5 minutes - rooms change often
  history: 1000 * 60 * 10,   // 10 minutes - history rarely changes
  accounting: 1000 * 60,   // 1 minute - accounting should be fresh
  consumos: 1000 * 60 * 2,  // 2 minutes
};