'use strict';

/**
 * EcoBosque Hotel System - Backend Server
 * Modular architecture with separated routes, controllers, and data layer
 *
 * Entry point: Express app that wires together middleware and route modules
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');

// Import middleware
const { requestLogger, errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');
const { requireAuth } = require('./src/middleware/auth');
const { sanitizeBody } = require('./src/middleware/sanitize');

// Import routes
const roomsRoutes = require('./src/routes/rooms');
const consumosRoutes = require('./src/routes/consumos');
const pricesRoutes = require('./src/routes/prices');
const authRoutes = require('./src/routes/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// ── GLOBAL MIDDLEWARE ──
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(sanitizeBody);

// Request logging (useful for debugging; can be disabled in production)
app.use(requestLogger);

// ── ROUTES ──
app.get('/', (_req, res) => res.json({ service: 'EcoBosque API', status: 'running' }));
app.use('/auth', authRoutes);
app.use('/rooms', roomsRoutes);
app.use('/consumos', consumosRoutes);

// Protected routes — require admin authentication
app.use('/prices', requireAuth, pricesRoutes);

// ── FALLBACK HANDLERS ──
app.use(notFoundHandler);
app.use(errorHandler);

// ── START SERVER ──
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ EcoBosque API running on http://localhost:${PORT}`);
});

module.exports = app; // Export for testing
