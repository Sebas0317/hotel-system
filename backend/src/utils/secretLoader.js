/**
 * secretLoader.js
 * Centralized loader for sensitive configuration values.
 * All secrets must be provided via environment variables; the repository
 * never contains raw credentials or private keys.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const logger = require('./logger');

/**
 * Returns the JWT secret used for signing tokens.
 * Throws a clear error if the variable is missing – the server will abort
 * at startup, preventing insecure fallback secrets.
 */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    logger.error('JWT_SECRET is not set – aborting startup for security reasons');
    throw new Error('Missing JWT_SECRET environment variable');
  }
  return secret;
}

/**
 * Returns the PEM private key used for HTTPS development certificates.
 * The path to the key is supplied via DEV_PRIVATE_KEY_PATH; if not set the
 * function will attempt to read the default location (used only in local
 * development). If the file cannot be read, an error is logged and thrown.
 */
function getPrivateKey() {
  const keyPath = process.env.DEV_PRIVATE_KEY_PATH || path.join(__dirname, '..', 'certs', 'dev-key.pem');
  try {
    return fs.readFileSync(keyPath, 'utf8');
  } catch (err) {
    logger.error({ err }, `Failed to load private key from ${keyPath}`);
    throw err;
  }
}

/**
 * Retrieves admin credentials (email/password) from env variables.
 * Returns an object { email, password } or throws if missing.
 */
function getAdminCredentials() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    logger.error('Admin credentials not fully defined in environment');
    throw new Error('Missing ADMIN_EMAIL or ADMIN_PASSWORD');
  }
  return { email, password };
}

module.exports = { getJwtSecret, getPrivateKey, getAdminCredentials };
