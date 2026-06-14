'use strict';

/**
 * Persistence layer — abstracts storage between file system and Upstash Redis.
 *
 * In production (Vercel): uses Upstash Redis via KV_REST_API_URL env var.
 * In development/local: uses file-based JSON storage (existing behavior).
 */

const path = require('node:path');
const { readJsonFile, writeJsonFile } = require('./jsonStoreHelper');
const { logger } = require('../utils/logger');

// ── Redis client (lazy init) ──
let redis = null;

function getRedis() {
  if (redis) return redis;
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const { Redis } = require('@upstash/redis');
    redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
    logger.info('Using Upstash Redis for persistence');
  }
  return redis;
}

function isRedisAvailable() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

// ── File paths (used as Redis keys) ──
const DATA_DIR = path.resolve(__dirname, '..', '..');
const ROOMS_KEY = 'data:rooms';
const CONSUMOS_KEY = 'data:consumos';
const USERS_KEY = 'data:users';
const HISTORY_KEY = 'data:history';
const STATE_HISTORY_KEY = 'data:stateHistory';
const PRICES_KEY = 'data:prices';
const RESERVAS_KEY = 'data:reservas';
const CODES_KEY = 'data:codes';
const SECURITY_ATTEMPTS_KEY = 'data:security:attempts';
const SECURITY_EVENTS_KEY = 'data:security:events';
const STATE_KEY = 'data:state';

// ── In-memory fallback (for serverless where Redis is unavailable) ──
const memoryStore = new Map();

// Track which keys have been lazily bootstrapped from files
// Use a Map of promises to prevent concurrent bootstrap races
const bootstrapped = new Map();

// Per-key write lock to prevent lost updates (concurrent read-modify-write).
// Each key has a promise chain; setData adds to the chain serially.
const writeLocks = new Map();
function withWriteLock(key, fn) {
  if (!writeLocks.has(key)) writeLocks.set(key, Promise.resolve());
  const prev = writeLocks.get(key);
  const next = prev.then(fn, fn);
  writeLocks.set(key, next);
  return next;
}

// ── Public API ──

async function getData(key, defaultVal = null) {
  const r = getRedis();
  if (r) {
    try {
      const val = await r.get(key);
      if (val !== null && val !== undefined) return val;
    } catch (err) {
      logger.warn({ err, key }, 'Redis get failed, falling back to memory');
    }
  }
  // Check in-memory fallback
  if (memoryStore.has(key)) return memoryStore.get(key);

  // Lazy bootstrap: seed from file (also runs without Redis for local dev)
  // Use promise-based dedup to prevent race conditions between concurrent requests
  if (!bootstrapped.has(key)) {
    bootstrapped.set(
      key,
      (async () => {
        const file = fileForKey(key);
        if (file) {
          try {
            const data = await readJsonFile(file, null);
            if (data !== null) {
              memoryStore.set(key, data);
              if (r) {
                await r.set(key, data).catch(() => {});
              }
              logger.info(`Lazy-seeded ${key} from ${path.basename(file)}`);
              return data;
            }
          } catch {
            // File missing or unreadable, use default
          }
        }
        return defaultVal;
      })()
    );
  }

  const result = await bootstrapped.get(key);
  // Return from memoryStore in case another call set it while we waited
  if (memoryStore.has(key)) return memoryStore.get(key);
  return result;
}

async function _setData(key, data) {
  const r = getRedis();
  let redisOk = false;
  if (r) {
    try {
      await r.set(key, data);
      redisOk = true;
    } catch (err) {
      logger.warn({ err, key }, 'Redis set failed');
    }
  }
  // Fallback: persist to JSON file for restart resilience
  const file = fileForKey(key);
  let fileOk = false;
  if (file) {
    try {
      await writeJsonFile(file, data);
      fileOk = true;
    } catch (err) {
      logger.warn({ err, key, file }, 'File write failed');
    }
  }
  // Only update in-memory if at least one persistent store succeeded
  if (redisOk || fileOk || (!r && file)) {
    memoryStore.set(key, data);
  } else if (memoryStore.has(key)) {
    logger.warn(
      { key },
      'All persistent stores failed — keeping previous in-memory state'
    );
  }
}

async function setData(key, data) {
  return withWriteLock(key, () => _setData(key, data));
}

async function _delData(key) {
  memoryStore.delete(key);
  const r = getRedis();
  if (r) {
    try {
      await r.del(key);
    } catch (err) {
      logger.warn({ err, key }, 'Redis del failed');
    }
  }
}

// ── Map Redis keys back to file paths for lazy bootstrap ──
function fileForKey(key) {
  const map = {
    [ROOMS_KEY]: 'rooms.json',
    [CONSUMOS_KEY]: 'consumos.json',
    [USERS_KEY]: 'users.json',
    [HISTORY_KEY]: 'history.json',
    [STATE_HISTORY_KEY]: 'stateHistory.json',
    [PRICES_KEY]: 'prices.json',
    [RESERVAS_KEY]: 'reservas.json',
    [CODES_KEY]: 'codes.json',
    [SECURITY_ATTEMPTS_KEY]: 'security-attempts.json',
    [SECURITY_EVENTS_KEY]: 'security-events.json',
    [STATE_KEY]: 'state.json',
  };
  const name = map[key];
  return name ? path.join(DATA_DIR, name) : null;
}

