'use strict';

const https = require('https');
const logger = require('../utils/logger');

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA';

function verifyTurnstile(token) {
  return new Promise((resolve, reject) => {
    const data = `secret=${encodeURIComponent(TURNSTILE_SECRET)}&response=${encodeURIComponent(token)}`;

    const req = https.request(
      {
        hostname: 'challenges.cloudflare.com',
        path: '/turnstile/v0/siteverify',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            reject(new Error('Failed to parse Turnstile response'));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function requireTurnstile(req, res, next) {
  const token = req.body?.turnstileToken;

  if (!token) {
    return next();
  }

  try {
    const result = await verifyTurnstile(token);
    if (!result.success) {
      logger.warn('Turnstile verification failed', {
        'error-codes': result['error-codes'],
      });
      return res.status(403).json({ error: 'Verificacion de seguridad fallida' });
    }
    next();
  } catch (err) {
    logger.error({ err }, 'Turnstile verification error');
    return res.status(500).json({ error: 'Error de verificacion de seguridad' });
  }
}

module.exports = { requireTurnstile, verifyTurnstile };
