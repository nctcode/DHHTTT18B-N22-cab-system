// src/services/event.service.js
const logger = require('../utils/logger');
const bookingConsumer = require('../events/consumers/booking.consumer');
const constants = require('../config/constants');

class EventService {
  constructor() {
    this.logger = logger;
    this.consumers = [];
    this.channel = null;
    this.isInitialized = false;
  }

  async initialize(channel) {
    try {
      if (this.isInitialized) {
        logger.warn('Event service already initialized');
        return;
      }

      this.channel = channel;
      
      logger.info('Initializing event service...');
      
      // Initialize booking event consumer
      await bookingConsumer.initialize(channel);
      this.consumers.push(bookingConsumer);
      
      // Initialize other consumers here as needed
      // Example: await paymentConsumer.initialize(channel);
      // this.consumers.push(paymentConsumer);
      
      this.isInitialized = true;
      logger.info(`Event service initialized with ${this.consumers.length} consumers`);
      
      // Start monitoring
      this.startMonitoring();
      
    } catch (error) {
      logger.error('Error initializing event service:', error);
      throw error;
    }
  }

  async startConsumers(channel) {
    try {
      if (!channel) {
        throw new Error('RabbitMQ channel is required to start consumers');
      }
      
      await this.initialize(channel);
      
      logger.info('All event consumers started successfully');
      return this.consumers;
    } catch (error) {
      logger.error('Error starting event consumers:', error);
      throw error;
    }
  }

  async stopConsumers() {
    try {
      logger.info('Stopping event consumers...');
      
      for (const consumer of this.consumers) {
        if (consumer.stop && typeof consumer.stop === 'function') {
          await consumer.stop();
          logger.info(`Consumer ${consumer.constructor.name} stopped`);
        }
      }
      
      this.consumers = [];
      this.isInitialized = false;
      
      logger.info('All event consumers stopped');
    } catch (error) {
      logger.error('Error stopping event consumers:', error);
    }
  }

  async restartConsumers(channel) {
    try {
      await this.stopConsumers();
      await this.startConsumers(channel);
      logger.info('Event consumers restarted successfully');
    } catch (error) {
      logger.error('Error restarting event consumers:', error);
      throw error;
    }
  }

  getConsumerStatus() {
    return {
      isInitialized: this.isInitialized,
      totalConsumers: this.consumers.length,
      consumers: this.consumers.map(consumer => ({
        name: consumer.constructor.name,
        status: 'active'
      }))
    };
  }

  async publishEvent(exchange, routingKey, eventData) {
    try {
      if (!this.channel) {
        throw new Error('Event service not initialized. Channel not available.');
      }
      
      const event = {
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: eventData.type || 'CUSTOM_EVENT',
        timestamp: new Date().toISOString(),
        data: eventData
      };
      
      await this.channel.publish(
        exchange,
        routingKey,
        Buffer.from(JSON.stringify(event)),
        { persistent: true }
      );
      
      logger.debug(`Event published: ${event.type} to ${routingKey}`, {
        eventId: event.eventId,
        routingKey
      });
      
      return event.eventId;
    } catch (error) {
      logger.error('Error publishing event:', error);
      throw error;
    }
  }

  async publishBookingEvent(routingKey, eventData) {
    return this.publishEvent(
      constants.RABBITMQ.EXCHANGE,
      routingKey,
      eventData
    );
  }

  startMonitoring() {
    // Monitor consumer health periodically
    setInterval(() => {
      this.monitorConsumers();
    }, 60000); // Every minute
    
    logger.info('Event service monitoring started');
  }

  async monitorConsumers() {
    try {
      if (!this.isInitialized || this.consumers.length === 0) {
        return;
      }
      
      const status = this.getConsumerStatus();
      const healthyConsumers = status.consumers.filter(c => c.status === 'active').length;
      
      logger.debug(`Event service monitoring: ${healthyConsumers}/${status.totalConsumers} consumers active`);
      
      // If any consumer is down, attempt to restart
      if (healthyConsumers < status.totalConsumers && this.channel) {
        logger.warn('Some consumers are down, attempting to restart...');
        await this.restartConsumers(this.channel);
      }
      
      // Log performance metrics
      await this.logMetrics();
      
    } catch (error) {
      logger.error('Error monitoring consumers:', error);
    }
  }

