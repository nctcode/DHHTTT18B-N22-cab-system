const logger = require('../utils/logger');
const eventPublisher = require('../events/publishers/booking.publisher');
const { getRedisClient } = require('../config/redis');
const Helpers = require('../utils/helpers');

class NotificationService {
  constructor() {
    this.logger = logger;
    this.redisClient = null;
  }

   async initialize() {
    try {
      this.redisClient = getRedisClient();
      // Check if Redis is ready
      if (this.redisClient && this.redisClient.isReady) {
        logger.info('Notification service Redis initialized');
      } else {
        logger.warn('Redis client not ready in notification service');
      }
    } catch (error) {
      logger.error('Failed to initialize Redis for notification service:', error);
    }
  }

  async notifyNearbyDrivers(booking) {
    try {
      const { bookingId, pickupLocation, vehicleType } = booking;
      
      logger.info(`Notifying nearby drivers for booking ${bookingId}`, {
        location: pickupLocation.coordinates,
        vehicleType
      });
      
      // Calculate search radius based on vehicle type
      const searchRadius = this.calculateSearchRadius(vehicleType);
      
      // Get nearby drivers from driver service (mocked for now)
      const nearbyDrivers = await this.findNearbyDrivers(
        pickupLocation.coordinates,
        searchRadius
      );
      
      // Filter available drivers
      const availableDrivers = nearbyDrivers.filter(driver => 
        driver.status === 'AVAILABLE' && 
        driver.vehicleType === vehicleType
      );
      
      // Send notifications to each driver
      for (const driver of availableDrivers) {
        await this.sendDriverNotification(driver, booking);
      }
      
      // Store notification status in Redis if available
      if (this.redisClient && this.redisClient.isReady) {
        await this.redisClient.setex(
          `notification:booking:${bookingId}:drivers_notified`,
          300, // 5 minutes
          JSON.stringify({
            count: availableDrivers.length,
            timestamp: new Date().toISOString()
          })
        );
      }
      
      logger.info(`Notified ${availableDrivers.length} nearby drivers for booking ${bookingId}`);
      
      return availableDrivers.length;
    } catch (error) {
      logger.error('Error notifying nearby drivers:', error);
      throw error;
    }
  }

  async sendStatusUpdate(booking, oldStatus, newStatus) {
    try {
      const { bookingId, passengerId, driverId } = booking;
      
      logger.info(`Sending status update for booking ${bookingId}: ${oldStatus} → ${newStatus}`);
      
      // Prepare status update data
      const statusUpdate = {
        bookingId,
        oldStatus,
        newStatus,
        timestamp: new Date().toISOString(),
        metadata: {
          passengerId,
          driverId,
          bookingDetails: {
            pickupLocation: booking.pickupLocation?.address,
            destination: booking.destination?.address
          }
        }
      };
      
      // Log the status update
      await this.logNotification({
        type: 'STATUS_UPDATE',
        bookingId,
        recipients: [passengerId, driverId].filter(Boolean),
        status: newStatus,
        timestamp: new Date()
      });
      
      return true;
    } catch (error) {
      logger.error('Error sending status update:', error);
      // Don't throw error for notification failures
    }
  }

