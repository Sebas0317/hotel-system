'use strict';

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const ROOMS_FILE = path.join(__dirname, '..', '..', 'rooms.json');
const CONSUMOS_FILE = path.join(__dirname, '..', '..', 'consumos.json');

const fileLocks = new Map();

function acquireLock(filePath) {
  if (!fileLocks.has(filePath)) {
    fileLocks.set(filePath, false);
  }
  if (fileLocks.get(filePath)) {
    throw new Error('File is currently being written to, please retry');
  }
  fileLocks.set(filePath, true);
}

function releaseLock(filePath) {
  fileLocks.set(filePath, false);
}

function readJSON(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return data ? JSON.parse(data) : [];
  } catch (err) {
    logger.error('Failed to read JSON file', { file: filePath, error: err.message });
    return [];
  }
}

function writeJSON(filePath, data) {
  acquireLock(filePath);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } finally {
    releaseLock(filePath);
  }
}

function getRooms() {
  return readJSON(ROOMS_FILE);
}

function saveRooms(rooms) {
  writeJSON(ROOMS_FILE, rooms);
}

function getConsumos() {
  return readJSON(CONSUMOS_FILE);
}

function saveConsumos(consumos) {
  writeJSON(CONSUMOS_FILE, consumos);
}

module.exports = {
  getRooms,
  saveRooms,
  getConsumos,
  saveConsumos,
  ROOMS_FILE,
  CONSUMOS_FILE,
};
