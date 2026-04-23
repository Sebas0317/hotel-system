const express = require('express');
const router = express.Router();
const reservasController = require('../controllers/reservasController');

router.get('/', reservasController.getAll);
router.get('/room/:roomId', reservasController.getByRoom);
router.get('/availability', reservasController.getByDateRange);
router.post('/', reservasController.create);
router.put('/:id', reservasController.update);
router.patch('/:id/cancel', reservasController.cancel);
router.patch('/:id/checkin', reservasController.checkIn);
router.patch('/:id/checkout', reservasController.checkOut);

module.exports = router;