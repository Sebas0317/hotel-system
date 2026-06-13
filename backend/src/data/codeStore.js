'use strict';

const crypto = require('crypto');
const path = require('path');
const { readJsonFile, writeJsonFile } = require('./jsonStoreHelper');
const { logger } = require('../utils/logger');

const CODES_FILE = path.join(__dirname, '../../codes.json');

// In-memory store as primary — file-based persistence as backup.
// This ensures codes work even on read-only filesystems (Vercel serverless).
const memoryStore = new Map();

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
  try {
    await writeJsonFile(CODES_FILE, codes);
  } catch {
    // File persistence is best-effort
  }
}

async function createCode({ userId, type, ttlMs = 300000, maxAttempts = 5 }) {
  const plainCode = generateCode(6);
  const now = Date.now();

  const entry = {
    id: `${now}-${crypto.randomBytes(4).toString('hex')}`,
    userId,
    type,
    codeHash: hashCode(plainCode),
    expiresAt: now + ttlMs,
    attempts: 0,
    maxAttempts,
    used: false,
    createdAt: new Date().toISOString(),
  };

  // Save to memory immediately
  const key = `${userId}:${type}:${entry.id}`;
  memoryStore.set(key, entry);

  // Persist to file asynchronously (best-effort)
  getCodes().then(codes => {
    codes.push(entry);
    saveCodes(codes);
  }).catch(() => {});

  cleanupExpired();

  return { id: entry.id, plainCode, expiresAt: entry.expiresAt };
}

async function verifyCode(userId, type, inputCode, invalidateAfterUse = true) {
  const inputHash = hashCode(inputCode);
  const now = Date.now();

  // Try in-memory first (fast path)
  for (const [key, entry] of memoryStore) {
    if (entry.userId === userId && entry.type === type && entry.codeHash === inputHash && !entry.used) {
      if (now > entry.expiresAt) return { valid: false, reason: 'Codigo expirado' };
      if (entry.attempts >= entry.maxAttempts) return { valid: false, reason: 'Demasiados intentos. Solicita un nuevo codigo.' };

      entry.attempts += 1;
      if (invalidateAfterUse) entry.used = true;
      entry.attempts = 0;

      // Persist update asynchronously (best-effort)
      getCodes().then(codes => {
        const idx = codes.findIndex(c => c.id === entry.id);
        if (idx !== -1) codes[idx] = entry;
        saveCodes(codes);
      }).catch(() => {});

      return { valid: true, entry };
    }
  }

  // Fallback: search file store
  const codes = await getCodes();
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
    // Sync to memory for fast subsequent lookups
    const key = `${userId}:${type}:${match.id}`;
    memoryStore.set(key, match);
    await saveCodes(codes);
    return { valid: true, entry: match };
  }

  await saveCodes(codes);
  return { valid: false, reason: 'Codigo invalido' };
}

function cleanupExpired() {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (now > entry.expiresAt || entry.used) {
      memoryStore.delete(key);
    }
  }
  // Also clean file store (async, best-effort)
  getCodes().then(codes => {
    const filtered = codes.filter(c => !c.expiresAt || now < c.expiresAt);
    if (filtered.length < codes.length) saveCodes(filtered);
  }).catch(() => {});
}

async function hasPendingCode(userId, type) {
  const now = Date.now();
  // Check memory first
  for (const [, entry] of memoryStore) {
    if (entry.userId === userId && entry.type === type && !entry.used && now < entry.expiresAt) {
      return true;
    }
  }
  // Fallback to file
  const codes = await getCodes();
  return codes.some(c => c.userId === userId && c.type === type && !c.used && now < c.expiresAt);
}

async function invalidateUserCodes(userId, type) {
  // Invalidate in memory
  for (const [key, entry] of memoryStore) {
    if (entry.userId === userId && entry.type === type) {
      entry.used = true;
    }
  }
  // Invalidate in file
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
