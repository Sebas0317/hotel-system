'use strict';

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

// POST /auth/login - Authenticate admin
router.post('/login', authController.login);

// GET /auth/last-login - Get last login info (public, for session info)
router.get('/last-login', authController.getLastLogin);

// GET /auth/login-logs - Get login audit logs (admin only)
router.get('/login-logs', requireAuth, authController.getLoginLogs);

// POST /auth/hash-password - Generate password hash (disabled in production)
if (process.env.NODE_ENV !== 'production') {
  router.post('/hash-password', authController.hashPassword);
}

module.exports = router;