  async logMetrics() {
    try {
      // In a real system, you would collect and log metrics
      // For now, we'll log basic information
      const metrics = {
        timestamp: new Date().toISOString(),
        consumers: this.consumers.length,
        channelActive: this.channel ? true : false,
        memoryUsage: process.memoryUsage()
      };
      
      // Store metrics in Redis or send to monitoring service
      logger.debug('Event service metrics:', metrics);
      
    } catch (error) {
      logger.error('Error logging metrics:', error);
    }
  }

  async handleSystemEvent(event) {
    try {
      const { type, data } = event;
      
      switch (type) {
        case 'SYSTEM_SHUTDOWN':
          await this.stopConsumers();
          break;
          
        case 'SYSTEM_STARTUP':
          // Handle startup logic
          break;
          
        case 'CONSUMER_RESTART':
          if (this.channel) {
            await this.restartConsumers(this.channel);
          }
          break;
          
        default:
          logger.warn(`Unknown system event type: ${type}`);
      }
      
      logger.info(`System event handled: ${type}`);
      
    } catch (error) {
      logger.error('Error handling system event:', error);
    }
  }

  async createQueue(queueName, routingKey, options = {}) {
    try {
      if (!this.channel) {
        throw new Error('Channel not available');
      }
      
      const queueOptions = {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': 'dlx.exchange',
          'x-dead-letter-routing-key': 'dlx.routing.key',
          ...options
        }
      };
      
      const q = await this.channel.assertQueue(queueName, queueOptions);
      
      // Bind to default exchange
      await this.channel.bindQueue(q.queue, constants.RABBITMQ.EXCHANGE, routingKey);
      
      logger.info(`Queue created: ${queueName} bound to ${routingKey}`);
      
      return q.queue;
    } catch (error) {
      logger.error('Error creating queue:', error);
      throw error;
    }
  }

  async deleteQueue(queueName) {
    try {
      if (!this.channel) {
        throw new Error('Channel not available');
      }
      
      await this.channel.deleteQueue(queueName);
      logger.info(`Queue deleted: ${queueName}`);
      
      return true;
    } catch (error) {
      logger.error('Error deleting queue:', error);
      throw error;
    }
  }

  async getQueueStats(queueName) {
    try {
      if (!this.channel) {
        throw new Error('Channel not available');
      }
      
      const queueInfo = await this.channel.checkQueue(queueName);
      
      return {
        queue: queueName,
        messageCount: queueInfo.messageCount,
        consumerCount: queueInfo.consumerCount,
        ...queueInfo
      };
    } catch (error) {
      logger.error('Error getting queue stats:', error);
      return null;
    }
  }

  async purgeQueue(queueName) {
    try {
      if (!this.channel) {
        throw new Error('Channel not available');
      }
      
      await this.channel.purgeQueue(queueName);
      logger.info(`Queue purged: ${queueName}`);
      
      return true;
    } catch (error) {
      logger.error('Error purging queue:', error);
      throw error;
    }
  }

  // Utility method to send test events
  async sendTestEvent(routingKey, testData = {}) {
    try {
      const eventId = await this.publishBookingEvent(routingKey, {
        type: 'TEST_EVENT',
        ...testData,
        testTimestamp: new Date().toISOString()
      });
      
      logger.info(`Test event sent with ID: ${eventId}`);
      return eventId;
    } catch (error) {
      logger.error('Error sending test event:', error);
      throw error;
    }
  }

  // Clean up resources
  async cleanup() {
    try {
      await this.stopConsumers();
      this.channel = null;
      this.isInitialized = false;
      logger.info('Event service cleaned up');
    } catch (error) {
      logger.error('Error cleaning up event service:', error);
    }
  }
}

module.exports = new EventService();