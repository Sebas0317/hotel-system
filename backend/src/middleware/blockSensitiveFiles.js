'use strict';

const path = require('path');

/**
 * Blocks access to sensitive file patterns:
 * - .env files and environment configurations
 * - .git directory and contents
 * - .aider files
 * - node_modules
 * - JSON data files (direct access)
 * - .log files
 */
const SENSITIVE_PATTERNS = [
  /\.env(\..*)?$/i,
  /\.git(\/|$)/i,
  /\.aider/i,
  /node_modules/i,
  /\.log$/i,
  /\.json$/i,
  /\.md$/i,
  /\.ya?ml$/i,
  /\.toml$/i,
  /\.pem$/i,
  /\.key$/i,
  /\.crt$/i,
];

function blockSensitiveFiles(req, res, next) {
  const urlPath = req.path.toLowerCase();
  const decodedPath = decodeURIComponent(urlPath);

  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(decodedPath)) {
      return res.status(403).json({ error: 'Access denied' });
    }
  }

  // Block directory traversal attempts
  if (decodedPath.includes('..') || decodedPath.includes('%2e%2e')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  next();
}

module.exports = { blockSensitiveFiles };
