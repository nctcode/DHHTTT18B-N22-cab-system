const Booking = require('../models/booking.model');
const eventPublisher = require('../events/publishers/booking.publisher');
const notificationService = require('./notification.service');
const createRedisClient = require('../config/redis');
const logger = require('../utils/logger');

class BookingService {
  constructor() {
  // this.redis = redis; // Xóa dòng này
  // Thay bằng:
  this.redisClient = createRedisClient();
  // Hoặc đơn giản hơn, chỉ cần:
  this.redis = createRedisClient;
}

  async createBooking(bookingData, passengerId) {
    try {
      // Validate booking data
      const validatedData = await this.validateBookingData(bookingData);
      
      // Generate AI score for matching
      const aiScore = await this.calculateAIScore(validatedData);
      
      const booking = new Booking({
        ...validatedData,
        passengerId,
        metadata: { aiScore, priority: this.calculatePriority(validatedData) },
        status: 'PENDING',
        requestedAt: new Date()
      });

      await booking.save();
      
      // Cache booking in Redis
      await this.cacheBooking(booking);
      
      // Publish booking created event
      await eventPublisher.publishBookingCreated(booking);
      
      // Send notification to nearby drivers
      await notificationService.notifyNearbyDrivers(booking);
      
      logger.info(`Booking created: ${booking.bookingId} for passenger ${passengerId}`);
      
      return booking;
    } catch (error) {
      logger.error('Error creating booking:', error);
      throw error;
    }
  }

  async getBooking(bookingId, userId) {
    try {
      // Try to get from cache first
      const cached = await this.redis.get(`booking:${bookingId}`);
      if (cached) {
        return JSON.parse(cached);
      }
      
      const booking = await Booking.findOne({ 
        bookingId,
        $or: [{ passengerId: userId }, { driverId: userId }]
      });
      
      if (!booking) {
        throw new Error('Booking not found or access denied');
      }
      
      // Cache booking
      await this.cacheBooking(booking);
      
      return booking;
    } catch (error) {
      logger.error('Error getting booking:', error);
      throw error;
    }
  }

  async updateBookingStatus(bookingId, status, metadata = {}) {
    try {
      const booking = await Booking.findOne({ bookingId });
      
      if (!booking) {
        throw new Error('Booking not found');
      }
      
      const oldStatus = booking.status;
      booking.status = status;
      
      // Update timestamps based on status
      switch (status) {
        case 'ASSIGNED':
          booking.assignedAt = new Date();
          booking.driverId = metadata.driverId;
          break;
        case 'IN_PROGRESS':
          booking.startedAt = new Date();
          break;
        case 'COMPLETED':
          booking.completedAt = new Date();
          break;
        case 'CANCELLED':
          booking.cancelledAt = new Date();
          booking.cancelledBy = metadata.cancelledBy;
          booking.cancellationReason = metadata.reason;
          break;
      }
      
      await booking.save();
      
      // Update cache
      await this.cacheBooking(booking);
      
      // Publish status change event
      await eventPublisher.publishBookingStatusChanged({
        bookingId,
        oldStatus,
        newStatus: status,
        timestamp: new Date(),
        metadata
      });
      
      // Send real-time notification
      await notificationService.sendStatusUpdate(booking, oldStatus, status);
      
      logger.info(`Booking ${bookingId} status changed from ${oldStatus} to ${status}`);
      
      return booking;
    } catch (error) {
      logger.error('Error updating booking status:', error);
      throw error;
    }
  }

  async assignDriver(bookingId, driverId, driverLocation) {
    try {
      const booking = await Booking.findOne({ 
        bookingId,
        status: 'PENDING'
      });
      
      if (!booking) {
        throw new Error('Booking not found or not available for assignment');
      }
      
      // Calculate ETA based on driver location
      const eta = await this.calculateETA(
        driverLocation,
        booking.pickupLocation.coordinates
      );
      
      booking.driverId = driverId;
      booking.status = 'ASSIGNED';
      booking.assignedAt = new Date();
      booking.estimatedDuration = eta;
      
      await booking.save();
      
      // Cache updated booking
      await this.cacheBooking(booking);
      
      // Publish events
      await eventPublisher.publishDriverAssigned({
        bookingId,
        driverId,
        eta,
        timestamp: new Date()
      });
      
      // Notify passenger
      await notificationService.notifyPassengerDriverAssigned(booking, driverId, eta);
      
      logger.info(`Driver ${driverId} assigned to booking ${bookingId}`);
      
      return booking;
    } catch (error) {
      logger.error('Error assigning driver:', error);
      throw error;
    }
  }

