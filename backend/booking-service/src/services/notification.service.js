// src/services/notification.service.js
const axios = require('axios');
const logger = require('../utils/logger');
const eventPublisher = require('../events/publishers/booking.publisher');
const redis = require('../config/redis');
const Helpers = require('../utils/helpers');

class NotificationService {
  constructor() {
    this.logger = logger;
    this.redisClient = null;
    this.initializeRedis();
  }

  async initializeRedis() {
  try {
    // Sửa từ: this.redisClient = createRedisClient();
    // Thành:
    this.redisClient = redis(); // hoặc redis.createRedisClient();
    await this.redisClient.connect();
    logger.info('Notification service Redis initialized');
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
      
      // Store notification status in Redis
      await this.redisClient.setex(
        `notification:booking:${bookingId}:drivers_notified`,
        300, // 5 minutes
        JSON.stringify({
          count: availableDrivers.length,
          timestamp: new Date().toISOString()
        })
      );
      
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
      
      // Send WebSocket notification to passenger
      if (passengerId) {
        await this.sendWebSocketNotification(
          `user:${passengerId}`,
          'booking_status_update',
          statusUpdate
        );
      }
      
      // Send WebSocket notification to driver if assigned
      if (driverId) {
        await this.sendWebSocketNotification(
          `driver:${driverId}`,
          'booking_status_update',
          statusUpdate
        );
      }
      
      // Send push notification if enabled
      await this.sendPushNotification(booking, statusUpdate);
      
      // Log notification
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
      // Don't throw error for notification failures to avoid breaking main flow
    }
  }

  async notifyPassengerDriverAssigned(booking, driverId, eta) {
    try {
      const { bookingId, passengerId } = booking;
      
      logger.info(`Notifying passenger for booking ${bookingId} about driver ${driverId} with ETA ${eta} minutes`);
      
      // Get driver details (mocked - in real system, call driver service)
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
      
      // Send WebSocket notification
      await this.sendWebSocketNotification(
        `user:${passengerId}`,
        'driver_assigned',
        notificationData
      );
      
      // Send SMS notification (mocked)
      if (await this.shouldSendSMS(passengerId)) {
        await this.sendSMSNotification(
          passengerId,
          `Your driver ${driverDetails.name} is on the way! ETA: ${eta} minutes`
        );
      }
      
      // Send push notification
      await this.sendPushNotification({
        type: 'DRIVER_ASSIGNED',
        title: 'Driver Assigned!',
        body: `Your driver ${driverDetails.name} is arriving in ${eta} minutes`,
        data: notificationData,
        userId: passengerId
      });
      
      logger.info(`Passenger ${passengerId} notified about driver assignment`);
      
      return true;
    } catch (error) {
      logger.error('Error notifying passenger:', error);
      throw error;
    }
  }

