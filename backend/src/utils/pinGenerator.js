'use strict';

/**
 * Generates a cryptographically stronger 6-digit PIN
 * 900 000 combinations (100x more than the old 4-digit PIN)
 */
function generarPin() {
  const array = new Uint32Array(1);
  require('crypto').randomFillSync(array);
  return (100000 + (array[0] % 900000)).toString();
}

module.exports = { generarPin };
