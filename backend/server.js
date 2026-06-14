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

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');

// Import logging
const { logger, httpLogger } = require('./src/utils/logger');

// Import persistence (Redis fallback)
const persistence = require('./src/data/persistence');

// Import backups
const { createBackup } = require('./src/utils/backup');

// Import WebSocket
const { initWebSocket } = require('./src/utils/websocket');

// Import Swagger config
const swaggerSpecs = require('./src/config/swagger');

// Import middleware
const { requestLogger, errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');
const { requireAuth } = require('./src/middleware/auth');
const { sanitizeBody } = require('./src/middleware/sanitize');
const { requestTimeout } = require('./src/middleware/requestTimeout');
const cookieParser = require('cookie-parser');
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
const reservasRoutes = require('./src/routes/reservas');
const usersRoutes = require('./src/routes/users');

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
      scriptSrc: ["'self'", 'https://www.google.com', 'https://www.gstatic.com'],
      styleSrc: ["'self'", "'unsafe-inline'"], // Required for inline styles
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["https://www.google.com"],
      workerSrc: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
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
      return callback(null, true);
    }
    // Wildcard .vercel.app removed for CSRF safety.
    // Set ALLOWED_ORIGINS env var to your production domain.
    callback(new Error('Not allowed by CORS'));
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

// ── COOKIE PARSER (for httpOnly JWT) ──
app.use(cookieParser());

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
app.use('/v1/health', healthRoutes);
app.use('/health', healthRoutes);

// Root endpoint
app.get('/', (_req, res) => res.json({
  service: 'EcoBosque API',
  version: '1.0.0',
  status: 'running',
  docs: '/api-docs',
  health: '/health/detailed',
}));

// On Vercel, strip the route prefix so Express routes match correctly
if (process.env.VERCEL) {
  const PREFIX = '/_/backend';
  app.use((req, _res, next) => {
    if (req.url.startsWith(PREFIX)) {
      req.url = req.url.slice(PREFIX.length);
    }
    next();
  });
}

// ── ROUTES (v1 + unversioned for backward compatibility) ──
// Auth routes (strict rate limiting)
app.use('/v1/auth', authRateLimiter, authRoutes);
app.use('/auth', authRateLimiter, authRoutes);

// Rooms routes (rate limiters applied per-route inside the router)
app.use('/v1/rooms', roomsRoutes);
app.use('/rooms', roomsRoutes);

// Consumos routes (write rate limiting)
app.use('/v1/consumos', writeRateLimiter, consumosRoutes);
app.use('/consumos', writeRateLimiter, consumosRoutes);

// Protected routes — require admin authentication
app.use('/v1/history', requireAuth, historyRoutes);
app.use('/history', requireAuth, historyRoutes);
app.use('/v1/state-history', requireAuth, stateHistoryRoutes);
app.use('/state-history', requireAuth, stateHistoryRoutes);
app.use('/v1/prices', requireAuth, pricesRoutes);
app.use('/prices', requireAuth, pricesRoutes);
app.use('/v1/accounting', accountingRoutes);
app.use('/accounting', accountingRoutes);
app.use('/v1/reservas', requireAuth, reservasRoutes);
app.use('/reservas', requireAuth, reservasRoutes);
app.use('/v1/users', authRateLimiter, usersRoutes);
app.use('/users', authRateLimiter, usersRoutes);

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

// ── START HTTP SERVER ──
let server;
server = app.listen(PORT, '0.0.0.0', () => {
    // Initialize WebSocket server for real-time updates
    initWebSocket(server);

    logger.info(`EcoBosque API running on http://localhost:${PORT}`);

    // ── OPTIONAL HTTPS (self-signed dev certs) ──
    if (process.env.NODE_ENV !== 'test') {
      const certPath = path.join(__dirname, 'certs', 'dev-cert.pem');
      const keyPath = path.join(__dirname, 'certs', 'dev-key.pem');
      if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        const httpsOpts = {
          cert: fs.readFileSync(certPath),
          key: fs.readFileSync(keyPath),
        };
        const httpsServer = https.createServer(httpsOpts, app);
        const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
        httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
          initWebSocket(httpsServer);
          logger.info(`EcoBosque API running on https://localhost:${HTTPS_PORT}`);
        });
      }
    }

    logger.info(`API Documentation: http://localhost:${PORT}/api-docs`);
    logger.info(`Health Check: http://localhost:${PORT}/health/detailed`);

    // Avoid expensive startup side-effects during tests.
    if (process.env.NODE_ENV !== 'test') {
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

      // Seed admin user from env and owner user
      const us = require('./src/data/userStore');
      us.seedAdminUser().then(user => {
        if (user) logger.info('Admin user seeded');
      }).catch(err => {
        logger.warn({ err }, 'Admin user seed failed (non-critical)');
      });
      us.seedOwnerUser().then(user => {
        if (user) logger.info('Owner user seeded');
      }).catch(err => {
        logger.warn({ err }, 'Owner user seed failed (non-critical)');
      });

      // Bootstrap Redis from JSON files on first cold start
      persistence.bootstrapFromFiles().catch(err => {
        logger.warn({ err }, 'Redis bootstrap failed (non-critical)');
      });
    }
  });

module.exports = app; // Export for Vercel serverless
module.exports.app = app;
module.exports.server = server; // Export for testing
