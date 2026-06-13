'use strict';

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { validateJSON, createBackup: createValidatorBackup, repairFromBackup } = require('../utils/jsonValidator');
const persistence = require('./persistence');

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
const MAX_BACKUPS = 5;

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
    if (!exists) return;

    const data = await fs.readFile(filePath, 'utf-8');
    const backupPath = getBackupPath(filePath);
    await fs.writeFile(backupPath, data, 'utf-8');
    await cleanupOldBackups(path.basename(filePath, '.json'));
  } catch (err) {
    logger.error('Backup creation failed', { file: filePath, error: err.message });
  }
}

async function cleanupOldBackups(filePrefix) {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const prefixBackups = files
      .filter(f => f.startsWith(filePrefix) && f.endsWith('.json'))
      .sort()
      .reverse();
    const toDelete = prefixBackups.slice(MAX_BACKUPS);
    for (const file of toDelete) {
      await fs.unlink(path.join(BACKUP_DIR, file));
    }
  } catch (err) {
    logger.error('Backup cleanup failed', { error: err.message });
  }
}

// ── High-performance file locking with a promise queue ──
const writeQueues = new Map();

async function enqueueTask(filePath, task) {
  if (!writeQueues.has(filePath)) {
    writeQueues.set(filePath, Promise.resolve());
  }
  const previousTask = writeQueues.get(filePath);
  const newTask = previousTask.then(task);
  writeQueues.set(filePath, newTask);
  return newTask;
}

// ── In-memory Store (serves as primary, file is persistence layer) ──
const persistentCache = new Map();
const isCacheLoaded = new Map();

async function getCachedData(filePath, expectedType) {
  if (isCacheLoaded.get(filePath)) {
    return persistentCache.get(filePath);
  }

  const data = await readJSON(filePath, expectedType);
  persistentCache.set(filePath, data);
  isCacheLoaded.set(filePath, true);
  return data;
}

function invalidateCache(filePath) {
  isCacheLoaded.set(filePath, false);
}

function setInCache(filePath, data) {
  persistentCache.set(filePath, data);
  isCacheLoaded.set(filePath, true);
}

function validateJSONData(data, expectedType) {
  if (expectedType === 'array') {
    return Array.isArray(data) ? data : [];
  }
  if (expectedType === 'object') {
    return (data && typeof data === 'object' && !Array.isArray(data)) ? data : {};
  }
  return data;
}

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
    if (err.code === 'ENOENT') {
      return expectedType === 'object' ? {} : [];
    }
    logger.error('Failed to read JSON file', { file: filePath, error: err.message });
    return expectedType === 'object' ? {} : [];
  }
}

async function writeJSON(filePath, data) {
  const validatedPath = validatePath(filePath);

  if (data === undefined || data === null) {
    throw new Error('Invalid data: cannot write null or undefined');
  }

  return enqueueTask(validatedPath, async () => {
    try {
      await createBackup(validatedPath);
      const serialized = JSON.stringify(data, null, 2);
      const tempFile = validatedPath + '.tmp';
      await fs.writeFile(tempFile, serialized, 'utf-8');
      await fs.rename(tempFile, validatedPath);

      persistentCache.set(validatedPath, data);
      isCacheLoaded.set(validatedPath, true);
    } catch (err) {
      logger.warn('Failed to write JSON file (read-only filesystem?)', { file: filePath, error: err.message });
    }
  });
}

// ── Rooms (optimized) ──
async function getRooms() {
  if (persistence.isRedisAvailable()) {
    return persistence.getRooms();
  }
  return getCachedData(ROOMS_FILE, 'array');
}

async function saveRooms(rooms) {
  if (persistence.isRedisAvailable()) {
    return persistence.setRooms(rooms);
  }
  return writeJSON(ROOMS_FILE, rooms);
}

// ── Consumos (optimized) ──
async function getConsumos() {
  if (persistence.isRedisAvailable()) {
    return persistence.getConsumos();
  }
  return getCachedData(CONSUMOS_FILE, 'array');
}

async function saveConsumos(consumos) {
  if (persistence.isRedisAvailable()) {
    return persistence.setConsumos(consumos);
  }
  return writeJSON(CONSUMOS_FILE, consumos);
}

// ── History ──
async function getHistory() {
  if (persistence.isRedisAvailable()) {
    return persistence.getHistory();
  }
  return readJSON(HISTORY_FILE, 'object');
}

async function saveHistory(history) {
  if (persistence.isRedisAvailable()) {
    return persistence.setHistory(history);
  }
  await writeJSON(HISTORY_FILE, history);
}

// ── State History ──
async function getStateHistory() {
  if (persistence.isRedisAvailable()) {
    return persistence.getStateHistory();
  }
  const data = await readJSON(STATE_HISTORY_FILE, 'object');
  return data.cambios || [];
}

async function saveStateHistory(cambios) {
  if (persistence.isRedisAvailable()) {
    return persistence.setStateHistory(cambios);
  }
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
  invalidateCache,
  setInCache,
};
