const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Internal routes (Service-to-Service, no auth required)
router.get('/internal/bookings/:id', bookingController.getBookingByIdInternal);

// All other routes require authentication (Gateway injects headers, middleware validates)
router.use(authenticateToken);

router.post(
  '/',
  [
    body('pickup').notEmpty().withMessage('pickup is required'),
    body('dropoff').notEmpty().withMessage('dropoff is required'),
    body('vehicleType').isIn(['BIKE', 'CAR', 'PREMIUM', 'ECONOMY', 'SUV']).withMessage('invalid vehicleType'),
    body('estimatedPrice').isFloat({ min: 0 }).withMessage('estimatedPrice must be non-negative'),
    body('paymentMethod').optional().isIn(['CASH', 'WALLET', 'CARD']).withMessage('paymentMethod must be CASH, WALLET, or CARD'),
  ],
  bookingController.createBooking
);
router.get('/my-bookings', bookingController.getMyBookings);
router.get('/:id', bookingController.getBookingById);
router.patch('/:id/cancel', bookingController.cancelBooking);

module.exports = router;