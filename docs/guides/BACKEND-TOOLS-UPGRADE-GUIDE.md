# EcoBosque Hotel System — Backend Tool Upgrade Guide

> Compiled: April 13, 2026
> Current stack: Node.js 20 + Express 5 (CommonJS), JSON files, JWT + bcryptjs, custom basic logger

This document researches and recommends the **best tools** to upgrade the backend from basic to production-grade infrastructure. **No implementation is included** — only analysis, code examples, and effort estimates.

---

## 1. Logging Profesional: Pino

| Detail | Value |
|--------|-------|
| **Package** | `pino` + `pino-pretty` (dev) + `pino-file` |
| **npm** | https://www.npmjs.com/package/pino |
| **GitHub** | https://github.com/pinojs/pino |
| **npm downloads** | ~5M/week (most popular high-performance logger) |
| **Version** | 9.x (stable) |

### Why Pino > Current Logger

The current logger (`backend/src/utils/logger.js`) is a thin wrapper around `console.log` with basic timestamp formatting and log levels. Pino replaces it with:

- **5x-10x faster** than Winston in benchmarks (10,000 log ops in ~115ms vs ~270ms for Winston)
- **Structured JSON output** — every log entry is machine-parseable (ideal for log aggregation tools like ELK, Datadog, Loki)
- **Child loggers** — create per-module loggers that auto-tag every entry (e.g., `logger.child({ module: 'rooms' })`)
- **Redaction support** (`pino-noir`) — automatically mask sensitive fields like PINs, JWTs, passwords in logs
- **Log rotation** via `pino-roll` — automatic file rotation by size or date
- **Zero-overhead async mode** — uses asynchronous destination for non-blocking writes

### Why Pino > Winston

- Pino puts **performance first**; Winston prioritizes feature flexibility
- Pino's asynchronous logging uses a separate thread (via `pino.destination`), keeping the event loop free
- Winston's sync mode blocks the event loop; Pino is async by design
- Both support transports, levels, and child loggers — Pino just does it faster

### Code Example

```js
// backend/src/utils/logger.js (replacement)
'use strict';

const pino = require('pino');
const path = require('path');

const isDev = process.env.NODE_ENV !== 'production';

// Base config — shared across all transports
const baseConfig = {
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ['*.pin', '*.password', '*.jwt', '*.token', 'authorization'],
    censor: '[REDACTED]',
  },
};

if (isDev) {
  // Pretty-printed console output for development
  module.exports = pino({
    ...baseConfig,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  });
} else {
  // Production: JSON to stdout + rotating file
  const pinoRoll = require('pino-roll');

  module.exports = pino(
    { ...baseConfig },
    pino.multistream([
      { stream: process.stdout },
      {
        level: 'error',
        stream: pinoRoll({
          file: path.join(__dirname, '..', '..', 'logs', 'app.log'),
          size: '10m',         // Rotate at 10MB
          frequency: 'daily',  // Or daily rotation
          mkdir: true,
          limit: 30,           // Keep last 30 files
        }),
      },
    ])
  );
}

// Usage throughout the app:
// const logger = require('../utils/logger');
// logger.info('Room checked in', { roomId: '123', guest: 'John Doe' });
// logger.child({ module: 'auth' }).warn('Failed login attempt', { ip: '1.2.3.4' });
```

### Estimated Implementation Time: **2-3 hours**
- Install packages: 10 min
- Replace `backend/src/utils/logger.js`: 30 min
- Update all `logger` calls (compatible API — `info`, `warn`, `error`, `debug` already match): 1 hour
- Add child loggers per module: 30 min
- Test in dev + production modes: 30 min

---

## 2. Validacion de Schemas: Zod

| Detail | Value |
|--------|-------|
| **Package** | `zod` + `express-zod-validator` (or custom middleware) |
| **npm** | https://www.npmjs.com/package/zod |
| **GitHub** | https://github.com/colinhacks/zod |
| **npm downloads** | ~15M/week |
| **Version** | 3.24+ (stable) |

### Why Zod > Current Approach

The current backend has **no centralized schema validation**. Validation is done ad-hoc in controllers with manual `if (!req.body.foo)` checks. Zod provides:

