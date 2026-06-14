'use strict';

const crypto = require('crypto');
const { logger } = require('../utils/logger');
const persistence = require('./persistence');

// In-memory store as primary — persistence module as backup.
const memoryStore = new Map();

// Simple promise-chain lock to prevent race conditions on persistence operations
let persistenceLock = Promise.resolve();
function withPersistenceLock(fn) {
  persistenceLock = persistenceLock.then(fn, fn);
  return persistenceLock;
}

function generateCode(length = 6) {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes).map(b => (b % 10).toString()).join('');
}

function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

async function getCodes() {
  return persistence.getCodes();
}

async function saveCodes(codes) {
  return persistence.setCodes(codes);
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

  // Persist to file/Redis asynchronously (race-safe via promise-chain lock)
  withPersistenceLock(async () => {
    try {
      const codes = await getCodes();
      codes.push(entry);
      await saveCodes(codes);
    } catch (err) {
      logger.warn({ err }, 'Failed to persist code');
    }
  });

  cleanupExpired();

  return { id: entry.id, plainCode, expiresAt: entry.expiresAt };
}

async function verifyCode(userId, type, inputCode, invalidateAfterUse = true) {
  const inputHash = hashCode(inputCode);
  const now = Date.now();

  // Try in-memory first (fast path)
  for (const [key, entry] of memoryStore) {
    if (entry.userId === userId && entry.type === type && !entry.used) {
      if (now > entry.expiresAt) return { valid: false, reason: 'Codigo expirado' };
      if (entry.attempts >= entry.maxAttempts) {
        logger.warn({ userId: entry.userId, type: entry.type }, 'Code max attempts reached');
        return { valid: false, reason: 'Demasiados intentos. Solicita un nuevo codigo.' };
      }

      entry.attempts += 1;

      if (entry.codeHash === inputHash) {
        if (invalidateAfterUse) entry.used = true;
        entry.attempts = 0;
        withPersistenceLock(async () => {
          try {
            const codes = await getCodes();
            const idx = codes.findIndex(c => c.id === entry.id);
            if (idx !== -1) codes[idx] = entry;
            await saveCodes(codes);
          } catch (err) {
            logger.warn({ err }, 'Failed to persist code update');
          }
        });
        return { valid: true, entry };
      }

      // Wrong code — persist attempt count
      withPersistenceLock(async () => {
        try {
          const codes = await getCodes();
          const idx = codes.findIndex(c => c.id === entry.id);
          if (idx !== -1) codes[idx] = entry;
          await saveCodes(codes);
        } catch (err) {
          logger.warn({ err }, 'Failed to persist code attempt');
        }
      });

      return { valid: false, reason: 'Codigo invalido' };
    }
  }

  // Fallback: search persistent store (file or Redis)
  const codes = await getCodes();

  // Find the matching entry by userId+type (regardless of hash)
  const match = codes.find(c =>
    c.userId === userId &&
    c.type === type &&
    !c.used
  );

  if (!match) return { valid: false, reason: 'Codigo invalido o expirado' };
  if (now > match.expiresAt) return { valid: false, reason: 'Codigo expirado' };
  if (match.attempts >= match.maxAttempts) {
    logger.warn({ userId: match.userId, type: match.type }, 'Code max attempts reached');
    return { valid: false, reason: 'Demasiados intentos. Solicita un nuevo codigo.' };
  }

  match.attempts += 1;

  const valid = match.codeHash === inputHash;

  if (valid) {
    if (invalidateAfterUse) match.used = true;
    match.attempts = 0;
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
  // Also clean persistent store (async, best-effort)
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
  // Fallback to persistent store
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
  // Invalidate in persistent store
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
