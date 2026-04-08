'use strict';

/**
 * Generates a cryptographically stronger 4-digit PIN
 * Replaces Math.random() which is not suitable for security-sensitive values
 */
function generarPin() {
  // Use crypto.getRandomValues for better randomness
  const array = new Uint32Array(1);
  require('crypto').randomFillSync(array);
  return (1000 + (array[0] % 9000)).toString();
}

module.exports = { generarPin };