- **Runtime type validation** — schemas enforce data shape, types, ranges at runtime
- **Type inference** — `z.infer<typeof schema>` gives you TypeScript types automatically (useful if migrating to TS later)
- **Declarative schemas** — single source of truth for validation rules
- **Detailed error messages** — auto-generated messages telling exactly which field failed and why
- **Coercion support** — `z.coerce.number()` transforms strings to numbers automatically
- **Refine + transform** — custom validation logic + data normalization in one pass

### Why Zod > Joi / express-validator

- **Smaller bundle** (~50KB minified vs Joi's ~150KB)
- **Tree-shakeable** — unused validators get eliminated in builds
- **More intuitive API** — `z.string().email()` reads naturally
- **Joi** has been around longer but is heavier and has a more verbose API
- **express-validator** is Express-specific and uses a middleware-chain style that's harder to reuse across codebases

### Code Example

```js
// backend/src/schemas/room.schema.js (NEW FILE)
'use strict';

const z = require('zod');

// Reusable schemas
const guestSchema = z.object({
  nombre: z.string().min(2).max(100).trim(),
  documento: z.string().min(6).max(20),
  email: z.string().email().optional().or(z.literal('')),
  telefono: z.string().min(7).max(20).optional(),
});

const checkInSchema = z.object({
  huesped: guestSchema,
  checkIn: z.string().datetime({ offset: true }).optional(),
  checkOut: z.string().datetime({ offset: true }).optional(),
  pago: z.object({
    metodo: z.enum(['efectivo', 'tarjeta', 'transferencia']),
    monto: z.number().int().positive(),
  }).optional(),
});

const reservarSchema = z.object({
  huesped: guestSchema,
  fechaEntrada: z.string().datetime({ offset: true }),
  fechaSalida: z.string().datetime({ offset: true }),
});

// Custom validation error formatter for Express
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({ error: 'Datos de entrada invalidos', details: errors });
    }
    // Replace req.body with parsed/coerced data
    req.body = result.data;
    next();
  };
}

module.exports = { checkInSchema, reservarSchema, guestSchema, validate };
```

```js
// In routes (usage):
// const { checkInSchema, validate } = require('../schemas/room.schema');
// router.post('/checkin', validate(checkInSchema), roomController.checkIn);
```

### Estimated Implementation Time: **4-6 hours**
- Install Zod: 10 min
- Define schemas for all endpoints (checkin, checkout, reservar, consumo, login, prices): 3 hours
- Create `validate()` middleware: 30 min
- Replace manual validation in controllers: 1-2 hours
- Test edge cases: 30 min

---

## 3. Documentacion API: swagger-ui-express + swagger-jsdoc

| Detail | Value |
|--------|-------|
| **Packages** | `swagger-jsdoc` + `swagger-ui-express` |
| **npm (swagger-jsdoc)** | https://www.npmjs.com/package/swagger-jsdoc |
| **npm (swagger-ui-express)** | https://www.npmjs.com/package/swagger-ui-express |
| **GitHub (swagger-jsdoc)** | https://github.com/Surnet/swagger-jsdoc |
| **GitHub (swagger-ui-express)** | https://github.com/scottie1984/swagger-ui-express |
| **npm downloads** | swagger-jsdoc: ~1M/week, swagger-ui-express: ~2M/week |

### Why This > No Documentation

The current backend has **zero API documentation**. Developers must read source code to understand endpoints. swagger-jsdoc + swagger-ui-express provides:

- **Auto-generated OpenAPI spec** from JSDoc comments — documentation lives next to the code it describes
- **Interactive Swagger UI** — explore and test all endpoints in a browser
- **Schema definitions** — document request/response bodies, types, and examples
- **Auth documentation** — show which endpoints require JWT, how to authenticate
- **Living documentation** — stays in sync with code (unlike external wikis or Google Docs)

### Code Example

```js
// backend/swagger-config.js (NEW FILE)
'use strict';

const path = require('path');

module.exports = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EcoBosque Hotel API',
      version: '1.0.0',
      description: 'REST API for El Bosque Hotel Boutique — room management, reservations, consumptions',
      contact: { name: 'EcoBosque Dev Team' },
    },
    servers: [
      { url: 'http://localhost:3001', description: 'Development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Room: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '1712345678901-abc123' },
            numero: { type: 'string', example: '101' },
            tipo: { type: 'string', enum: ['Suite Bosque', 'Suite Sunset', 'Habitacion Pareja'] },
            estado: { type: 'string', enum: ['disponible', 'reservada', 'ocupada', 'limpieza', 'mantenimiento', 'fuera_servicio'] },
            huesped: { type: 'string', nullable: true },
            pin: { type: 'string', nullable: true },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Recurso no encontrado' },
          },
        },
      },
    },
  },
  apis: [
    path.join(__dirname, 'src', 'routes', '*.js'),
    path.join(__dirname, 'src', 'controllers', '*.js'),
  ],
};
```

```js
// In server.js (add before routes):
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const swaggerConfig = require('./swagger-config');

const swaggerSpec = swaggerJSDoc(swaggerConfig);
app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

```js
// In route files (JSDoc annotations):
/**
 * @swagger
 * /rooms:
 *   get:
 *     summary: List all rooms
 *     tags: [Rooms]
 *     responses:
 *       200:
 *         description: Array of rooms
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Room'
 */
```

### Estimated Implementation Time: **4-6 hours**
- Install packages: 10 min
- Create swagger-config.js: 30 min
- Mount swagger-ui-express in server.js: 15 min
- Add JSDoc annotations to all routes (15+ endpoints): 3-4 hours
- Test Swagger UI in browser: 30 min

---

## 4. Testing: Vitest + Supertest

| Detail | Value |
|--------|-------|
| **Packages** | `vitest` + `supertest` |
| **npm (vitest)** | https://www.npmjs.com/package/vitest |
| **npm (supertest)** | https://www.npmjs.com/package/supertest |
| **GitHub (vitest)** | https://github.com/vitest-dev/vitest |
| **GitHub (supertest)** | https://github.com/ladjs/supertest |
| **npm downloads** | vitest: ~8M/week, supertest: ~2M/week |

### Why Vitest + Supertest > No Tests

The current backend has **zero tests**. Vitest + Supertest provides:

- **Vitest** — Modern, Vite-powered test runner. 5-10x faster than Jest due to on-demand transformation and parallel execution. Same API as Jest (`describe`, `it`, `expect`) so zero learning curve.
- **Supertest** — Express app testing without starting a real server. Directly invokes the Express app for fast, isolated tests.
- **Watch mode** — instant re-run on file changes (Vitest's `--watch`)
- **Coverage** — built-in coverage via `--coverage` (uses v8 native, no Istanbul overhead)
- **CommonJS compatible** — works seamlessly with the backend's `require()` syntax

### Why Vitest > Jest

- **Faster startup** — Vitest starts in ~200ms vs Jest's ~2-3s
- **Native ESM support** — though the backend uses CommonJS, Vitest handles both
- **Vite ecosystem** — shares config patterns with the frontend's Vite setup
- **Smaller footprint** — ~50% fewer dependencies than Jest

### Code Example

```js
// backend/package.json (scripts)
// "test": "vitest run",
// "test:watch": "vitest",
// "test:coverage": "vitest run --coverage"

// vitest.config.js (NEW FILE in backend/)
'use strict';

const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'tests/'],
    },
  },
});
```

```js
// backend/tests/rooms.test.js (NEW FILE)
'use strict';