  async cancelBooking(bookingId, cancelledBy, reason) {
    try {
      const booking = await Booking.findOne({ bookingId });
      
      if (!booking) {
        throw new Error('Booking not found');
      }
      
      if (!booking.isActive) {
        throw new Error('Cannot cancel completed or cancelled booking');
      }
      
      await booking.cancel(cancelledBy, reason);
      
      // Publish cancellation event
      await eventPublisher.publishBookingCancelled({
        bookingId,
        cancelledBy,
        reason,
        timestamp: new Date()
      });
      
      // Send cancellation notifications
      await notificationService.notifyBookingCancelled(booking, cancelledBy);
      
      // Process cancellation fee if applicable
      if (cancelledBy === 'PASSENGER' && booking.assignedAt) {
        const minutesSinceAssignment = Math.floor(
          (new Date() - booking.assignedAt) / 60000
        );
        
        if (minutesSinceAssignment < 5) {
          // Apply cancellation fee
          await this.applyCancellationFee(booking);
        }
      }
      
      logger.info(`Booking ${bookingId} cancelled by ${cancelledBy}: ${reason}`);
      
      return booking;
    } catch (error) {
      logger.error('Error cancelling booking:', error);
      throw error;
    }
  }

  async searchBookings(filters, pagination = { page: 1, limit: 20 }) {
    try {
      const query = {};
      
      // Apply filters
      if (filters.passengerId) query.passengerId = filters.passengerId;
      if (filters.driverId) query.driverId = filters.driverId;
      if (filters.status) query.status = filters.status;
      if (filters.vehicleType) query.vehicleType = filters.vehicleType;
      
      // Date range filter
      if (filters.startDate || filters.endDate) {
        query.requestedAt = {};
        if (filters.startDate) query.requestedAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.requestedAt.$lte = new Date(filters.endDate);
      }
      
      const skip = (pagination.page - 1) * pagination.limit;
      
      const [bookings, total] = await Promise.all([
        Booking.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(pagination.limit)
          .lean(),
        Booking.countDocuments(query)
      ]);
      
      return {
        bookings,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          pages: Math.ceil(total / pagination.limit)
        }
      };
    } catch (error) {
      logger.error('Error searching bookings:', error);
      throw error;
    }
  }

  async getNearbyBookings(coordinates, maxDistance = 5000) {
    try {
      return await Booking.findNearbyBookings(coordinates, maxDistance);
    } catch (error) {
      logger.error('Error getting nearby bookings:', error);
      throw error;
    }
  }

  async getUserBookingStats(userId, userType) {
    try {
      const stats = await Booking.getUserStats(userId, userType);
      return stats[0] || {
        totalBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        totalEarned: 0,
        avgRating: 0
      };
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }

  // Helper methods
  async validateBookingData(data) {
    // Implement validation logic here
    const requiredFields = ['pickupLocation', 'destination', 'vehicleType'];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Validate coordinates
    if (data.pickupLocation?.coordinates) {
      const { lat, lng } = data.pickupLocation.coordinates;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new Error('Invalid coordinates');
      }
    }
    
    return data;
  }

  async calculateAIScore(bookingData) {
    // Implement AI scoring logic
    // This could integrate with external AI service
    const baseScore = 0.5;
    
    // Factors: time of day, location, vehicle type, etc.
    const hour = new Date().getHours();
    const timeFactor = hour >= 7 && hour <= 9 ? 0.8 : 1.0; // Rush hour bonus
    
    return baseScore * timeFactor;
  }

  calculatePriority(bookingData) {
    // Calculate booking priority
    let priority = 1;
    
    if (bookingData.scheduleTime) {
      priority += 2; // Scheduled bookings have higher priority
    }
    
    if (bookingData.vehicleType === 'PREMIUM' || bookingData.vehicleType === 'LUXURY') {
      priority += 1;
    }
    
    return priority;
  }

  // Sửa hàm calculateETA
async calculateETA(start, end) {
  // start và end là mảng [lng, lat]
  const [lng1, lat1] = start;
  const [lng2, lat2] = end;
  
  const R = 6371; // Earth's radius in km
  const dLat = this.toRad(lat2 - lat1);
  const dLon = this.toRad(lng2 - lng1);
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  // Assume average speed of 30 km/h
  const etaMinutes = Math.round((distance / 30) * 60);
  return Math.max(etaMinutes, 1);
}

toRad(value) {
  return value * Math.PI / 180;
}

  async cacheBooking(booking) {
    try {
      await this.redis.setex(
        `booking:${booking.bookingId}`,
        300, // 5 minutes TTL
        JSON.stringify(booking.toObject ? booking.toObject() : booking)
      );
    } catch (error) {
      logger.warn('Failed to cache booking:', error);
    }
  }

  async applyCancellationFee(booking) {
    // Implement cancellation fee logic
    // This would integrate with payment service
    logger.info(`Applying cancellation fee for booking ${booking.bookingId}`);
    // TODO: Integrate with payment service
  }
}

module.exports = new BookingService();