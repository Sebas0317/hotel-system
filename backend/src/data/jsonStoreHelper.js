'use strict';

const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

const DATA_DIR = path.resolve(__dirname, '..', '..');

function validatePath(filePath) {
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(DATA_DIR)) {
    throw new Error('Path traversal detected');
  }
  return resolved;
}

async function readJsonFile(filePath, defaultVal = null) {
  const resolved = validatePath(filePath);
  try {
    const raw = await fs.readFile(resolved, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return defaultVal;
    }
    logger.warn({ err, file: filePath }, 'Error reading JSON file');
    return defaultVal;
  }
}

async function writeJsonFile(filePath, data) {
  const resolved = validatePath(filePath);
  const tmp = resolved + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmp, resolved);
}

module.exports = { readJsonFile, writeJsonFile };