const request = require('supertest');
const app = require('../server'); // Uses exported Express app (no server start)

describe('GET /rooms', () => {
  it('should return 200 with array of rooms', async () => {
    const res = await request(app).get('/rooms');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('POST /rooms/checkin', () => {
  it('should reject invalid payload with 400', async () => {
    const res = await request(app)
      .post('/rooms/checkin')
      .send({ huesped: {} }); // Missing required fields
    expect(res.status).toBe(400);
  });

  it('should check in a guest with valid payload', async () => {
    const res = await request(app)
      .post('/rooms/checkin')
      .send({
        roomId: 'test-room-id',
        huesped: { nombre: 'John Doe', documento: '12345678' },
      });
    expect(res.status).toBe(200);
    expect(res.body.huesped).toBe('John Doe');
  });
});

describe('GET /health', () => {
  it('should return healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.uptime).toBeDefined();
  });
});

describe('POST /auth/login', () => {
  it('should reject wrong password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('should return JWT on successful login', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ password: process.env.ADMIN_PASSWORD || 'ecobosque2024' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });
});

describe('GET /prices (protected)', () => {
  it('should reject without auth token', async () => {
    const res = await request(app).get('/prices');
    expect(res.status).toBe(401);
  });

  it('should return prices with valid token', async () => {
    // First login to get token
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ password: process.env.ADMIN_PASSWORD || 'ecobosque2024' });
    const token = loginRes.body.token;

    const res = await request(app)
      .get('/prices')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.productos).toBeDefined();
  });
});
```

### Estimated Implementation Time: **6-10 hours**
- Install packages + vitest config: 30 min
- Set up test structure for public endpoints (health, rooms, auth): 2 hours
- Set up test structure for protected endpoints (prices, history): 1 hour
- Test validation/error scenarios (400, 401, 403, 404, 500): 2 hours
- Test rate limiting behavior: 1 hour
- Set up CI integration (optional): 1-2 hours
- Write integration tests for checkout flow: 1-2 hours

---

## 5. Caching Mejorado: NodeCache

| Detail | Value |
|--------|-------|
| **Package** | `node-cache` |
| **npm** | https://www.npmjs.com/package/node-cache |
| **GitHub** | https://github.com/node-cache/node-cache |
| **npm downloads** | ~500K/week |
| **Version** | 5.x (stable) |

### Why NodeCache > Current Cache

The current caching in `jsonStore.js` is a custom `Map` with TTL that handles only two data sets (rooms, consumos). NodeCache provides:

- **TTL per key** — each cached item can have its own expiration
- **TTL check interval** — automatic cleanup of expired entries (no manual checks needed)
- **Events** — `on('expired', ...)` hooks for cache-aware logic
- **Statistics** — `getStats()` returns hits, misses, keys count for monitoring
- **Cloning** — prevents mutation of cached objects (`useClones: true`)
- **Promisified API** — async-compatible

### Why NodeCache > Redis (for this project)

- **No external dependency** — Redis requires a separate server process. For a single-server hotel app, in-memory caching is sufficient
- **Zero configuration** — `new NodeCache()` works out of the box
- **Lightweight** — ~30KB vs Redis's ~20MB+ (plus server installation)
- **If scaling to multi-server later**, Redis (`ioredis`) becomes the right choice, but NodeCache is optimal for current architecture

### Code Example

```js
// backend/src/data/cache.js (NEW FILE)
'use strict';

const NodeCache = require('node-cache');

// Create cache instance with tuned settings
const cache = new NodeCache({
  stdTTL: 30,           // Default TTL: 30 seconds (was 5s)
  checkperiod: 60,      // Check for expired keys every 60s
  useClones: true,      // Return clones to prevent cache mutation
  maxKeys: 100,         // Prevent memory bloat
});

// Cache statistics (for /health or monitoring)
function getCacheStats() {
  const stats = cache.getStats();
  return {
    keys: stats.keys,
    hits: stats.hits,
    misses: stats.misses,
    ksize: stats.ksize,
    vsize: stats.vsize,
  };
}

// Named cache getters/setters
function getCachedRooms() {
  return cache.get('rooms') || null;
}

function setCachedRooms(rooms, ttl = 30) {
  cache.set('rooms', rooms, ttl);
}

function getCachedPrices() {
  return cache.get('prices') || null;
}

function setCachedPrices(prices, ttl = 60) {
  cache.set('prices', prices, ttl);
}

// Event listeners for monitoring
cache.on('expired', (key) => {
  require('../utils/logger').debug('Cache key expired', { key });
});

cache.on('set', (key) => {
  require('../utils/logger').debug('Cache set', { key });
});

module.exports = {
  cache,
  getCacheStats,
  getCachedRooms,
  setCachedRooms,
  getCachedPrices,
  setCachedPrices,
};
```

```js
// Usage in jsonStore.js (replacement pattern):
// const { getCachedRooms, setCachedRooms } = require('./cache');
//
// async function getRooms() {
//   const cached = getCachedRooms();
//   if (cached !== null) return cached;
//   const rooms = await readJSON(ROOMS_FILE, 'array');
//   setCachedRooms(rooms);
//   return rooms;
// }
```

### Estimated Implementation Time: **2-3 hours**
- Install node-cache: 5 min
- Create cache.js with wrapper functions: 30 min
- Replace current Map-based cache in jsonStore.js: 1 hour
- Add cache stats to /health endpoint: 30 min
- Test cache behavior and invalidation: 30 min

---

## 6. Backups Automaticos: node-cron

| Detail | Value |
|--------|-------|
| **Package** | `node-cron` |
| **npm** | https://www.npmjs.com/package/node-cron |
| **GitHub** | https://github.com/node-cron/node-cron |
| **npm downloads** | ~1.5M/week |
| **Version** | 4.x (stable) |

### Why node-cron > Current Approach

The current `jsonStore.js` creates backups **on every write** (before `writeJSON`). This is reactive. `node-cron` adds:

- **Scheduled backups** — periodic snapshots even if no writes occurred (e.g., nightly backup at 3 AM)
- **Compressed backups** — zip/tar.gz archived data to save disk space
- **Backup rotation** — delete backups older than N days automatically
- **Health alerts** — log warnings if backup fails
- **Separate from write-path** — current backup-on-write is a safety net for writes; cron-based backups are a safety net for the entire system

### Code Example

```js
// backend/src/jobs/backup.js (NEW FILE)
'use strict';

const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

const DATA_DIR = path.resolve(__dirname, '..', '..');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const DATA_FILES = ['rooms.json', 'consumos.json', 'history.json', 'stateHistory.json', 'prices.json'];

async function createScheduledBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(BACKUP_DIR, `scheduled-${timestamp}`);
    await fs.mkdir(backupDir, { recursive: true });

    for (const file of DATA_FILES) {
      const src = path.join(DATA_DIR, file);
      const dest = path.join(backupDir, file);
      try {
        const exists = await fs.access(src).then(() => true).catch(() => false);
        if (exists) {
          await fs.copyFile(src, dest);
        }
      } catch (err) {
        logger.error('Backup copy failed', { file, error: err.message });
      }
    }

    logger.info('Scheduled backup created', { dir: backupDir });

    // Clean backups older than 7 days
    await cleanupOldBackups(7);
  } catch (err) {
    logger.error('Scheduled backup failed', { error: err.message });
  }
}

