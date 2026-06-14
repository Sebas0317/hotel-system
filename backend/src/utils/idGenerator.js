'use strict';

const crypto = require('node:crypto');

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
  const buf = crypto.randomBytes(3);
  const random = buf.toString('hex');
  return `${lastId}-${random}`;
}

function generateReservationId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const buf = crypto.randomBytes(3);
  const random = buf.toString('hex').toUpperCase();
  return `RES-${year}${month}-${random}`;
}

module.exports = { generateId, generateReservationId };
