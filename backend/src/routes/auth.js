'use strict';

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { requireTurnstile } = require('../middleware/turnstile');
const { writeRateLimiter, pinRateLimiter } = require('../middleware/rateLimiters');

router.get('/setup', authController.setup);
router.get('/status', authController.getAuthStatus);

router.post('/register', requireTurnstile, writeRateLimiter, authController.register);
router.post('/login', requireTurnstile, authController.login);
router.post('/2fa/verify', authController.verify2FA);
router.post('/login-code/send', writeRateLimiter, authController.sendLoginCode);

router.post('/verification/enviar', writeRateLimiter, authController.enviarCodigoVerificacion);
router.post('/verification/verificar', pinRateLimiter, authController.verificarCorreo);

router.post('/recovery/solicitar', writeRateLimiter, authController.solicitarRecuperacion);
router.post('/recovery/verificar', pinRateLimiter, authController.verificarCodigoRecuperacion);
router.post('/recovery/cambiar', writeRateLimiter, authController.cambiarContrasena);

router.post('/2fa/toggle', requireAuth, authController.toggle2FA);

router.get('/profile', requireAuth, authController.getProfile);
router.put('/profile', requireAuth, authController.updateProfile);
router.post('/profile/change-password', requireAuth, authController.changeOwnPassword);

router.get('/last-login', authController.getLastLogin);
router.get('/login-logs', requireAuth, authController.getLoginLogs);

if (process.env.NODE_ENV !== 'production') {
  router.post('/hash-password', authController.hashPassword);
}

module.exports = router;
