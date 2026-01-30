const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const authMiddleware = require('../middleware/auth');
const validationMiddleware = require('../middleware/validation');

// Create new booking
router.post(
  '/',
  validationMiddleware.validateBooking,
  bookingController.createBooking
);

// Get booking by ID
router.get('/:bookingId', bookingController.getBooking);

// Update booking status (for internal services)
router.patch(
  '/:bookingId/status',
  authMiddleware.verifyServiceToken,
  bookingController.updateBookingStatus
);

// Assign driver to booking
router.post(
  '/:bookingId/assign-driver',
  authMiddleware.verifyServiceToken,
  bookingController.assignDriver
);

// Cancel booking
router.post('/:bookingId/cancel', bookingController.cancelBooking);

// Search bookings with filters
router.get('/', bookingController.searchBookings);

// Get nearby bookings (for driver app)
router.get(
  '/nearby/search',
  authMiddleware.verifyDriverToken,
  bookingController.getNearbyBookings
);

// Get user booking statistics
router.get('/user/stats', bookingController.getStats);

// Health check
router.get('/health/check', bookingController.healthCheck);

module.exports = router;