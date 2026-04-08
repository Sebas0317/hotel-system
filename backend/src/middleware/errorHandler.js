'use strict';

const logger = require('../utils/logger');

/**
 * Centralized error handling middleware
 * Catches unhandled errors and returns consistent error responses
 */
function errorHandler(err, _req, res, _next) {
  logger.error('Unhandled error', { 
    message: err.message, 
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined 
  });

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500
    ? 'Internal server error'
    : err.message || 'Unknown error';

  res.status(statusCode).json({ error: message });
}

/**
 * 404 handler for undefined routes
 */
function notFoundHandler(_req, res) {
  res.status(404).json({ error: 'Route not found' });
}

/**
 * Request logger middleware (development only)
 */
function requestLogger(req, _res, next) {
  const start = Date.now();
  const originalEnd = _res.end;

  _res.end = function(...args) {
    const duration = Date.now() - start;
    const logLevel = _res.statusCode >= 400 ? 'warn' : 'debug';
    logger[logLevel](`${req.method} ${req.originalUrl}`, { 
      status: _res.statusCode, 
      duration: `${duration}ms` 
    });
    originalEnd.apply(_res, args);
  };

  next();
}

module.exports = {
  errorHandler,
  notFoundHandler,
  requestLogger,
};
