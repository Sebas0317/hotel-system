'use strict';

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { requireTurnstile } = require('../middleware/turnstile');
const {
  writeRateLimiter,
  pinRateLimiter,
  loginLimiter,
  codeVerifyLimiter,
  recoveryLimiter,
  emailCodeLimiter,
} = require('../middleware/rateLimiters');

router.get('/setup', authController.setup);
router.get('/status', authController.getAuthStatus);

router.post('/register', requireTurnstile, writeRateLimiter, authController.register);
router.post('/login', requireTurnstile, loginLimiter, authController.login);
router.post('/2fa/verify', codeVerifyLimiter, authController.verify2FA);
router.post('/login-code/send', loginLimiter, authController.sendLoginCode);

router.post('/verification/enviar', emailCodeLimiter, authController.enviarCodigoVerificacion);
router.post('/verification/verificar', codeVerifyLimiter, authController.verificarCorreo);

router.post('/recovery/solicitar', emailCodeLimiter, authController.solicitarRecuperacion);
router.post('/recovery/verificar', recoveryLimiter, authController.verificarCodigoRecuperacion);
router.post('/recovery/cambiar', recoveryLimiter, authController.cambiarContrasena);

router.post('/2fa/toggle', requireAuth, authController.toggle2FA);

router.get('/profile', requireAuth, authController.getProfile);
router.put('/profile', requireAuth, authController.updateProfile);
router.post('/profile/change-password', requireAuth, authController.changeOwnPassword);

router.get('/last-login', authController.getLastLogin);
router.get('/login-logs', requireAuth, authController.getLoginLogs);
router.get('/security-events', requireAuth, authController.getSecurityEvents);

if (process.env.NODE_ENV !== 'production') {
  router.post('/hash-password', authController.hashPassword);
}

module.exports = router;
