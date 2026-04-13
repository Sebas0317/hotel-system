'use strict';

/**
 * Generates unique IDs using a combination of timestamp and random suffix
 * to avoid collisions that occur with plain Date.now() under rapid requests
 */
let lastId = 0;
function generateId() {
  const timestamp = Date.now();
  // Ensure uniqueness even if called multiple times in the same millisecond
  if (timestamp <= lastId) {
    lastId = lastId + 1;
  } else {
    lastId = timestamp;
  }
  return `${lastId}-${Math.random().toString(36).substring(2, 7)}`;
}

module.exports = { generateId, generateReservationId };

function generateReservationId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RES-${year}${month}-${random}`;
}
