'use strict';

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Resolve data directory securely - MUST be within backend/
const DATA_DIR = path.resolve(__dirname, '..', '..');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

// Ensure paths are within expected directory (prevent path traversal)
function validatePath(filePath) {
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(DATA_DIR)) {
    throw new Error('Path traversal detected: file path must be within data directory');
  }
  return resolved;
}

const ROOMS_FILE = validatePath(path.join(DATA_DIR, 'rooms.json'));
const CONSUMOS_FILE = validatePath(path.join(DATA_DIR, 'consumos.json'));
const HISTORY_FILE = validatePath(path.join(DATA_DIR, 'history.json'));
const STATE_HISTORY_FILE = validatePath(path.join(DATA_DIR, 'stateHistory.json'));

// ── Backup management ──
const MAX_BACKUPS = 5; // Keep last 5 backups per file

async function ensureBackupDir() {
  try {
    await fs.access(BACKUP_DIR);
  } catch {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  }
}

function getBackupPath(filePath) {
  const baseName = path.basename(filePath, '.json');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(BACKUP_DIR, `${baseName}_${timestamp}.json`);
}

async function createBackup(filePath) {
  try {
    await ensureBackupDir();
    const exists = fsSync.existsSync(filePath);
    if (!exists) return; // Nothing to backup

    const data = await fs.readFile(filePath, 'utf-8');
    const backupPath = getBackupPath(filePath);
    await fs.writeFile(backupPath, data, 'utf-8');

    // Clean old backups
    await cleanupOldBackups(path.basename(filePath, '.json'));
  } catch (err) {
    // Log but don't fail - backup is best-effort
    logger.error('Backup creation failed', { file: filePath, error: err.message });
  }
}

async function cleanupOldBackups(filePrefix) {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const prefixBackups = files
      .filter(f => f.startsWith(filePrefix) && f.endsWith('.json'))
      .sort()
      .reverse(); // Newest first

    // Remove backups beyond MAX_BACKUPS
    const toDelete = prefixBackups.slice(MAX_BACKUPS);
    for (const file of toDelete) {
      await fs.unlink(path.join(BACKUP_DIR, file));
    }
  } catch (err) {
    logger.error('Backup cleanup failed', { error: err.message });
  }
}

// ── Async file locking ──
const fileLocks = new Map();

async function acquireLock(filePath) {
  if (!fileLocks.has(filePath)) {
    fileLocks.set(filePath, false);
  }
  // Spin-wait with micro-delay if file is locked
  while (fileLocks.get(filePath)) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  fileLocks.set(filePath, true);
}

function releaseLock(filePath) {
  fileLocks.set(filePath, false);
}

// ── In-memory cache with invalidation on write ──
const cache = new Map();
const CACHE_TTL = 5000; // 5 seconds for frequently accessed data
const cacheExpiry = new Map();

function getFromCache(key) {
  if (cache.has(key)) {
    const expired = Date.now() > cacheExpiry.get(key);
    if (expired) {
      cache.delete(key);
      cacheExpiry.delete(key);
      return null;
    }
    return cache.get(key);
  }
  return null;
}

function setInCache(key, value, ttl = CACHE_TTL) {
  cache.set(key, value);
  cacheExpiry.set(key, Date.now() + ttl);
}

function invalidateCache(key) {
  cache.delete(key);
  cacheExpiry.delete(key);
}

// ── Integrity validation ──
function validateJSONData(data, expectedType = 'array') {
  if (data === null || data === undefined) {
    return expectedType === 'object' ? {} : [];
  }

  if (expectedType === 'array' && !Array.isArray(data)) {
    logger.warn('JSON data integrity issue: expected array', { actualType: typeof data });
    return [];
  }

  if (expectedType === 'object' && (typeof data !== 'object' || Array.isArray(data))) {
    logger.warn('JSON data integrity issue: expected object', { actualType: typeof data });
    return {};
  }

  return data;
}

// ── Async read/write ──
async function readJSON(filePath, expectedType = 'array') {
  try {
    const validatedPath = validatePath(filePath);
    const data = await fs.readFile(validatedPath, 'utf-8');

    if (!data || data.trim() === '') {
      return expectedType === 'object' ? {} : [];
    }

    const parsed = JSON.parse(data);
    return validateJSONData(parsed, expectedType);
  } catch (err) {
    // File not found is not an error for first run
    if (err.code === 'ENOENT') {
      return expectedType === 'object' ? {} : [];
    }
    logger.error('Failed to read JSON file', { file: filePath, error: err.message });
    return expectedType === 'object' ? {} : [];
  }
}

async function writeJSON(filePath, data) {
  const validatedPath = validatePath(filePath);

  // Validate data before writing
  if (data === undefined || data === null) {
    logger.error('Attempted to write null/undefined data', { file: filePath });
    throw new Error('Invalid data: cannot write null or undefined');
  }

  // Create backup before write
  await createBackup(validatedPath);

  await acquireLock(validatedPath);
  try {
    // Serialize with validation
    const serialized = JSON.stringify(data, null, 2);

    // Verify the serialized data is valid JSON (catch corruption)
    JSON.parse(serialized);

    // Atomic write: write to temp file, then rename
    const tempFile = validatedPath + '.tmp';
    await fs.writeFile(tempFile, serialized, 'utf-8');
    await fs.rename(tempFile, validatedPath);
  } catch (err) {
    logger.error('Failed to write JSON file', { file: filePath, error: err.message });
    throw err;
  } finally {
    releaseLock(validatedPath);
  }
}

// ── Rooms (cached) ──
async function getRooms() {
  const cached = getFromCache('rooms');
  if (cached !== null) return cached;
  const rooms = await readJSON(ROOMS_FILE, 'array');
  setInCache('rooms', rooms);
  return rooms;
}

async function saveRooms(rooms) {
  await writeJSON(ROOMS_FILE, rooms);
  invalidateCache('rooms');
}

// ── Consumos (cached) ──
async function getConsumos() {
  const cached = getFromCache('consumos');
  if (cached !== null) return cached;
  const consumos = await readJSON(CONSUMOS_FILE, 'array');
  setInCache('consumos', consumos);
  return consumos;
}

async function saveConsumos(consumos) {
  await writeJSON(CONSUMOS_FILE, consumos);
  invalidateCache('consumos');
}

// ── History (not cached — write-heavy) ──
async function getHistory() {
  return readJSON(HISTORY_FILE, 'object');
}

async function saveHistory(history) {
  await writeJSON(HISTORY_FILE, history);
}

// ── State History (not cached — write-heavy) ──
async function getStateHistory() {
  const data = await readJSON(STATE_HISTORY_FILE, 'object');
  return data.cambios || [];
}

async function saveStateHistory(cambios) {
  await writeJSON(STATE_HISTORY_FILE, { cambios });
}

module.exports = {
  getRooms,
  saveRooms,
  getConsumos,
  saveConsumos,
  getHistory,
  saveHistory,
  getStateHistory,
  saveStateHistory,
  ROOMS_FILE,
  CONSUMOS_FILE,
  HISTORY_FILE,
  STATE_HISTORY_FILE,
  BACKUP_DIR,
  // Expose cache utilities for manual invalidation
  invalidateCache,
  setInCache,
};
