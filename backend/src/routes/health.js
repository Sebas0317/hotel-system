/**
 * Advanced health check endpoint for EcoBosque Hotel System.
 * Provides detailed system status including:
 * - API uptime
 * - Memory usage
 * - Cache statistics
 * - Database file status
 * - Rate limiter status
 * - JSON data integrity
 */
'use strict';

const express = require('express');
const router = express.Router();
const { cache, getCacheStats } = require('../middleware/cache');
const path = require('path');
const fs = require('fs').promises;
const { validateAll, repairFromBackup } = require('../utils/jsonValidator');

const startTime = Date.now();
const DATA_DIR = path.join(__dirname, '../..');
const DATA_FILES = ['rooms.json', 'consumos.json', 'history.json', 'stateHistory.json', 'prices.json'];

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Basic health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 uptime:
 *                   type: string
 *                   example: 2h 15m 30s
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/', (req, res) => {
  const uptimeMs = Date.now() - startTime;
  const hours = Math.floor(uptimeMs / (1000 * 60 * 60));
  const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((uptimeMs % (1000 * 60)) / 1000);

  res.json({
    status: 'healthy',
    uptime: `${hours}h ${minutes}m ${seconds}s`,
    timestamp: new Date().toISOString(),
  });
});

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     summary: Detailed health check with system metrics
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Detailed system health
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 uptime:
 *                   type: object
 *                 memory:
 *                   type: object
 *                 cache:
 *                   type: object
 *                 dataFiles:
 *                   type: object
 */
router.get('/detailed', async (req, res) => {
  const uptimeMs = Date.now() - startTime;
  const memUsage = process.memoryUsage();

  // Check data files
  const dataFilesStatus = {};
  for (const file of DATA_FILES) {
    try {
      const filePath = path.join(DATA_DIR, file);
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf-8');
      JSON.parse(content); // Verify valid JSON
      
      dataFilesStatus[file] = {
        exists: true,
        size: stats.size,
        lastModified: stats.mtime,
        valid: true,
      };
    } catch (error) {
      dataFilesStatus[file] = {
        exists: false,
        valid: false,
        error: error.message,
      };
    }
  }

  // Calculate overall health
  const allFilesValid = Object.values(dataFilesStatus).every(f => f.valid);
  const overallStatus = allFilesValid ? 'healthy' : 'degraded';

  res.json({
    status: overallStatus,
    uptime: {
      ms: uptimeMs,
      human: `${Math.floor(uptimeMs / (1000 * 60 * 60))}h ${Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60))}m ${Math.floor((uptimeMs % (1000 * 60)) / 1000)}s`,
    },
    memory: {
      rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      external: `${(memUsage.external / 1024 / 1024).toFixed(2)} MB`,
    },
    cache: getCacheStats(),
    dataFiles: dataFilesStatus,
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * @swagger
 * /health/metrics:
 *   get:
 *     summary: System metrics for monitoring
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System metrics
 */
router.get('/metrics', (req, res) => {
  const memUsage = process.memoryUsage();

  res.json({
    timestamp: Date.now(),
    uptime: Date.now() - startTime,
    memory: {
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
    },
    cache: {
      keys: cache.keys().length,
      stats: cache.getStats(),
    },
    cpu: process.cpuUsage(),
  });
});

/**
 * POST /health/json-integrity - Run JSON data integrity check
 */
router.post('/json-integrity', async (req, res) => {
  try {
    const report = await validateAll();
    const repairResults = {};

    // Auto-repair any invalid files
    for (const [file, info] of Object.entries(report.files)) {
      if (!info.valid && info.exists) {
        const repair = await repairFromBackup(file);
        repairResults[file] = repair;
      }
    }

    res.json({
      timestamp: new Date().toISOString(),
      report,
      repairs: repairResults,
    });
  } catch (err) {
    res.status(500).json({ error: 'Integrity check failed', message: err.message });
  }
});

module.exports = router;