  async notifyPassengerDriverAssigned(booking, driverId, eta) {
    try {
      const { bookingId, passengerId } = booking;
      
      logger.info(`Notifying passenger for booking ${bookingId} about driver ${driverId} with ETA ${eta} minutes`);
      
      // Get driver details (mocked)
      const driverDetails = {
        driverId,
        name: `Driver ${driverId.substring(0, 6)}`,
        rating: 4.8,
        vehicle: {
          model: 'Toyota Vios',
          plate: '51G-12345',
          color: 'White'
        },
        photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${driverId}`
      };
      
      // Prepare notification data
      const notificationData = {
        bookingId,
        driver: driverDetails,
        eta,
        pickupLocation: booking.pickupLocation?.address,
        estimatedArrival: new Date(Date.now() + eta * 60000).toISOString()
      };
      
      logger.info(`Passenger ${passengerId} notified about driver assignment`);
      
      return true;
    } catch (error) {
      logger.error('Error notifying passenger:', error);
      throw error;
    }
  }

  async notifyBookingCancelled(booking, cancelledBy) {
    try {
      const { bookingId, passengerId, driverId } = booking;
      
      logger.info(`Notifying about booking cancellation for ${bookingId} by ${cancelledBy}`);
      
      const cancellationData = {
        bookingId,
        cancelledBy,
        reason: booking.cancellationReason,
        timestamp: new Date().toISOString()
      };
      
      // Log the cancellation
      await this.logNotification({
        type: 'BOOKING_CANCELLED',
        bookingId,
        cancelledBy,
        reason: booking.cancellationReason,
        timestamp: new Date()
      });
      
      logger.info(`Cancellation notifications processed for booking ${bookingId}`);
      
      return true;
    } catch (error) {
      logger.error('Error notifying booking cancellation:', error);
      throw error;
    }
  }

  async sendPaymentNotification(booking, paymentStatus) {
    try {
      const { bookingId, passengerId, driverId, fare } = booking;
      
      logger.info(`Sending payment notification for booking ${bookingId}: ${paymentStatus}`);
      
      const paymentData = {
        bookingId,
        status: paymentStatus,
        amount: fare?.totalFare || 0,
        currency: fare?.currency || 'VND',
        timestamp: new Date().toISOString(),
        transactionId: booking.payment?.transactionId
      };
      
      // Log payment notification
      await this.logNotification({
        type: 'PAYMENT_NOTIFICATION',
        bookingId,
        status: paymentStatus,
        amount: fare?.totalFare || 0,
        timestamp: new Date()
      });
      
      return true;
    } catch (error) {
      logger.error('Error sending payment notification:', error);
    }
  }

  async sendETANotification(booking, etaUpdate) {
    try {
      const { bookingId } = booking;
      
      logger.debug(`ETA update processed for booking ${bookingId}: ${etaUpdate.eta} minutes`);
      
      return true;
    } catch (error) {
      logger.error('Error sending ETA notification:', error);
    }
  }

  async sendSurgePricingNotification(booking, surgeMultiplier) {
    try {
      const { bookingId } = booking;
      
      if (surgeMultiplier > 1.0) {
        logger.info(`Surge pricing applied for booking ${bookingId}: ${surgeMultiplier}x`);
      }
      
      return true;
    } catch (error) {
      logger.error('Error sending surge pricing notification:', error);
    }
  }

  // Helper methods
  async findNearbyDrivers(coordinates, radius) {
    try {
      // Mock implementation - in real system, query driver service or Redis Geo
      const mockDrivers = [
        {
          driverId: 'DRIVER001',
          name: 'Nguyen Van A',
          status: 'AVAILABLE',
          vehicleType: 'STANDARD',
          rating: 4.7,
          location: {
            lat: coordinates.lat + 0.001,
            lng: coordinates.lng + 0.001
          }
        },
        {
          driverId: 'DRIVER002',
          name: 'Tran Thi B',
          status: 'AVAILABLE',
          vehicleType: 'STANDARD',
          rating: 4.9,
          location: {
            lat: coordinates.lat - 0.002,
            lng: coordinates.lng + 0.001
          }
        }
      ];
      
      return mockDrivers;
    } catch (error) {
      logger.error('Error finding nearby drivers:', error);
      return [];
    }
  }

  calculateSearchRadius(vehicleType) {
    const radii = {
      'BIKE': 2000,       // 2km for bikes
      'STANDARD': 5000,   // 5km for standard cars
      'PREMIUM': 10000,   // 10km for premium
      'LUXURY': 15000     // 15km for luxury
    };
    
    return radii[vehicleType] || 5000;
  }

  async sendDriverNotification(driver, booking) {
    try {
      // Mock implementation for driver app notification
      logger.debug(`Driver notification sent to ${driver.driverId}`, {
        bookingId: booking.bookingId,
        pickupLocation: booking.pickupLocation?.address,
        fare: booking.fare?.totalFare
      });
      
      return true;
    } catch (error) {
      logger.error('Error sending driver notification:', error);
    }
  }

  async logNotification(notificationLog) {
    try {
      const logEntry = {
        ...notificationLog,
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        service: 'notification-service'
      };
      
      // Store in Redis if available
      if (this.redisClient && this.redisClient.isReady) {
        await this.redisClient.setex(
          `log:notification:${logEntry.id}`,
          86400, // 24 hours
          JSON.stringify(logEntry)
        );
      }
      
      // Always log to console for debugging
      logger.info('Notification logged:', logEntry);
      
      return true;
    } catch (error) {
      logger.error('Error logging notification:', error);
    }
  }

  // Simple health check
  async healthCheck() {
    try {
      const redisStatus = this.redisClient && this.redisClient.isReady 
        ? 'connected' 
        : 'disconnected';
      
      return {
        service: 'notification-service',
        status: 'healthy',
        redis: redisStatus,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        service: 'notification-service',
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Cleanup
  async cleanup() {
    try {
      // Note: We don't disconnect Redis here as it's shared with the main app
      logger.info('Notification service cleanup completed');
    } catch (error) {
      logger.error('Error during notification service cleanup:', error);
    }
  }
}

module.exports = new NotificationService();