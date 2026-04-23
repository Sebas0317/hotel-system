/**
 * Automated backup system using node-cron.
 * Backs up all JSON data files daily at 2:00 AM.
 * Keeps last 30 days of backups.
 */
'use strict';

const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');

const BACKUP_DIR = path.join(__dirname, '../../backups');
const DATA_DIR = path.join(__dirname, '../..');
const DATA_FILES = ['rooms.json', 'consumos.json', 'history.json', 'stateHistory.json', 'prices.json'];
const MAX_BACKUP_DAYS = 30;

/**
 * Create backup of all data files.
 */
async function createBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
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

    console.log(`[Backup] Created backup at ${timestamp}`);
    return { timestamp, results };
  } catch (error) {
    console.error('[Backup] Failed to create backup:', error.message);
    throw error;
  }
}

/**
 * Clean up old backups (keep only MAX_BACKUP_DAYS).
 */
async function cleanupOldBackups() {
  try {
    const backups = await fs.readdir(BACKUP_DIR);
    
    if (backups.length <= MAX_BACKUP_DAYS) {
      return; // No cleanup needed
    }

    // Sort by name (timestamp) and remove oldest
    const sorted = backups.sort();
    const toRemove = sorted.slice(0, sorted.length - MAX_BACKUP_DAYS);

    for (const dir of toRemove) {
      const backupPath = path.join(BACKUP_DIR, dir);
      await fs.rm(backupPath, { recursive: true, force: true });
      console.log(`[Backup] Removed old backup: ${dir}`);
    }
  } catch (error) {
    console.error('[Backup] Failed to cleanup old backups:', error.message);
  }
}

/**
 * List all available backups.
 */
async function listBackups() {
  try {
    const backups = await fs.readdir(BACKUP_DIR);
    return backups.sort().reverse();
  } catch (error) {
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

    console.log(`[Backup] Restored from ${timestamp}`);
    return { timestamp, results };
  } catch (error) {
    console.error('[Backup] Failed to restore backup:', error.message);
    throw error;
  }
}

// Schedule daily backup at 2:00 AM
cron.schedule('0 2 * * *', async () => {
  console.log('[Backup] Starting scheduled backup...');
  try {
    await createBackup();
    await cleanupOldBackups();
    console.log('[Backup] Scheduled backup completed');
  } catch (error) {
    console.error('[Backup] Scheduled backup failed:', error.message);
  }
});

// Export for manual trigger via API
module.exports = {
  createBackup,
  cleanupOldBackups,
  listBackups,
  restoreBackup,
};
