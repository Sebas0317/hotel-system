'use strict';

/**
 * Generates a cryptographically stronger 6-digit PIN
 * 900 000 combinations (100x more than the old 4-digit PIN)
 */
function generarPin() {
  // Rejection sampling: 2^32 = 4294967296, 4294967296 / 900000 = 4772.18...
  // Max valid value: 900000 * 4772 = 4294800000
  const array = new Uint32Array(1);
  do {
    require('node:crypto').randomFillSync(array);
  } while (array[0] >= 4294800000);
  return (100000 + (array[0] % 900000)).toString();
}

module.exports = { generarPin };