async function cleanupOldBackups(daysToKeep) {
  try {
    const dirs = await fs.readdir(BACKUP_DIR);
    const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

    for (const dir of dirs) {
      if (!dir.startsWith('scheduled-')) continue;
      const dirPath = path.join(BACKUP_DIR, dir);
      const stat = await fs.stat(dirPath);
      if (stat.mtimeMs < cutoff) {
        await fs.rm(dirPath, { recursive: true, force: true });
        logger.info('Deleted old backup', { dir });
      }
    }
  } catch (err) {
    logger.error('Backup cleanup failed', { error: err.message });
  }
}

// Schedule: daily at 3:00 AM (Colombia timezone)
const backupJob = cron.schedule('0 3 * * *', createScheduledBackup, {
  timezone: 'America/Bogota',
  name: 'daily-backup',
});

module.exports = { backupJob, createScheduledBackup };
```

```js
// In server.js (add before app.listen):
// const { backupJob } = require('./src/jobs/backup');
// backupJob.start();
```

### Estimated Implementation Time: **2-3 hours**
- Install node-cron: 5 min
- Create backup job module: 1 hour
- Add cleanup logic for old backups: 30 min
- Integrate into server.js: 10 min
- Test with faster cron schedule (every minute): 30 min
- Verify backup files and cleanup: 30 min

---

## 7. Health Checks: express-status-monitor (Fork: @frozenjs/express-status-monitor)

| Detail | Value |
|--------|-------|
| **Package** | `@frozenjs/express-status-monitor` |
| **npm** | https://www.npmjs.com/package/@frozenjs/express-status-monitor |
| **GitHub** | https://github.com/RafalWilinski/express-status-monitor (original) |
| **Note** | Original is unmaintained; `@frozenjs` fork is actively maintained (2025) |

### Why This > Current /health Endpoint

The current `/health` endpoint returns basic status + uptime + timestamp. `@frozenjs/express-status-monitor` provides:

- **Real-time dashboard** — live web UI at `/status` with charts
- **CPU usage** — process and system CPU metrics
- **Memory usage** — RSS, heap used/total, external memory
- **Event loop lag** — detect blocking operations
- **Response time** — average API response time with histogram
- **Request rate** — requests per second (1m, 5m, 15m averages)
- **HTTP status codes** — count of 2xx, 3xx, 4xx, 5xx responses
- **Socket.io powered** — real-time updates without polling

### Why This > Custom Health Endpoint

- **Zero effort dashboard** — one middleware call gives you a full monitoring UI
- **Better than building from scratch** — would take 10+ hours to replicate these metrics + charts
- **Self-hosted** — no external SaaS dependency
- **Socket.io** adds a dependency, but the visual dashboard is worth it

### Code Example

```js
// In server.js (add after body parsing, before routes):
const statusMonitor = require('@frozenjs/express-status-monitor');