  async notifyBookingCancelled(booking, cancelledBy) {
    try {
      const { bookingId, passengerId, driverId, cancellationReason } = booking;
      
      logger.info(`Notifying about booking cancellation for ${bookingId} by ${cancelledBy}`);
      
      const cancellationData = {
        bookingId,
        cancelledBy,
        reason: cancellationReason,
        timestamp: new Date().toISOString(),
        refundInfo: cancelledBy === 'DRIVER' ? {
          eligible: true,
          amount: booking.fare?.totalFare ? booking.fare.totalFare * 0.5 : 0,
          currency: booking.fare?.currency || 'VND'
        } : null
      };
      
      // Notify the other party
      if (cancelledBy === 'PASSENGER' && driverId) {
        await this.sendWebSocketNotification(
          `driver:${driverId}`,
          'booking_cancelled',
          cancellationData
        );
        
        // Send cancellation fee notification if applicable
        if (booking.assignedAt) {
          const minutesSinceAssignment = Math.floor(
            (new Date() - new Date(booking.assignedAt)) / 60000
          );
          
          if (minutesSinceAssignment < 5) {
            await this.sendCancellationFeeNotification(driverId, booking);
          }
        }
      } else if (cancelledBy === 'DRIVER' && passengerId) {
        await this.sendWebSocketNotification(
          `user:${passengerId}`,
          'booking_cancelled',
          cancellationData
        );
        
        // Apology notification and compensation
        await this.sendApologyNotification(passengerId, booking);
      }
      
      // Send cancellation alert to admin
      await this.sendAdminAlert({
        type: 'BOOKING_CANCELLED',
        bookingId,
        cancelledBy,
        reason: cancellationReason,
        severity: cancelledBy === 'DRIVER' ? 'HIGH' : 'MEDIUM'
      });
      
      logger.info(`Cancellation notifications sent for booking ${bookingId}`);
      
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
      
      // Notify passenger
      if (passengerId) {
        await this.sendWebSocketNotification(
          `user:${passengerId}`,
          'payment_status',
          paymentData
        );
        
        // Send payment receipt
        if (paymentStatus === 'PAID') {
          await this.sendPaymentReceipt(passengerId, booking);
        }
      }
      
      // Notify driver
      if (driverId && paymentStatus === 'PAID') {
        await this.sendWebSocketNotification(
          `driver:${driverId}`,
          'payment_received',
          paymentData
        );
        
        // Send earnings notification
        await this.sendEarningsNotification(driverId, fare?.totalFare || 0);
      }
      
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
      const { bookingId, passengerId } = booking;
      
      const etaData = {
        bookingId,
        eta: etaUpdate.eta,
        distance: etaUpdate.distance,
        driverLocation: etaUpdate.driverLocation,
        timestamp: new Date().toISOString()
      };
      
      // Send WebSocket notification
      await this.sendWebSocketNotification(
        `user:${passengerId}`,
        'eta_update',
        etaData
      );
      
      logger.debug(`ETA update sent for booking ${bookingId}: ${etaUpdate.eta} minutes`);
      
      return true;
    } catch (error) {
      logger.error('Error sending ETA notification:', error);
    }
  }

  async sendSurgePricingNotification(booking, surgeMultiplier) {
    try {
      const { bookingId, passengerId } = booking;
      
      if (surgeMultiplier > 1.0) {
        const surgeData = {
          bookingId,
          surgeMultiplier,
          message: `Surge pricing applied: ${surgeMultiplier}x`,
          timestamp: new Date().toISOString()
        };
        
        await this.sendWebSocketNotification(
          `user:${passengerId}`,
          'surge_pricing',
          surgeData
        );
        
        logger.info(`Surge pricing notification sent for booking ${bookingId}: ${surgeMultiplier}x`);
      }
      
      return true;
    } catch (error) {
      logger.error('Error sending surge pricing notification:', error);
    }
  }

  // Helper methods
  async sendWebSocketNotification(room, event, data) {
    try {
      // This would be implemented with Socket.io
      // For now, we'll log it
      logger.debug(`WebSocket notification to room ${room}: ${event}`, {
        event,
        data: Helpers.maskSensitiveData(data)
      });
      
      // In real implementation:
      // const io = require('../app').getSocketIO();
      // io.to(room).emit(event, data);
      
      return true;
    } catch (error) {
      logger.error('Error sending WebSocket notification:', error);
      throw error;
    }
  }

  async sendPushNotification(notificationData) {
    try {
      // Mock implementation for push notifications
      // In real system, integrate with Firebase Cloud Messaging, Apple Push Notification Service, etc.
      logger.debug('Push notification sent:', {
        type: notificationData.type,
        userId: notificationData.userId,
        title: notificationData.title
      });
      
      return true;
    } catch (error) {
      logger.error('Error sending push notification:', error);
    }
  }

  async sendSMSNotification(userId, message) {
    try {
      // Mock implementation for SMS
      // In real system, integrate with Twilio, Vonage, etc.
      logger.debug(`SMS sent to user ${userId}: ${message.substring(0, 50)}...`);
      
      return true;
    } catch (error) {
      logger.error('Error sending SMS notification:', error);
    }
  }

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

  async shouldSendSMS(userId) {
    // Check user preferences or business rules
    // For now, return true for 50% of users
    return Math.random() > 0.5;
  }

