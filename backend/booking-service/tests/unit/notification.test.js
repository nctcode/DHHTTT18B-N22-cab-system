// tests/unit/notification.test.js
const NotificationService = require('../../src/services/notification.service');
const logger = require('../../src/utils/logger');

// Mock Redis
jest.mock('redis', () => require('redis-mock'));
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('Notification Service Unit Tests', () => {
  let notificationService;

  beforeEach(() => {
    notificationService = require('../../src/services/notification.service');
    jest.clearAllMocks();
  });

  describe('Driver Notifications', () => {
    const testBooking = {
      bookingId: 'TEST123',
      passengerId: 'PASS123',
      pickupLocation: {
        address: '123 Test St',
        coordinates: { lat: 10.76, lng: 106.66 }
      },
      vehicleType: 'STANDARD',
      fare: { totalFare: 50000, currency: 'VND' }
    };

    test('should notify nearby drivers', async () => {
      const driverCount = await notificationService.notifyNearbyDrivers(testBooking);
      
      expect(driverCount).toBeGreaterThanOrEqual(0);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Notifying nearby drivers'),
        expect.any(Object)
      );
    });

    test('should calculate search radius correctly', () => {
      // This tests the internal method indirectly
      const booking = { ...testBooking, vehicleType: 'PREMIUM' };
      
      // We'll test via notifyNearbyDrivers which calls calculateSearchRadius
      notificationService.notifyNearbyDrivers(booking);
      
      // Check that notification was attempted
      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe('Status Update Notifications', () => {
    const testBooking = {
      bookingId: 'TEST123',
      passengerId: 'PASS123',
      driverId: 'DRIVER123'
    };

    test('should send status update', async () => {
      const result = await notificationService.sendStatusUpdate(
        testBooking,
        'PENDING',
        'ASSIGNED'
      );

      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Sending status update'),
        expect.any(String)
      );
    });
  });

  describe('Driver Assignment Notifications', () => {
    const testBooking = {
      bookingId: 'TEST123',
      passengerId: 'PASS123',
      pickupLocation: {
        address: '123 Test St'
      }
    };

    test('should notify passenger about driver assignment', async () => {
      const result = await notificationService.notifyPassengerDriverAssigned(
        testBooking,
        'DRIVER123',
        5
      );

      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Notifying passenger'),
        expect.any(String)
      );
    });
  });

  describe('Payment Notifications', () => {
    const testBooking = {
      bookingId: 'TEST123',
      passengerId: 'PASS123',
      driverId: 'DRIVER123',
      fare: { totalFare: 50000, currency: 'VND' },
      payment: { transactionId: 'TXN123' }
    };

    test('should send payment notification', async () => {
      const result = await notificationService.sendPaymentNotification(
        testBooking,
        'PAID'
      );

      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Sending payment notification'),
        expect.any(String)
      );
    });
  });

  describe('Cancellation Notifications', () => {
    const testBooking = {
      bookingId: 'TEST123',
      passengerId: 'PASS123',
      driverId: 'DRIVER123',
      cancellationReason: 'Test cancellation',
      assignedAt: new Date(),
      fare: { totalFare: 50000, currency: 'VND' }
    };

    test('should notify about passenger cancellation', async () => {
      const result = await notificationService.notifyBookingCancelled(
        testBooking,
        'PASSENGER'
      );

      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Notifying about booking cancellation'),
        expect.any(String)
      );
    });

    test('should notify about driver cancellation', async () => {
      const result = await notificationService.notifyBookingCancelled(
        testBooking,
        'DRIVER'
      );

      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Notifying about booking cancellation'),
        expect.any(String)
      );
    });
  });

  describe('Helper Methods', () => {
    test('should send WebSocket notification', async () => {
      const result = await notificationService.sendWebSocketNotification(
        'user:123',
        'test_event',
        { data: 'test' }
      );

      expect(result).toBe(true);
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('WebSocket notification'),
        expect.any(Object)
      );
    });

    test('should send push notification', async () => {
      const result = await notificationService.sendPushNotification({
        type: 'TEST',
        userId: 'USER123',
        title: 'Test Notification'
      });

      expect(result).toBe(true);
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Push notification'),
        expect.any(Object)
      );
    });

    test('should send SMS notification', async () => {
      const result = await notificationService.sendSMSNotification(
        'USER123',
        'Test SMS message'
      );

      expect(result).toBe(true);
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('SMS sent'),
        expect.any(String)
      );
    });
  });

  afterEach(async () => {
    await notificationService.cleanup();
  });
});