// Protect with auth — only admins can see the dashboard
const { requireAuth } = require('./src/middleware/auth');

app.use(
  '/status',
  requireAuth,
  statusMonitor({
    path: '/status',         // Dashboard path
    spans: [                 // Time windows for metrics
      { interval: 1,  retentions: 60 },   // 1 sec intervals, keep 60
      { interval: 5,  retentions: 60 },   // 5 sec intervals, keep 60
      { interval: 15, retentions: 60 },   // 15 sec intervals, keep 60
    ],
    iframeChartOptions: { display: false },
    chartVisibility: {
      cpu: true,
      mem: true,
      load: true,
      heap: true,
      loop: true,         // Event loop lag
      responseTime: true,
      rps: true,          // Requests per second
      statusCode: true,
    },
    healthChecks: [
      'http://localhost:3001/health',
    ],
  }).dashboardRouter
);

// Enhanced /health endpoint with cache stats
app.get('/health', (_req, res) => {
  const { getCacheStats } = require('./src/data/cache');
  res.json({
    status: 'healthy',
    uptime: Math.floor((Date.now() - startTime) / 1000) + 's',
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    cache: getCacheStats(),
  });
});
```

### Estimated Implementation Time: **1-2 hours**
- Install package: 5 min
- Add middleware to server.js: 15 min
- Configure health checks and route protection: 30 min
- Enhance /health endpoint with memory + cache stats: 30 min
- Test dashboard at /status: 15 min

---

## 8. Error Tracking: Sentry

| Detail | Value |
|--------|-------|
| **Package** | `@sentry/node` + `@sentry/profiling-node` |
| **npm** | https://www.npmjs.com/package/@sentry/node |
| **GitHub** | https://github.com/getsentry/sentry-javascript |
| **npm downloads** | ~10M/week |
| **Version** | 9.x (latest) |
| **Pricing** | Free tier: 5,000 errors/month + 10,000 transactions/month (sufficient for hotel app) |

### Why Sentry > Current Error Handler

The current error handler (`errorHandler.js`) logs errors to console/file but provides:

- **No alerting** — errors are logged but nobody is notified
- **No correlation** — errors are isolated log lines, not grouped by root cause
- **No context** — no request context, user info, or breadcrumbs

Sentry provides:

- **Automatic error grouping** — groups similar errors (e.g., "null pointer in roomController" x100 = 1 issue)
- **Stack traces** — full source-mapped stack traces with file/line highlighting
- **Breadcrumbs** — tracks events leading up to the error (requests, queries, cache hits)
- **Release tracking** — associate errors with specific app versions
- **Alerts** — email, Slack, or webhook notifications on new errors
- **Performance monitoring** — trace slow endpoints, database queries, file I/O
- **Express integration** — `Sentry.setupExpressErrorHandler(app)` captures all unhandled errors

### Code Example

```js
// backend/src/utils/sentry.js (NEW FILE)
'use strict';