  async sendCancellationFeeNotification(driverId, booking) {
    try {
      const feeData = {
        bookingId: booking.bookingId,
        feeAmount: booking.fare?.totalFare ? booking.fare.totalFare * 0.5 : 0,
        currency: booking.fare?.currency || 'VND',
        reason: 'Passenger cancellation after driver assignment',
        timestamp: new Date().toISOString()
      };
      
      await this.sendWebSocketNotification(
        `driver:${driverId}`,
        'cancellation_fee',
        feeData
      );
      
      logger.info(`Cancellation fee notification sent to driver ${driverId}`);
    } catch (error) {
      logger.error('Error sending cancellation fee notification:', error);
    }
  }

  async sendApologyNotification(passengerId, booking) {
    try {
      const apologyData = {
        bookingId: booking.bookingId,
        message: 'We apologize for the cancellation by the driver',
        compensation: {
          type: 'VOUCHER',
          amount: 20000,
          currency: 'VND',
          code: `APOLOGY${Date.now().toString(36)}`
        },
        timestamp: new Date().toISOString()
      };
      
      await this.sendWebSocketNotification(
        `user:${passengerId}`,
        'apology_notification',
        apologyData
      );
      
      logger.info(`Apology notification sent to passenger ${passengerId}`);
    } catch (error) {
      logger.error('Error sending apology notification:', error);
    }
  }

  async sendAdminAlert(alertData) {
    try {
      // Send to admin dashboard via WebSocket
      await this.sendWebSocketNotification(
        'admin:alerts',
        'new_alert',
        alertData
      );
      
      // Also log to monitoring system
      logger.warn('Admin alert generated:', alertData);
      
      return true;
    } catch (error) {
      logger.error('Error sending admin alert:', error);
    }
  }

  async sendPaymentReceipt(passengerId, booking) {
    try {
      const receipt = {
        bookingId: booking.bookingId,
        amount: booking.fare?.totalFare || 0,
        currency: booking.fare?.currency || 'VND',
        paymentMethod: booking.payment?.method || 'CASH',
        date: new Date().toISOString(),
        items: [
          {
            description: 'Base fare',
            amount: booking.fare?.baseFare || 0
          },
          {
            description: 'Distance fare',
            amount: booking.fare?.distanceFare || 0
          },
          {
            description: 'Time fare',
            amount: booking.fare?.timeFare || 0
          },
          {
            description: 'Surge multiplier',
            amount: booking.fare?.surgeMultiplier || 1.0
          }
        ]
      };
      
      // In real system, this would send an email or save to user's receipt history
      logger.debug(`Payment receipt generated for passenger ${passengerId}`, receipt);
      
      return true;
    } catch (error) {
      logger.error('Error sending payment receipt:', error);
    }
  }

  async sendEarningsNotification(driverId, amount) {
    try {
      const earningsData = {
        amount,
        currency: 'VND',
        bookingCount: 1,
        timestamp: new Date().toISOString(),
        totalEarnings: await this.getDriverTotalEarnings(driverId)
      };
      
      await this.sendWebSocketNotification(
        `driver:${driverId}`,
        'earnings_update',
        earningsData
      );
      
      logger.debug(`Earnings notification sent to driver ${driverId}`);
    } catch (error) {
      logger.error('Error sending earnings notification:', error);
    }
  }

  async getDriverTotalEarnings(driverId) {
    // Mock implementation - in real system, query database
    return Math.floor(Math.random() * 10000000) + 5000000; // 5-15 million VND
  }

  async logNotification(notificationLog) {
    try {
      // Store notification log in database or file
      const logEntry = {
        ...notificationLog,
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      // Store in Redis for quick access
      await this.redisClient.setex(
        `log:notification:${logEntry.id}`,
        86400, // 24 hours
        JSON.stringify(logEntry)
      );
      
      // Also write to file or database for long-term storage
      logger.info('Notification logged:', logEntry);
      
      return true;
    } catch (error) {
      logger.error('Error logging notification:', error);
    }
  }

  // Cleanup
  async cleanup() {
    if (this.redisClient) {
      await this.redisClient.quit();
      logger.info('Notification service Redis connection closed');
    }
  }
}

module.exports = new NotificationService();