// ── Key-specific helpers ──

async function getRooms() {
  return getData(ROOMS_KEY, []);
}
async function setRooms(data) {
  return setData(ROOMS_KEY, data);
}

async function getConsumos() {
  return getData(CONSUMOS_KEY, []);
}
async function setConsumos(data) {
  return setData(CONSUMOS_KEY, data);
}

async function getUsers() {
  return getData(USERS_KEY, []);
}
async function setUsers(data) {
  return setData(USERS_KEY, data);
}

async function getHistory() {
  return getData(HISTORY_KEY, {});
}
async function setHistory(data) {
  return setData(HISTORY_KEY, data);
}

// StateHistory is stored as raw cambios array (not wrapped in {cambios})
async function getStateHistory() {
  return getData(STATE_HISTORY_KEY, []);
}
async function setStateHistory(data) {
  return setData(STATE_HISTORY_KEY, data);
}

async function getPrices() {
  return getData(PRICES_KEY, {});
}
async function setPrices(data) {
  return setData(PRICES_KEY, data);
}

async function getReservas() {
  return getData(RESERVAS_KEY, []);
}
async function setReservas(data) {
  return setData(RESERVAS_KEY, data);
}

async function getCodes() {
  return getData(CODES_KEY, []);
}
async function setCodes(data) {
  return setData(CODES_KEY, data);
}

async function getSecurityAttempts() {
  return getData(SECURITY_ATTEMPTS_KEY, []);
}
async function setSecurityAttempts(data) {
  return setData(SECURITY_ATTEMPTS_KEY, data);
}

async function getSecurityEvents() {
  return getData(SECURITY_EVENTS_KEY, []);
}
async function setSecurityEvents(data) {
  return setData(SECURITY_EVENTS_KEY, data);
}

async function getState() {
  return getData(STATE_KEY, {});
}
async function setState(data) {
  return setData(STATE_KEY, data);
}

// ── Bootstrap: seed from JSON files on first run (Redis cold start) ──
async function bootstrapFromFiles() {
  if (!isRedisAvailable()) return;
  const r = getRedis();
  if (!r) return;

  const fileKeyPairs = [
    { file: path.join(DATA_DIR, 'rooms.json'), key: ROOMS_KEY },
    { file: path.join(DATA_DIR, 'consumos.json'), key: CONSUMOS_KEY },
    { file: path.join(DATA_DIR, 'users.json'), key: USERS_KEY },
    { file: path.join(DATA_DIR, 'history.json'), key: HISTORY_KEY },
    { file: path.join(DATA_DIR, 'stateHistory.json'), key: STATE_HISTORY_KEY },
    { file: path.join(DATA_DIR, 'prices.json'), key: PRICES_KEY },
    { file: path.join(DATA_DIR, 'reservas.json'), key: RESERVAS_KEY },
    { file: path.join(DATA_DIR, 'codes.json'), key: CODES_KEY },
  ];

  for (const { file, key } of fileKeyPairs) {
    try {
      const exists = await r.exists(key);
      if (!exists) {
        const data = await readJsonFile(file, null);
        if (data !== null) {
          await r.set(key, data);
          logger.info(`Seeded Redis key ${key} from ${path.basename(file)}`);
        }
      }
    } catch (err) {
      logger.warn({ err, key }, 'Failed to seed Redis key from file');
    }
  }

  // Security files (might not exist)
  for (const { file, key } of [
    {
      file: path.join(DATA_DIR, 'security-attempts.json'),
      key: SECURITY_ATTEMPTS_KEY,
    },
    {
      file: path.join(DATA_DIR, 'security-events.json'),
      key: SECURITY_EVENTS_KEY,
    },
    { file: path.join(DATA_DIR, 'state.json'), key: STATE_KEY },
  ]) {
    try {
      const exists = await r.exists(key);
      if (!exists) {
        const data = await readJsonFile(file, null);
        if (data !== null) {
          await r.set(key, data);
        }
      }
    } catch {
      // Ignore missing files
    }
  }
}

module.exports = {
  isRedisAvailable,
  bootstrapFromFiles,
  getRooms,
  setRooms,
  getConsumos,
  setConsumos,
  getUsers,
  setUsers,
  getHistory,
  setHistory,
  getStateHistory,
  setStateHistory,
  getPrices,
  setPrices,
  getReservas,
  setReservas,
  getCodes,
  setCodes,
  getSecurityAttempts,
  setSecurityAttempts,
  getSecurityEvents,
  setSecurityEvents,
  getState,
  setState,
  ROOMS_KEY,
  CONSUMOS_KEY,
  USERS_KEY,
};
