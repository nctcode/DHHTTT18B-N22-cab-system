// Internal API for service-to-service (e.g. ride-service validating bookingId).
// Only for use from internal network; optionally check X-Internal-Service header.
const express = require('express');
const Booking = require('../models/booking.model');
const bookingService = require('../services/booking.service');

const router = express.Router();

// GET /internal/bookings/:id - Check if booking exists (no user auth)
router.get('/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !id.trim()) {
      return res.status(400).json({ success: false, message: 'Booking ID is required' });
    }
    const booking = await Booking.findById(id).lean();
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }
    return res.status(200).json({
      success: true,
      data: {
        id: booking._id,
        userId: booking.userId,
        passengerId: booking.passengerId,
        status: booking.status,
        pickup: booking.pickup,
        dropoff: booking.dropoff,
        vehicleType: booking.vehicleType,
        estimatedPrice: booking.estimatedPrice,
        route: booking.route,
        paymentMethod: booking.paymentMethod,
        paymentStatus: booking.paymentStatus,
      },
    });
  } catch (err) {
    console.error('Internal getBooking error:', err);
    return res.status(500).json({
      success: false,
      message: 'Error fetching booking',
    });
  }
});

// POST /internal/bookings/:id/respond - Driver accept/reject offer
router.post('/bookings/:id/respond', async (req, res) => {
  try {
    const { id } = req.params;
    const { driverUserId, accepted } = req.body;
    if (!driverUserId || accepted === undefined) {
      return res.status(400).json({ success: false, message: 'driverUserId and accepted are required' });
    }
    const booking = await bookingService.handleDriverResponse(
      id, driverUserId, accepted, accepted ? 'ACCEPT' : 'REJECT'
    );
    if (!booking) {
      return res.status(409).json({ success: false, message: 'Booking already processed or not in SEARCHING state' });
    }
    return res.json({ success: true, data: booking });
  } catch (err) {
    console.error('Internal respond error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

