/**
 * Pino logger configuration for EcoBosque Hotel System.
 * Features:
 * - Structured JSON logging
 * - Multiple log levels (trace, debug, info, warn, error, fatal)
 * - PII redaction for sensitive fields
 * - Pretty print in development, JSON in production
 */
'use strict';

const pino = require('pino');

const isProduction = process.env.NODE_ENV === 'production';

// Base configuration
const baseConfig = {
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: 'ecobosque-hotel-api',
    version: '1.0.0',
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.body.password',
      'req.body.token',
      'res.headers["set-cookie"]',
      '*.pin',
      '*.password',
      '*.token',
    ],
    censor: '**REDACTED**',
  },
};

// Create logger
const logger = pino({
  ...baseConfig,
  transport: isProduction
    ? {
        target: 'pino/file',
        options: { destination: 1 },
      }
    : {
        target: 'pino/file',
        options: { destination: 1 },
      },
});

// Export Express middleware
const pinoHttp = require('pino-http');

const httpLogger = pinoHttp({
  logger,
  quietReqLogger: true, // Less verbose in tests
  customLogLevel: function customLogLevel(req, res, err) {
    if (res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    if (res.statusCode >= 300) return 'silent';
    return 'info';
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
  // Skip logging during tests to avoid Supertest conflicts
  customSuccessMessage: (req, res) => {
    if (process.env.NODE_ENV === 'test') return null;
    return `${req.method} ${req.url} completed`;
  },
  customErrorMessage: (req, res, err) => {
    if (process.env.NODE_ENV === 'test') return null;
    return `${req.method} ${req.url} failed: ${err?.message || 'unknown error'}`;
  },
});

module.exports = { logger, httpLogger };

// Also export logger directly for backward compatibility
// This allows: require('../utils/logger').error('message')
module.exports.error = logger.error.bind(logger);
module.exports.info = logger.info.bind(logger);
module.exports.warn = logger.warn.bind(logger);
module.exports.debug = logger.debug.bind(logger);
