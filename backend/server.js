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
const { requireAuth, csrfProtection } = require('./src/middleware/auth');
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

// Trust Vercel proxy for real client IP (required for rate limiting / security)
// '1' = trust 1 proxy hop (Vercel). 'true' would trigger ERR_ERL_PERMISSIVE_TRUST_PROXY in express-rate-limit v8.
app.set('trust proxy', 1);

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

// ── CORS (strict, with Vercel support) ──
const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;
const defaultOrigins = ['http://localhost:5173', 'http://localhost:4173'];
if (vercelUrl) defaultOrigins.push(vercelUrl);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : defaultOrigins;

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    if (process.env.VERCEL) {
      const host = origin.replace(/^https?:\/\//, '');
      if (host.endsWith('.vercel.app') || host === process.env.VERCEL_URL) return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Protection'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 600,
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

// ── VERCEL PREFIX STRIPPING ──
// On Vercel, /api path prefix is NOT stripped by the rewrite; we strip it here
// so Express internal routes (/v1/*, /auth/*, etc.) match correctly.
// Must be BEFORE all route registrations.
if (process.env.VERCEL) {
  const PREFIXES = ['/_/backend', '/api'];
  app.use((req, _res, next) => {
    for (const prefix of PREFIXES) {
      if (req.url.startsWith(prefix)) {
        req.url = req.url.slice(prefix.length);
        break;
      }
    }
    next();
  });
}

// ── AUTH ROUTES (mounted before CSRF so login/register don't need CSRF tokens) ──
app.use('/v1/auth', authRateLimiter, authRoutes);
app.use('/auth', authRateLimiter, authRoutes);

// ── CSRF PROTECTION (only in production) ──
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.path.includes('/validar')) return next();
    return csrfProtection(req, res, next);
  });
}

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



// ── ROUTES (v1 + unversioned for backward compatibility) ──

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
function requireAdminRole(req, res, next) {
  const allowed = ['admin', 'owner'];
  if (!req.user || !allowed.includes(req.user.role)) {
    return res.status(403).json({ error: 'Solo administradores pueden realizar esta accion' });
  }
  next();
}

app.post('/admin/backup', requireAuth, requireAdminRole, async (_req, res) => {
  try {
    const result = await createBackup();
    res.json({ message: 'Backup created successfully', ...result });
  } catch (error) {
    res.status(500).json({ error: 'Error interno al crear backup' });
  }
});

// ── FALLBACK HANDLERS ──
app.use(notFoundHandler);
app.use(errorHandler);

// ── START HTTP SERVER ──
let server;

async function runStartupTasks() {
  if (process.env.NODE_ENV === 'test') return;
  try {
    await persistence.bootstrapFromFiles();
  } catch (err) {
    logger.warn({ err }, 'Redis bootstrap failed (non-critical)');
  }
}

// Seed users on startup (both local and Vercel serverless)
async function seedUsers() {
  if (process.env.NODE_ENV === 'test' || process.env.SKIP_SEED) return;
  try {
    const us = require('./src/data/userStore');
    const adminUser = await us.seedAdminUser();
    if (adminUser) logger.info('Admin user seeded');
    const ownerUser = await us.seedOwnerUser();
    if (ownerUser) logger.info('Owner user seeded');
  } catch (err) {
    logger.warn({ err }, 'User seed failed (non-critical)');
  }
}

// Only start the HTTP server when NOT running on Vercel (serverless)
if (!process.env.VERCEL) {
  runStartupTasks().then(() => {
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
        if (!process.env.DISABLE_BACKUP) {
          createBackup().then(() => {
            logger.info('Initial backup created successfully');
          }).catch(err => {
            logger.warn({ err }, 'Initial backup failed (non-critical)');
          });
        }

        seedUsers();
      }
    });
  });
} else {
  // On Vercel, seed users on cold start
  seedUsers();
}

module.exports = app; // Export for Vercel serverless
module.exports.app = app;

// Live getter so tests can access `server` even though it's assigned asynchronously
Object.defineProperty(module.exports, 'server', {
  get: () => server,
  enumerable: true,
  configurable: true,
});
