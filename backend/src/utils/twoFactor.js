'use strict';

const crypto = require('crypto');

const codes = new Map();
const CODE_TTL = 5 * 60 * 1000;
const CLEANUP_INTERVAL = 60 * 1000;

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of codes.entries()) {
    if (now > entry.expiresAt) codes.delete(key);
  }
}, CLEANUP_INTERVAL);
if (cleanupTimer.unref) cleanupTimer.unref();

function generateCode(length = 6) {
  const digits = [];
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    digits.push((bytes[i] % 10).toString());
  }
  return digits.join('');
}

function storeCode(key) {
  const code = generateCode();
  codes.set(key, { code, expiresAt: Date.now() + CODE_TTL });
  return code;
}

function verifyCode(key, inputCode) {
  const entry = codes.get(key);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    codes.delete(key);
    return false;
  }
  const valid = entry.code === inputCode;
  if (valid) codes.delete(key);
  return valid;
}

module.exports = { generateCode, storeCode, verifyCode };
