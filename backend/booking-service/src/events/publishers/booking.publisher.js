const amqp = require('amqplib');
const logger = require('../../utils/logger');

class BookingEventPublisher {
  constructor() {
    this.channel = null;
    this.exchange = 'booking_events';
  }

  async initialize(channel) {
    this.channel = channel;
    await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
    logger.info('Booking event publisher initialized');
  }

  async publishBookingCreated(booking) {
    try {
      const event = {
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'BOOKING_CREATED',
        timestamp: new Date().toISOString(),
        data: {
          bookingId: booking.bookingId,
          passengerId: booking.passengerId,
          pickupLocation: booking.pickupLocation,
          destination: booking.destination,
          vehicleType: booking.vehicleType,
          status: booking.status,
          metadata: booking.metadata
        }
      };

      await this.channel.publish(
        this.exchange,
        'booking.created',
        Buffer.from(JSON.stringify(event)),
        { persistent: true }
      );

      logger.info(`Published BOOKING_CREATED event for ${booking.bookingId}`);
    } catch (error) {
      logger.error('Error publishing booking created event:', error);
    }
  }

  async publishBookingStatusChanged(data) {
    try {
      const event = {
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'BOOKING_STATUS_CHANGED',
        timestamp: new Date().toISOString(),
        data
      };

      await this.channel.publish(
        this.exchange,
        `booking.status.${data.newStatus.toLowerCase()}`,
        Buffer.from(JSON.stringify(event)),
        { persistent: true }
      );

      logger.info(`Published status change event for booking ${data.bookingId}`);
    } catch (error) {
      logger.error('Error publishing status change event:', error);
    }
  }

  async publishDriverAssigned(data) {
    try {
      const event = {
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'DRIVER_ASSIGNED',
        timestamp: new Date().toISOString(),
        data
      };

      await this.channel.publish(
        this.exchange,
        'booking.driver.assigned',
        Buffer.from(JSON.stringify(event)),
        { persistent: true }
      );

      logger.info(`Published driver assigned event for booking ${data.bookingId}`);
    } catch (error) {
      logger.error('Error publishing driver assigned event:', error);
    }
  }

  async publishBookingCancelled(data) {
    try {
      const event = {
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'BOOKING_CANCELLED',
        timestamp: new Date().toISOString(),
        data
      };

      await this.channel.publish(
        this.exchange,
        'booking.cancelled',
        Buffer.from(JSON.stringify(event)),
        { persistent: true }
      );

      logger.info(`Published booking cancelled event for ${data.bookingId}`);
    } catch (error) {
      logger.error('Error publishing booking cancelled event:', error);
    }
  }
}

module.exports = new BookingEventPublisher();