const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

function initSentry() {
  if (!process.env.SENTRY_DSN) {
    return null; // Don't initialize without DSN
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: `ecobosque-api@${require('../../package.json').version}`,
    integrations: [
      nodeProfilingIntegration(),
      Sentry.expressIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Profile 10% of transactions in production, 100% in dev
    profilesSampleRate: 0.1,
    // Error filtering
    ignoreErrors: [
      // Ignore known noise
      'Request aborted',
      'socket hang up',
    ],
    beforeSend(event) {
      // Redact sensitive data before sending to Sentry
      if (event.request) {
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
        if (event.request.data) {
          // Remove PII from request body
          if (event.request.data.password) event.request.data.password = '[REDACTED]';
          if (event.request.data.pin) event.request.data.pin = '[REDACTED]';
        }
      }
      return event;
    },
  });

  return Sentry;
}

module.exports = { initSentry, Sentry };
```

```js
// In server.js (add at the very top, before any other imports):
const { initSentry } = require('./src/utils/sentry');
initSentry();

// After all routes, before errorHandler (Sentry must be the last error handler):
// const { Sentry } = require('./src/utils/sentry');
// app.use(Sentry.expressErrorHandler()); // Must be BEFORE your custom errorHandler

// In controllers (manual capture with context):
// const { Sentry } = require('../utils/sentry');
//
// try { ... } catch (err) {
//   Sentry.captureException(err, {
//     tags: { operation: 'checkout' },
//     user: { id: roomId },
//     extra: { huesped: guestName, checkoutDate },
//   });
//   throw err; // Still let errorHandler handle it
// }
```

### Environment Variables Required
```env
SENTRY_DSN=https://xxxxx@oYYYYY.ingest.sentry.io/Zzzzz
NODE_ENV=production
```

### Estimated Implementation Time: **2-4 hours**
- Create Sentry account + get DSN: 15 min
- Install packages: 5 min
- Create sentry.js init module: 30 min
- Integrate into server.js (top + bottom): 15 min
- Add manual capture in critical controllers: 1 hour
- Configure alerts/notification rules in Sentry dashboard: 30 min
- Test with intentional error: 15 min

---

## Summary Table

| # | Area | Tool | npm Package | Impl. Time | Impact |
|---|------|------|-------------|------------|--------|
| 1 | Logging | **Pino** | `pino` + `pino-pretty` + `pino-roll` | 2-3h | Structured logs, file rotation, redaction |
| 2 | Validation | **Zod** | `zod` | 4-6h | Runtime type safety, auto error messages |
| 3 | API Docs | **Swagger** | `swagger-jsdoc` + `swagger-ui-express` | 4-6h | Interactive OpenAPI documentation |
| 4 | Testing | **Vitest + Supertest** | `vitest` + `supertest` | 6-10h | Fast test suite, API integration tests |
| 5 | Caching | **NodeCache** | `node-cache` | 2-3h | TTL management, stats, events |
| 6 | Backups | **node-cron** | `node-cron` | 2-3h | Scheduled backups, rotation |
| 7 | Monitoring | **@frozenjs/express-status-monitor** | `@frozenjs/express-status-monitor` | 1-2h | Real-time dashboard, CPU/mem charts |
| 8 | Errors | **Sentry** | `@sentry/node` + `@sentry/profiling-node` | 2-4h | Error grouping, alerts, performance traces |

**Total estimated implementation time: 23-37 hours** (can be done incrementally)

---

## Recommended Implementation Order

1. **Pino** (logging) — lowest risk, highest immediate value. Replace logger.js, done.
2. **NodeCache** — drop-in replacement for current Map cache. 2 hours.
3. **Zod** — add validation to one endpoint at a time, starting with `/rooms/checkin`.
4. **node-cron** — add scheduled backups alongside existing write-time backups.
5. **express-status-monitor** — one middleware line, instant dashboard.
6. **Vitest + Supertest** — start with health/rooms, expand to all endpoints.
7. **Swagger** — add JSDoc annotations incrementally as you work on routes.
8. **Sentry** — requires external account setup, do this last.

---

## Dependencies Summary (All Packages)

```json
{
  "dependencies": {
    "pino": "^9.x",
    "pino-roll": "^2.x",
    "zod": "^3.24.x",
    "swagger-jsdoc": "^6.x",
    "swagger-ui-express": "^5.x",
    "node-cache": "^5.x",
    "node-cron": "^4.x",
    "@frozenjs/express-status-monitor": "^2025.x",
    "@sentry/node": "^9.x",
    "@sentry/profiling-node": "^9.x"
  },
  "devDependencies": {
    "pino-pretty": "^13.x",
    "vitest": "^3.x",
    "supertest": "^7.x"
  }
}
```

**Approximate additional bundle size**: ~2.5 MB (uncompressed) — acceptable for a server application.

---

## Compatibility Notes

- **All packages are CommonJS compatible** — no ESM-only packages that would conflict with the backend's `"type": "commonjs"` setting
- **No breaking changes to Express 5** — all packages support Express 4.x and 5.x
- **No database migration required** — all tools work with the existing JSON file storage
- **Backward compatible** — Pino's API (`logger.info()`, `logger.error()`) matches the current custom logger
