const bookingService = require('../services/booking.service');
const validation = require('../utils/validation');
const logger = require('../utils/logger');

class BookingController {
  async createBooking(req, res, next) {
    try {
      const passengerId = req.user.id;
      const bookingData = req.body;
      
      // Validate request
      await validation.validateBookingCreate(bookingData);
      
      const booking = await bookingService.createBooking(bookingData, passengerId);
      
      res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        data: booking
      });
    } catch (error) {
      logger.error('Create booking error:', error);
      next(error);
    }
  }

  async getBooking(req, res, next) {
    try {
      const { bookingId } = req.params;
      const userId = req.user.id;
      
      const booking = await bookingService.getBooking(bookingId, userId);
      
      res.json({
        success: true,
        data: booking
      });
    } catch (error) {
      logger.error('Get booking error:', error);
      next(error);
    }
  }

  async updateBookingStatus(req, res, next) {
    try {
      const { bookingId } = req.params;
      const { status, metadata } = req.body;
      
      // Validate status transition
      await validation.validateStatusUpdate(status, metadata);
      
      const booking = await bookingService.updateBookingStatus(bookingId, status, metadata);
      
      res.json({
        success: true,
        message: 'Booking status updated',
        data: booking
      });
    } catch (error) {
      logger.error('Update booking status error:', error);
      next(error);
    }
  }

  async assignDriver(req, res, next) {
    try {
      const { bookingId } = req.params;
      const { driverId, driverLocation } = req.body;
      
      await validation.validateDriverAssignment(driverId, driverLocation);
      
      const booking = await bookingService.assignDriver(bookingId, driverId, driverLocation);
      
      res.json({
        success: true,
        message: 'Driver assigned successfully',
        data: booking
      });
    } catch (error) {
      logger.error('Assign driver error:', error);
      next(error);
    }
  }

  async cancelBooking(req, res, next) {
    try {
      const { bookingId } = req.params;
      const { reason } = req.body;
      const cancelledBy = req.user.type || 'PASSENGER';
      
      const booking = await bookingService.cancelBooking(bookingId, cancelledBy, reason);
      
      res.json({
        success: true,
        message: 'Booking cancelled',
        data: booking
      });
    } catch (error) {
      logger.error('Cancel booking error:', error);
      next(error);
    }
  }

  async searchBookings(req, res, next) {
    try {
      const filters = {
        passengerId: req.user.type === 'passenger' ? req.user.id : req.query.passengerId,
        driverId: req.user.type === 'driver' ? req.user.id : req.query.driverId,
        status: req.query.status,
        vehicleType: req.query.vehicleType,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };
      
      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20
      };
      
      const result = await bookingService.searchBookings(filters, pagination);
      
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      logger.error('Search bookings error:', error);
      next(error);
    }
  }

  async getNearbyBookings(req, res, next) {
    try {
      const { lat, lng, maxDistance = 5000 } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          error: 'Latitude and longitude are required'
        });
      }
      
      const bookings = await bookingService.getNearbyBookings(
        { lat: parseFloat(lat), lng: parseFloat(lng) },
        parseInt(maxDistance)
      );
      
      res.json({
        success: true,
        count: bookings.length,
        data: bookings
      });
    } catch (error) {
      logger.error('Get nearby bookings error:', error);
      next(error);
    }
  }

  async getStats(req, res, next) {
    try {
      const userId = req.user.id;
      const userType = req.user.type;
      
      const stats = await bookingService.getUserBookingStats(userId, userType);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Get stats error:', error);
      next(error);
    }
  }

  async healthCheck(req, res) {
    try {
      // Check database connection
      const dbStatus = await bookingService.checkDatabaseHealth();
      
      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: dbStatus ? 'connected' : 'disconnected',
          redis: 'connected', // Add actual check
          rabbitmq: 'connected' // Add actual check
        }
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: error.message
      });
    }
  }
}

module.exports = new BookingController();