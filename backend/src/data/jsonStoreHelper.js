'use strict';

const fs = require('node:fs').promises;
const path = require('node:path');
const os = require('node:os');
const logger = require('../utils/logger');

const DEPLOY_DIR = path.resolve(__dirname, '..', '..');
const DATA_DIR = process.env.VERCEL_ENV
  ? path.join(os.tmpdir(), 'ecobosque-data')
  : DEPLOY_DIR;

// Ensure writable data dir exists (async, non-blocking)
fs.mkdir(DATA_DIR, { recursive: true }).catch(() => {});

function validatePath(filePath) {
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(DATA_DIR) && !resolved.startsWith(DEPLOY_DIR)) {
    throw new Error('Path traversal detected');
  }
  return resolved;
}

function deployPath(filePath) {
  const name = path.basename(filePath);
  return path.join(DEPLOY_DIR, name);
}

async function readJsonFile(filePath, defaultVal = null) {
  // On Vercel: try writable /tmp/ first, fall back to deployment directory
  const resolved = validatePath(filePath);
  try {
    const raw = await fs.readFile(resolved, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT' && DATA_DIR !== DEPLOY_DIR) {
      // File not in /tmp/ — try copying from deployment directory
      try {
        const src = deployPath(filePath);
        const raw = await fs.readFile(src, 'utf8');
        const data = JSON.parse(raw);
        // Seed /tmp/ for future writes
        await fs
          .writeFile(resolved, JSON.stringify(data, null, 2), 'utf8')
          .catch(() => {});
        logger.info(`Seeded ${path.basename(resolved)} from deployment dir`);
        return data;
      } catch {
        return defaultVal;
      }
    }
    if (err.code === 'ENOENT') {
      return defaultVal;
    }
    logger.warn({ err, file: filePath }, 'Error reading JSON file');
    return defaultVal;
  }
}

async function writeJsonFile(filePath, data) {
  const resolved = validatePath(filePath);
  const tmp = `${resolved}.tmp`;
  try {
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
    let fd = null;
    try {
      fd = await fs.open(tmp, 'r');
      if (process.platform !== 'win32') {
        await fd.sync();
      } else {
        logger.debug({ file: tmp }, 'fsync skipped on Windows');
      }
    } catch (syncErr) {
      logger.warn({ err: syncErr, file: tmp }, 'fsync skipped');
    } finally {
      if (fd) await fd.close().catch(() => {});
    }
    await fs.rename(tmp, resolved);
  } catch (err) {
    logger.warn({ err, file: filePath }, 'Error writing JSON file');
    throw err;
  }
}

module.exports = { readJsonFile, writeJsonFile };
