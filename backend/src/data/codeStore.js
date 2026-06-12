'use strict';

const crypto = require('crypto');
const path = require('path');
const { readJsonFile, writeJsonFile } = require('./jsonStoreHelper');

const CODES_FILE = path.join(__dirname, '../../codes.json');

function generateCode(length = 6) {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes).map(b => (b % 10).toString()).join('');
}

function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

async function getCodes() {
  return readJsonFile(CODES_FILE, []);
}

async function saveCodes(codes) {
  return writeJsonFile(CODES_FILE, codes);
}

async function createCode({ userId, type, ttlMs = 300000, maxAttempts = 5 }) {
  const codes = await getCodes();
  const plainCode = generateCode(6);

  const entry = {
    id: `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    userId,
    type,
    codeHash: hashCode(plainCode),
    expiresAt: Date.now() + ttlMs,
    attempts: 0,
    maxAttempts,
    used: false,
    createdAt: new Date().toISOString(),
  };

  codes.push(entry);
  await saveCodes(codes);

  cleanupExpired();

  return { id: entry.id, plainCode, expiresAt: entry.expiresAt };
}

async function verifyCode(userId, type, inputCode, invalidateAfterUse = true) {
  const codes = await getCodes();
  const inputHash = hashCode(inputCode);
  const now = Date.now();

  const match = codes.find(c =>
    c.userId === userId &&
    c.type === type &&
    c.codeHash === inputHash &&
    !c.used
  );

  if (!match) return { valid: false, reason: 'Codigo invalido' };

  if (now > match.expiresAt) return { valid: false, reason: 'Codigo expirado' };

  if (match.attempts >= match.maxAttempts) return { valid: false, reason: 'Demasiados intentos. Solicita un nuevo codigo.' };

  match.attempts += 1;

  const valid = match.codeHash === inputHash;

  if (valid) {
    if (invalidateAfterUse) match.used = true;
    match.attempts = 0;
    await saveCodes(codes);
    return { valid: true, entry: match };
  }

  await saveCodes(codes);
  return { valid: false, reason: 'Codigo invalido' };
}

async function cleanupExpired() {
  const codes = await getCodes();
  const now = Date.now();
  const filtered = codes.filter(c => !c.expiresAt || now < c.expiresAt);
  if (filtered.length < codes.length) {
    await saveCodes(filtered);
  }
}

async function hasPendingCode(userId, type) {
  const codes = await getCodes();
  const now = Date.now();
  const pending = codes.find(c =>
    c.userId === userId &&
    c.type === type &&
    !c.used &&
    now < c.expiresAt
  );
  return !!pending;
}

async function invalidateUserCodes(userId, type) {
  const codes = await getCodes();
  for (const c of codes) {
    if (c.userId === userId && c.type === type) {
      c.used = true;
    }
  }
  await saveCodes(codes);
}

module.exports = {
  generateCode,
  hashCode,
  getCodes,
  saveCodes,
  createCode,
  verifyCode,
  cleanupExpired,
  hasPendingCode,
  invalidateUserCodes,
};
