const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/payment.controller');
const stripeRoutes = require('./stripe.routes');

router.use('/stripe', stripeRoutes);

router.post('/', ctrl.createPayment);
router.get('/:id', ctrl.getPayment);
router.get('/ride/:rideId', ctrl.getByRide);
router.get('/passenger/:passengerId', ctrl.getByPassenger);

router.patch('/:id/success', ctrl.successPayment);
router.patch('/:id/fail', ctrl.failPayment);
router.patch('/:id/refund', ctrl.refundPayment);
router.post('/:rideId/retry', ctrl.retryPayment);

module.exports = router;
