const express = require('express');
const router = express.Router();
const reservasController = require('../controllers/reservasController');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET /reservas/availability is public (used by guests for availability checks)
router.get('/availability', reservasController.getByDateRange);

// All other routes require authentication
router.use(requireAuth);

router.get(
  '/',
  requireRole('admin', 'owner', 'operator', 'reception'),
  reservasController.getAll
);
router.get(
  '/room/:roomId',
  requireRole('admin', 'owner', 'operator', 'reception'),
  reservasController.getByRoom
);
router.post(
  '/',
  requireRole('admin', 'owner', 'operator', 'reception'),
  reservasController.create
);
router.put('/:id', requireRole('admin', 'owner'), reservasController.update);
router.patch(
  '/:id/cancel',
  requireRole('admin', 'owner', 'operator', 'reception'),
  reservasController.cancel
);
router.patch(
  '/:id/checkin',
  requireRole('admin', 'owner', 'operator', 'reception'),
  reservasController.checkIn
);
router.patch(
  '/:id/checkout',
  requireRole('admin', 'owner', 'operator', 'reception'),
  reservasController.checkOut
);

module.exports = router;
