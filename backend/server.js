'use strict';

/**
 * EcoBosque Hotel System - Backend Server
 * Modular architecture with separated routes, controllers, and data layer
 *
 * Entry point: Express app that wires together middleware and route modules
 *
 * IMPROVEMENTS IMPLEMENTED:
 * - Pino structured logging (replaces console.log)
 * - Zod validation schemas
 * - NodeCache in-memory caching
 * - Automated daily backups with node-cron
 * - Swagger/OpenAPI documentation
 * - Advanced health checks and metrics
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');

// Import logging
const { logger, httpLogger } = require('./src/utils/logger');

// Import caching
const { invalidateCache } = require('./src/middleware/cache');

// Import backups
const { createBackup } = require('./src/utils/backup');

// Import Swagger config
const swaggerSpecs = require('./src/config/swagger');

// Import middleware
const { requestLogger, errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');
const { requireAuth } = require('./src/middleware/auth');
const { sanitizeBody } = require('./src/middleware/sanitize');
const { requestTimeout } = require('./src/middleware/requestTimeout');
const { blockSensitiveFiles } = require('./src/middleware/blockSensitiveFiles');
const { securityHeaders } = require('./src/middleware/securityHeaders');
const {
  globalRateLimiter,
  authRateLimiter,
  readRateLimiter,
  writeRateLimiter,
  pinRateLimiter,
} = require('./src/middleware/rateLimiters');

// Import routes
const roomsRoutes = require('./src/routes/rooms');
const consumosRoutes = require('./src/routes/consumos');
const pricesRoutes = require('./src/routes/prices');
const authRoutes = require('./src/routes/auth');
const historyRoutes = require('./src/routes/history');
const stateHistoryRoutes = require('./src/routes/stateHistory');
const healthRoutes = require('./src/routes/health');
const accountingRoutes = require('./src/routes/accounting');

const app = express();
const PORT = process.env.PORT || 3001;

// Track server start time for health checks
const startTime = Date.now();

// ── SECURITY MIDDLEWARE ──

// Hide X-Powered-By header (Express default)
app.disable('x-powered-by');

// Helmet with strict security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Required for inline styles
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      workerSrc: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false, // Required for some frontend scenarios
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
}));

// ── CORS (strict) ──
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:4173'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (server-to-server, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 600, // Preflight cache for 10 minutes
}));

// ── REQUEST TIMEOUT (HTTP flood protection) ──
app.use(requestTimeout(30000)); // 30 second timeout

// ── BLOCK SENSITIVE FILE ACCESS ──
app.use(blockSensitiveFiles);

// ── ADDITIONAL SECURITY HEADERS ──
app.use(securityHeaders);

// ── RESPONSE COMPRESSION ──
app.use(compression());

// ── BODY PARSING (with size limits) ──
app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ extended: false, limit: '500kb' }));
app.use(sanitizeBody);

// ── RATE LIMITING ──
// Global rate limiter (applied to all routes)
app.use(globalRateLimiter);

// ── REQUEST LOGGING (Pino) ──
// Skip pino-http during tests to avoid Supertest conflicts
if (process.env.NODE_ENV !== 'test') {
  app.use(httpLogger);
}

// ── SWAGGER API DOCUMENTATION ──
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'EcoBosque Hotel API Docs',
}));

// ── HEALTH CHECKS ──
app.use('/health', healthRoutes);

// Root endpoint
app.get('/', (_req, res) => res.json({
  service: 'EcoBosque API',
  version: '1.0.0',
  status: 'running',
  docs: '/api-docs',
  health: '/health/detailed',
}));

// ── ROUTES ──
// Auth routes (strict rate limiting)
app.use('/auth', authRateLimiter, authRoutes);

// Rooms routes (rate limiters applied per-route inside the router)
app.use('/rooms', roomsRoutes);

// Consumos routes (write rate limiting)
app.use('/consumos', writeRateLimiter, consumosRoutes);

// Protected routes — require admin authentication
app.use('/history', requireAuth, historyRoutes);
app.use('/state-history', requireAuth, stateHistoryRoutes);
app.use('/prices', requireAuth, pricesRoutes);
app.use('/accounting', accountingRoutes);

// ── BACKUP MANAGEMENT (admin only) ──
app.post('/admin/backup', requireAuth, async (_req, res) => {
  try {
    const result = await createBackup();
    res.json({ message: 'Backup created successfully', ...result });
  } catch (error) {
    res.status(500).json({ error: 'Backup failed', message: error.message });
  }
});

// ── FALLBACK HANDLERS ──
app.use(notFoundHandler);
app.use(errorHandler);

// ── START SERVER ──
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`EcoBosque API running on http://localhost:${PORT}`);
  logger.info(`API Documentation: http://localhost:${PORT}/api-docs`);
  logger.info(`Health Check: http://localhost:${PORT}/health/detailed`);

  // Run JSON integrity check on startup
  const { startupValidation } = require('./src/utils/jsonValidator');
  startupValidation().then(report => {
    if (report.overall) {
      logger.info('JSON integrity check passed');
    } else {
      logger.warn('JSON integrity check found issues');
    }
  }).catch(err => {
    logger.warn({ err }, 'JSON integrity check failed (non-critical)');
  });

  // Create initial backup on startup
  createBackup().then(() => {
    logger.info('Initial backup created successfully');
  }).catch(err => {
    logger.warn({ err }, 'Initial backup failed (non-critical)');
  });
});

module.exports = { app, server }; // Export for testing
