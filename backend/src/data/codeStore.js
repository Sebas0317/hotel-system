'use strict';

const crypto = require('node:crypto');
const { logger } = require('../utils/logger');
const persistence = require('./persistence');

// In-memory store as primary — persistence module as backup.
const memoryStore = new Map();

// Simple promise-chain lock to prevent race conditions on persistence operations
let persistenceLock = Promise.resolve();
function withPersistenceLock(fn) {
  persistenceLock = persistenceLock.then(fn, (err) => {
    logger.warn({ err }, 'Persistence lock operation failed');
  });
  return persistenceLock;
}

// Per-code-entry lock to prevent race conditions on attempt counting (C20)
const codeLocks = new Map();
function withCodeLock(entryId, fn) {
  const key = entryId || '_global';
  if (!codeLocks.has(key)) codeLocks.set(key, Promise.resolve());
  const prev = codeLocks.get(key);
  const next = prev.then(fn, fn);
  codeLocks.set(key, next);
  return next;
}

function generateCode(length = 6) {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes)
    .map((b) => {
      // Rejection sampling to avoid modulo bias (256 not divisible by 10)
      let v = b;
      while (v >= 250) {
        v = crypto.randomBytes(1)[0];
      }
      return (v % 10).toString();
    })
    .join('');
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

  // Persist to file/Redis (race-safe via promise-chain lock)
  await withPersistenceLock(async () => {
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

  // Try in-memory first (fast path) — search newest first to match persistent behavior
  const memEntries = [...memoryStore].reverse();
  for (const [key, entry] of memEntries) {
    if (entry.userId === userId && entry.type === type && !entry.used) {
      if (now > entry.expiresAt)
        return { valid: false, reason: 'Codigo expirado' };

      // Serialize attempt tracking to prevent race condition (C20)
      return withCodeLock(entry.id, async () => {
        // Re-read entry from memory after acquiring lock
        const currentEntry = memoryStore.get(key);
        if (!currentEntry || currentEntry.used)
          return { valid: false, reason: 'Codigo invalido' };
        if (currentEntry.attempts >= currentEntry.maxAttempts) {
          logger.warn(
            { userId: currentEntry.userId, type: currentEntry.type },
            'Code max attempts reached'
          );
          return {
            valid: false,
            reason: 'Demasiados intentos. Solicita un nuevo codigo.',
          };
        }

        currentEntry.attempts += 1;

        if (currentEntry.codeHash === inputHash) {
          if (invalidateAfterUse) currentEntry.used = true;
          currentEntry.attempts = 0;
          await withPersistenceLock(async () => {
            try {
              const codes = await getCodes();
              const idx = codes.findIndex((c) => c.id === currentEntry.id);
              if (idx !== -1) codes[idx] = currentEntry;
              await saveCodes(codes);
            } catch (err) {
              logger.warn({ err }, 'Failed to persist code update');
            }
          });
          return { valid: true, entry: currentEntry };
        }

        // Wrong code — persist attempt count
        await withPersistenceLock(async () => {
          try {
            const codes = await getCodes();
            const idx = codes.findIndex((c) => c.id === currentEntry.id);
            if (idx !== -1) codes[idx] = currentEntry;
            await saveCodes(codes);
          } catch (err) {
            logger.warn({ err }, 'Failed to persist code attempt');
          }
        });

        return { valid: false, reason: 'Codigo invalido' };
      });
    }
  }

  // Fallback: search persistent store (file or Redis)
  const codes = await getCodes();

  // Find the most recent matching entry by userId+type (regardless of hash)
  const match = [...codes]
    .reverse()
    .find((c) => c.userId === userId && c.type === type && !c.used);

  if (!match) return { valid: false, reason: 'Codigo invalido o expirado' };

  // Serialize attempt counting to prevent race condition (D27)
  return withCodeLock(match.id, async () => {
    const freshCodes = await getCodes();
    const freshMatch = freshCodes.find((c) => c.id === match.id);
    if (!freshMatch || freshMatch.used)
      return { valid: false, reason: 'Codigo invalido' };
    if (now > freshMatch.expiresAt)
      return { valid: false, reason: 'Codigo expirado' };
    if (freshMatch.attempts >= freshMatch.maxAttempts) {
      logger.warn(
        { userId: freshMatch.userId, type: freshMatch.type },
        'Code max attempts reached'
      );
      return {
        valid: false,
        reason: 'Demasiados intentos. Solicita un nuevo codigo.',
      };
    }

    freshMatch.attempts += 1;

    const valid = freshMatch.codeHash === inputHash;

    if (valid) {
      if (invalidateAfterUse) freshMatch.used = true;
      freshMatch.attempts = 0;
      const key = `${userId}:${type}:${freshMatch.id}`;
      memoryStore.set(key, freshMatch);
      await saveCodes(freshCodes);
      return { valid: true, entry: freshMatch };
    }

    await saveCodes(freshCodes);
    return { valid: false, reason: 'Codigo invalido' };
  });
}

function cleanupExpired() {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (now > entry.expiresAt || entry.used) {
      memoryStore.delete(key);
    }
  }
  // Also clean persistent store (async, best-effort)
  getCodes()
    .then((codes) => {
      const filtered = codes.filter((c) => !c.expiresAt || now < c.expiresAt);
      if (filtered.length < codes.length) saveCodes(filtered);
    })
    .catch((err) => logger.error({ err }, 'Error cleaning up expired codes'));
}

async function hasPendingCode(userId, type) {
  const now = Date.now();
  // Check memory first
  for (const [, entry] of memoryStore) {
    if (
      entry.userId === userId &&
      entry.type === type &&
      !entry.used &&
      now < entry.expiresAt
    ) {
      return true;
    }
  }
  // Fallback to persistent store
  const codes = await getCodes();
  return codes.some(
    (c) =>
      c.userId === userId && c.type === type && !c.used && now < c.expiresAt
  );
}

async function invalidateUserCodes(userId, type) {
  // Invalidate in memory
  for (const [_key, entry] of memoryStore) {
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
