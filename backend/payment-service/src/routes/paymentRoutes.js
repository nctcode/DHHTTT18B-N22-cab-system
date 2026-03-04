const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// POST /payments
router.post('/', paymentController.createPayment);

// GET /payments/:id
router.get('/:id', paymentController.getPayment);

// GET /payments/ride/:rideId
router.get('/ride/:rideId', paymentController.getPaymentsByRide);

// POST /payments/:id/confirm
router.post('/:id/confirm', paymentController.confirmPayment);

// POST /payments/:id/refund
router.post('/:id/refund', paymentController.refundPayment);

module.exports = router;