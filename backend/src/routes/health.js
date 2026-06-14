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
const { validateAll, repairFromBackup } = require('../utils/jsonValidator');

const startTime = Date.now();

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
router.get('/', (_req, res) => {
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
router.get('/detailed', async (_req, res) => {
  const uptimeMs = Date.now() - startTime;
  const memUsage = process.memoryUsage();

  // Use jsonValidator for file status (avoids direct fs.readFile)
  const integrity = await validateAll();

  res.json({
    status: integrity.overall ? 'healthy' : 'degraded',
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
    cache: { status: 'removed' },
    dataFiles: integrity.files,
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
router.get('/metrics', (_req, res) => {
  const memUsage = process.memoryUsage();

  res.json({
    timestamp: Date.now(),
    uptime: Date.now() - startTime,
    memory: {
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
    },
    cache: { status: 'removed' },
    cpu: process.cpuUsage(),
  });
});

/**
 * POST /health/json-integrity - Run JSON data integrity check
 */
router.post('/json-integrity', async (_req, res) => {
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
    res
      .status(500)
      .json({ error: 'Integrity check failed', message: err.message });
  }
});

module.exports = router;
