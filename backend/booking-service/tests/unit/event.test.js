// tests/unit/event.test.js
const EventService = require('../../src/services/event.service');
const BookingEventPublisher = require('../../src/events/publishers/booking.publisher');
const logger = require('../../src/utils/logger');

// Mock RabbitMQ channel
const mockChannel = {
  assertExchange: jest.fn(),
  assertQueue: jest.fn().mockResolvedValue({ queue: 'test.queue' }),
  bindQueue: jest.fn(),
  publish: jest.fn(),
  consume: jest.fn(),
  ack: jest.fn(),
  nack: jest.fn(),
  deleteQueue: jest.fn(),
  checkQueue: jest.fn().mockResolvedValue({
    messageCount: 0,
    consumerCount: 1
  }),
  purgeQueue: jest.fn(),
  close: jest.fn()
};

// Mock logger to avoid console output during tests
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('Event Service Unit Tests', () => {
  let eventService;

  beforeEach(() => {
    eventService = require('../../src/services/event.service');
    jest.clearAllMocks();
  });

  describe('Event Publishing', () => {
    test('should publish event successfully', async () => {
      // Initialize event service with mock channel
      await eventService.initialize(mockChannel);

      const eventData = {
        type: 'TEST_EVENT',
        bookingId: 'TEST123',
        data: { test: true }
      };

      const eventId = await eventService.publishEvent(
        'test.exchange',
        'test.routing.key',
        eventData
      );

      expect(mockChannel.publish).toHaveBeenCalledWith(
        'test.exchange',
        'test.routing.key',
        expect.any(Buffer),
        { persistent: true }
      );

      expect(eventId).toMatch(/^evt_\d+_[\w\d]+$/);
    });

    test('should throw error when channel not available', async () => {
      // Don't initialize, so channel is null
      await expect(
        eventService.publishEvent('exchange', 'routing.key', {})
      ).rejects.toThrow('Event service not initialized');
    });
  });

  describe('Consumer Management', () => {
    test('should initialize consumers', async () => {
      await eventService.initialize(mockChannel);

      expect(mockChannel.assertExchange).toHaveBeenCalledWith(
        'booking_events',
        'topic',
        { durable: true }
      );

      const status = eventService.getConsumerStatus();
      expect(status.isInitialized).toBe(true);
      expect(status.totalConsumers).toBeGreaterThan(0);
    });

    test('should stop consumers', async () => {
      await eventService.initialize(mockChannel);
      await eventService.stopConsumers();

      const status = eventService.getConsumerStatus();
      expect(status.isInitialized).toBe(false);
      expect(status.totalConsumers).toBe(0);
    });
  });

  describe('Queue Operations', () => {
    test('should create queue', async () => {
      await eventService.initialize(mockChannel);

      const queueName = await eventService.createQueue(
        'test.queue',
        'test.routing.key'
      );

      expect(mockChannel.assertQueue).toHaveBeenCalledWith(
        'test.queue',
        expect.objectContaining({
          durable: true,
          arguments: expect.objectContaining({
            'x-dead-letter-exchange': 'dlx.exchange'
          })
        })
      );

      expect(mockChannel.bindQueue).toHaveBeenCalled();
      expect(queueName).toBe('test.queue');
    });

    test('should get queue stats', async () => {
      await eventService.initialize(mockChannel);

      const stats = await eventService.getQueueStats('test.queue');

      expect(mockChannel.checkQueue).toHaveBeenCalledWith('test.queue');
      expect(stats).toHaveProperty('messageCount');
      expect(stats).toHaveProperty('consumerCount');
    });

    test('should delete queue', async () => {
      await eventService.initialize(mockChannel);

      await eventService.deleteQueue('test.queue');

      expect(mockChannel.deleteQueue).toHaveBeenCalledWith('test.queue');
    });

    test('should purge queue', async () => {
      await eventService.initialize(mockChannel);

      await eventService.purgeQueue('test.queue');

      expect(mockChannel.purgeQueue).toHaveBeenCalledWith('test.queue');
    });
  });

  describe('System Events', () => {
    test('should handle SYSTEM_SHUTDOWN event', async () => {
      await eventService.initialize(mockChannel);
      
      const stopConsumersSpy = jest.spyOn(eventService, 'stopConsumers');
      
      await eventService.handleSystemEvent({
        type: 'SYSTEM_SHUTDOWN',
        data: {}
      });

      expect(stopConsumersSpy).toHaveBeenCalled();
    });

    test('should handle CONSUMER_RESTART event', async () => {
      await eventService.initialize(mockChannel);
      
      const restartSpy = jest.spyOn(eventService, 'restartConsumers');
      
      await eventService.handleSystemEvent({
        type: 'CONSUMER_RESTART',
        data: { reason: 'test' }
      });

      expect(restartSpy).toHaveBeenCalledWith(mockChannel);
    });
  });

  describe('Error Handling', () => {
    test('should handle queue creation error', async () => {
      mockChannel.assertQueue.mockRejectedValueOnce(new Error('Queue error'));
      
      await eventService.initialize(mockChannel);

      await expect(
        eventService.createQueue('error.queue', 'routing.key')
      ).rejects.toThrow('Queue error');
    });

    test('should return null for queue stats on error', async () => {
      mockChannel.checkQueue.mockRejectedValueOnce(new Error('Check error'));
      
      await eventService.initialize(mockChannel);

      const stats = await eventService.getQueueStats('nonexistent.queue');
      
      expect(stats).toBeNull();
    });
  });

  describe('Test Event', () => {
    test('should send test event', async () => {
      await eventService.initialize(mockChannel);

      const eventId = await eventService.sendTestEvent(
        'test.routing.key',
        { custom: 'data' }
      );

      expect(eventId).toMatch(/^evt_\d+_[\w\d]+$/);
      expect(mockChannel.publish).toHaveBeenCalled();
    });
  });

  afterEach(async () => {
    await eventService.cleanup();
  });
});