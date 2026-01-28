// src/events/consumers/booking.consumer.js
const logger = require('../../utils/logger');
const Booking = require('../../models/booking.model');
const notificationService = require('../../services/notification.service');

class BookingEventConsumer {
  constructor() {
    this.channel = null;
    this.queues = [];
    this.logger = logger;
  }

  async initialize(channel) {
    try {
      this.channel = channel;
      
      // Assert exchange
      await this.channel.assertExchange('booking_events', 'topic', {
        durable: true
      });
      
      // Create and bind queues for different event types
      await this.setupConsumer('ride.service.queue', 'booking.status.*');
      await this.setupConsumer('payment.service.queue', 'payment.*');
      await this.setupConsumer('notification.queue', 'booking.*');
      await this.setupConsumer('ai.matching.queue', 'booking.created');
      
      logger.info('Booking event consumer initialized');
    } catch (error) {
      logger.error('Error initializing booking event consumer:', error);
      throw error;
    }
  }

  async setupConsumer(queueName, routingKey) {
    try {
      // Assert queue
      const q = await this.channel.assertQueue(queueName, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': 'dlx.exchange',
          'x-dead-letter-routing-key': 'dlx.routing.key'
        }
      });
      
      // Bind queue to exchange with routing key
      await this.channel.bindQueue(q.queue, 'booking_events', routingKey);
      
      // Consume messages
      await this.channel.consume(q.queue, async (msg) => {
        await this.handleMessage(msg);
      }, {
        noAck: false
      });
      
      this.queues.push(q.queue);
      logger.info(`Consumer set up for queue ${queueName} with routing key ${routingKey}`);
    } catch (error) {
      logger.error(`Error setting up consumer for ${queueName}:`, error);
    }
  }

  async handleMessage(msg) {
    let parsedContent;
    try {
      parsedContent = JSON.parse(msg.content.toString());
      logger.info(`Received message: ${parsedContent.type}`, {
        routingKey: msg.fields.routingKey,
        messageId: parsedContent.eventId
      });
      
      // Process message based on type
      await this.processMessage(parsedContent, msg.fields.routingKey);
      
      // Acknowledge message
      this.channel.ack(msg);
      logger.info(`Message ${parsedContent.eventId} processed successfully`);
      
    } catch (error) {
      logger.error('Error processing message:', error, {
        content: parsedContent,
        routingKey: msg.fields.routingKey
      });
      
      // Reject message and don't requeue
      this.channel.nack(msg, false, false);
      
      // Log to dead letter queue
      await this.handleDeadLetter(msg, error);
    }
  }

  async processMessage(content, routingKey) {
    const { type, data } = content;
    
    switch (type) {
      case 'BOOKING_CREATED':
        await this.handleBookingCreated(data);
        break;
        
      case 'BOOKING_STATUS_CHANGED':
        await this.handleStatusChanged(data);
        break;
        
      case 'DRIVER_ASSIGNED':
        await this.handleDriverAssigned(data);
        break;
        
      case 'BOOKING_CANCELLED':
        await this.handleBookingCancelled(data);
        break;
        
      case 'PAYMENT_COMPLETED':
        await this.handlePaymentCompleted(data);
        break;
        
      case 'PAYMENT_FAILED':
        await this.handlePaymentFailed(data);
        break;
        
      default:
        logger.warn(`Unknown message type: ${type}`);
    }
  }

  async handleBookingCreated(data) {
    try {
      const { bookingId, passengerId, pickupLocation, vehicleType } = data;
      
      logger.info(`Processing booking created event for ${bookingId}`);
      
      // Update booking with AI matching score if needed
      const booking = await Booking.findOne({ bookingId });
      if (booking) {
        // Here you would call AI matching service
        // For now, just log
        logger.info(`Booking ${bookingId} ready for AI matching`);
      }
      
      // Trigger notifications
      await notificationService.notifyNearbyDrivers(booking || data);
      
    } catch (error) {
      logger.error('Error handling booking created:', error);
      throw error;
    }
  }

  async handleStatusChanged(data) {
    try {
      const { bookingId, oldStatus, newStatus, metadata } = data;
      
      logger.info(`Status changed for booking ${bookingId}: ${oldStatus} -> ${newStatus}`);
      
      // Update related services based on status change
      const booking = await Booking.findOne({ bookingId });
      if (booking) {
        // Additional processing based on status
        switch (newStatus) {
          case 'IN_PROGRESS':
            // Start trip timer, update driver status, etc.
            break;
          case 'COMPLETED':
            // Trigger payment, rating prompts, etc.
            break;
        }
      }
      
    } catch (error) {
      logger.error('Error handling status changed:', error);
      throw error;
    }
  }

  async handleDriverAssigned(data) {
    try {
      const { bookingId, driverId, eta } = data;
      
      logger.info(`Driver ${driverId} assigned to booking ${bookingId}, ETA: ${eta} minutes`);
      
      // Update driver's current booking
      // Notify other systems about driver assignment
      
    } catch (error) {
      logger.error('Error handling driver assigned:', error);
      throw error;
    }
  }

  async handleBookingCancelled(data) {
    try {
      const { bookingId, cancelledBy, reason } = data;
      
      logger.info(`Booking ${bookingId} cancelled by ${cancelledBy}: ${reason}`);
      
      // Handle cancellation logic
      // Notify relevant parties
      // Process cancellation fees if applicable
      
    } catch (error) {
      logger.error('Error handling booking cancelled:', error);
      throw error;
    }
  }

  async handlePaymentCompleted(data) {
    try {
      const { bookingId, amount, transactionId } = data;
      
      logger.info(`Payment completed for booking ${bookingId}, transaction: ${transactionId}`);
      
      // Update booking payment status
      await Booking.findOneAndUpdate(
        { bookingId },
        { 
          'payment.status': 'PAID',
          'payment.transactionId': transactionId
        }
      );
      
      // Send payment confirmation
      await notificationService.sendPaymentNotification(
        { bookingId, payment: { status: 'PAID' } },
        'PAID'
      );
      
    } catch (error) {
      logger.error('Error handling payment completed:', error);
      throw error;
    }
  }

  async handlePaymentFailed(data) {
    try {
      const { bookingId, reason, transactionId } = data;
      
      logger.error(`Payment failed for booking ${bookingId}: ${reason}`);
      
      // Update booking payment status
      await Booking.findOneAndUpdate(
        { bookingId },
        { 'payment.status': 'FAILED' }
      );
      
      // Notify user about payment failure
      await notificationService.sendPaymentNotification(
        { bookingId, payment: { status: 'FAILED' } },
        'FAILED'
      );
      
    } catch (error) {
      logger.error('Error handling payment failed:', error);
      throw error;
    }
  }

  async handleDeadLetter(msg, error) {
    try {
      // Publish to dead letter exchange
      const dlxChannel = await this.channel;
      await dlxChannel.assertExchange('dlx.exchange', 'topic', { durable: true });
      
      await dlxChannel.publish(
        'dlx.exchange',
        'dlx.routing.key',
        Buffer.from(JSON.stringify({
          originalMessage: msg.content.toString(),
          error: error.message,
          timestamp: new Date().toISOString()
        })),
        { persistent: true }
      );
      
      logger.warn('Message sent to dead letter queue');
    } catch (dlxError) {
      logger.error('Failed to send to dead letter queue:', dlxError);
    }
  }

  async stop() {
    try {
      for (const queue of this.queues) {
        await this.channel.cancel(queue);
      }
      logger.info('Booking event consumer stopped');
    } catch (error) {
      logger.error('Error stopping consumer:', error);
    }
  }
}

module.exports = new BookingEventConsumer();