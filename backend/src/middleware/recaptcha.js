'use strict';

/**
 * Google reCAPTCHA v3 verification middleware.
 *
 * Requires RECAPTCHA_SECRET_KEY env var (set in Vercel Dashboard).
 * Uses a test key fallback that always passes for local development.
 */

const https = require('https');
const { URL } = require('url');
const { logger } = require('../utils/logger');

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY;
const MIN_SCORE = 0.5;

/**
 * Verify a reCAPTCHA v3 token against Google's API.
 * @param {string} token - The reCAPTCHA token from the frontend
 * @returns {Promise<{success: boolean, score: number}>}
 */
function verifyRecaptcha(token) {
  return new Promise((resolve, reject) => {
    if (!token) {
      return resolve({ success: false, score: 0, 'error-codes': ['missing-input-response'] });
    }

    const params = new URLSearchParams({
      secret: RECAPTCHA_SECRET,
      response: token,
    });

    const req = https.request({
      hostname: 'www.google.com',
      path: '/recaptcha/api/siteverify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch {
          reject(new Error('Failed to parse reCAPTCHA response'));
        }
      });
    });

    req.on('error', reject);
    req.write(params.toString());
    req.end();
  });
}

/**
 * Express middleware: enforces reCAPTCHA v2/v3 on protected routes.
 * Extracts token from req.body.recaptchaToken.
 * v2: checks success === true
 * v3: checks success && score >= MIN_SCORE
 */
async function requireRecaptcha(req, res, next) {
  // Allow test suite to bypass reCAPTCHA
  if (process.env.NODE_ENV === 'test' && req.headers['x-test-skip-captcha'] === 'true') return next();

  const token = req.body?.recaptchaToken;

  if (!token) {
    logger.warn('reCAPTCHA verification failed: missing token', {
      ip: req.ip,
      path: req.path,
    });
    return res.status(400).json({ error: 'Token de verificacion de seguridad requerido' });
  }

  try {
    const result = await verifyRecaptcha(token);

    if (!result.success) {
      logger.warn('reCAPTCHA verification failed', {
        success: result.success,
        score: result.score,
        ip: req.ip,
        path: req.path,
        'error-codes': result['error-codes'],
      });
      return res.status(403).json({ error: 'Verificacion de seguridad fallida. Intentalo de nuevo.' });
    }

    // v3 includes a score; v2 checkbox does not
    if (result.score !== undefined && result.score < MIN_SCORE) {
      logger.warn('reCAPTCHA score too low', {
        score: result.score,
        ip: req.ip,
        path: req.path,
      });
      return res.status(403).json({ error: 'Verificacion de seguridad fallida. Intentalo de nuevo.' });
    }

    next();
  } catch (err) {
    logger.error({ err }, 'reCAPTCHA verification error');
    return res.status(500).json({ error: 'Error al verificar seguridad. Intentalo de nuevo.' });
  }
}

module.exports = { requireRecaptcha, verifyRecaptcha };
