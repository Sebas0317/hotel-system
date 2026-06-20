/**
 * Automated backup system using node-cron.
 * Backs up all JSON data files daily at 2:00 AM.
 * Keeps last 30 days of backups.
 */
'use strict';

const cron = require('node-cron');
const fs = require('node:fs').promises;
const path = require('node:path');
const { logger } = require('./logger');
// Simple in‑process mutex to serialize backup runs
let backupLock = Promise.resolve();
function queueBackup(fn) {
  // Ensure any error does not break the chain
  backupLock = backupLock.then(() => fn()).catch(() => fn());
  return backupLock;
}

const BACKUP_DIR = path.join(__dirname, '../../backups');
const DATA_DIR = path.join(__dirname, '../..');
const DATA_FILES = [
  'rooms.json',
  'consumos.json',
  'history.json',
  'stateHistory.json',
  'prices.json',
  'users.json',
  'reservas.json',
  'codes.json',
];
const MAX_BACKUP_DAYS = 30;

/**
 * Create backup of all data files.
 */
async function _createBackup() {
  try {
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 19);
    const backupDir = path.join(BACKUP_DIR, timestamp);

    // Create backup directory
    await fs.mkdir(backupDir, { recursive: true });

    // Copy each data file
    const results = [];
    for (const file of DATA_FILES) {
      const src = path.join(DATA_DIR, file);
      const dest = path.join(backupDir, file);

      try {
        await fs.copyFile(src, dest);
        results.push({ file, status: 'success' });
      } catch (err) {
        results.push({ file, status: 'error', error: err.message });
      }
    }

    logger.info({ timestamp }, 'Backup created');
    return { timestamp, results };
  } catch (error) {
    logger.error({ err: error }, 'Backup creation failed');
    throw error;
  }
}

/**
 * Clean up old backups (keep only MAX_BACKUP_DAYS).
 */
async function cleanupOldBackups() {
  try {
    const backups = await fs.readdir(BACKUP_DIR);
    const backupDirs = backups.filter((b) => /^\d{4}-\d{2}-\d{2}T/.test(b));

    if (backupDirs.length <= MAX_BACKUP_DAYS) {
      return; // No cleanup needed
    }

    // Sort by name (timestamp) and remove oldest
    const sorted = backupDirs.sort();
    const toRemove = sorted.slice(0, sorted.length - MAX_BACKUP_DAYS);

    for (const dir of toRemove) {
      const backupPath = path.join(BACKUP_DIR, dir);
      await fs.rm(backupPath, { recursive: true, force: true });
      logger.info({ dir }, 'Removed old backup');
    }
  } catch (error) {
    logger.error({ err: error }, 'Backup cleanup failed');
  }
}

/**
 * List all available backups.
 */
async function listBackups() {
  try {
    const backups = await fs.readdir(BACKUP_DIR);
    return backups.sort().reverse();
  } catch (_error) {
    return [];
  }
}

/**
 * Restore from a specific backup.
 */
async function restoreBackup(timestamp) {
  try {
    const backupDir = path.join(BACKUP_DIR, timestamp);

    // Verify backup exists
    await fs.access(backupDir);

    const results = [];
    for (const file of DATA_FILES) {
      const src = path.join(backupDir, file);
      const dest = path.join(DATA_DIR, file);

      try {
        await fs.copyFile(src, dest);
        results.push({ file, status: 'restored' });
      } catch (err) {
        results.push({ file, status: 'error', error: err.message });
      }
    }

    logger.info({ timestamp }, 'Backup restored');
    return { timestamp, results };
  } catch (error) {
    logger.error({ err: error }, 'Backup restore failed');
    throw error;
  }
}

// Public wrapper that ensures backup runs sequentially
function createBackup() {
  return queueBackup(_createBackup);
}

// Schedule daily backup at 2:00 AM
if (process.env.NODE_ENV !== 'test') {
  cron.schedule('0 2 * * *', async () => {
    logger.info('Starting scheduled backup');
    try {
      await createBackup();
      await cleanupOldBackups();
      logger.info('Scheduled backup completed');
    } catch (error) {
      logger.error({ err: error }, 'Scheduled backup failed');
    }
  });
}

// Export for manual trigger via API
module.exports = {
  createBackup,
  cleanupOldBackups,
  listBackups,
  restoreBackup,
};
