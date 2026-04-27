const bookingService = require('../services/booking.service');

exports.createBooking = async (req, res) => {
  try {
    const passengerId = req.user.id;
    const simulateFailAfterInsert =
      process.env.NODE_ENV !== 'production' &&
      req.headers['x-simulate-fail-after-insert'] === '1';

    const booking = await bookingService.createBooking(passengerId, req.body, {
      simulateFailAfterInsert,
    });

    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const passengerId = req.user.id;
    const bookings = await bookingService.getMyBookings(passengerId);
    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBookingById = async (req, res) => {
  try {
    const booking = await bookingService.getBookingById(req.params.id);
    
    // Authorization check: Only owner, admin, or DRIVER can view
    if (booking.passengerId !== req.user.id && req.user.role !== 'ADMIN' && req.user.role !== 'DRIVER') {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

exports.getBookingByIdInternal = async (req, res) => {
  try {
    const booking = await bookingService.getBookingById(req.params.id);
    // No auth check for internal service-to-service calls
    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const passengerId = req.user.id;
    const booking = await bookingService.cancelBooking(req.params.id, passengerId);
    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};