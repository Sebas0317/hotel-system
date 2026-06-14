'use strict';

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const {
  requireAuth,
  requirePermission,
  requireRole,
  revalidateRole,
} = require('../middleware/auth');
const {
  readRateLimiter,
  writeRateLimiter,
} = require('../middleware/rateLimiters');

router.use(requireAuth);
router.use(revalidateRole);
router.use(requireRole('owner', 'admin'));

router.get('/roles', userController.getRoles);
router.get('/stats', requirePermission('users:*'), userController.getStats);
router.get('/', requirePermission('users:*'), userController.listUsers);
router.get('/:id', requirePermission('users:*'), userController.getUser);
router.post(
  '/',
  requirePermission('users:*'),
  writeRateLimiter,
  userController.createUser
);
router.put('/:id', requirePermission('users:*'), userController.updateUser);
router.delete('/:id', requirePermission('users:*'), userController.deleteUser);
router.post(
  '/:id/reset-password',
  requirePermission('users:*'),
  writeRateLimiter,
  userController.resetUserPassword
);

module.exports = router;
