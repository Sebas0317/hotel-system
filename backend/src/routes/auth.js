'use strict';

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /auth/login - Authenticate admin
router.post('/login', authController.login);

// POST /auth/hash-password - Generate password hash (setup utility)
router.post('/hash-password', authController.hashPassword);

module.exports = router;
