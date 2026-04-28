const rabbitmq = require('./rabbitmq');
const bookingService = require('../services/booking.service');
const logger = require('../utils/logger'); // Assuming logger exists based on service usage

const startConsumers = async () => {
  try {
    // 1. Listen for Ride Creation Failures
    await rabbitmq.subscribe(
      rabbitmq.config.exchanges.rideEvents,
      'ride.failed',
      rabbitmq.config.queues.bookingRideFailed,
      handleRideFailed
    );

    // 2. Listen for Payment Failures
    await rabbitmq.subscribe(
      rabbitmq.config.exchanges.paymentEvents,
      'payment.failed',
      rabbitmq.config.queues.bookingPaymentFailed,
      handlePaymentFailed
    );

    // 3. Listen for Driver Cancellations → Rematching
    await rabbitmq.subscribe(
      rabbitmq.config.exchanges.rideEvents,
      'ride.driver_cancelled',
      rabbitmq.config.queues.bookingDriverCancelled,
      handleDriverCancelled
    );

    logger.info('[Consumers] Booking Service consumers started');
  } catch (error) {
    logger.error('[Consumers] Failed to start consumers:', error);
  }
};

/**
 * Handle Ride Creation/Matching Failure
 * Compensation: Cancel booking
 */
const handleRideFailed = async (event) => {
  logger.info(`[Consumer] Handling ride.failed for booking ${event.bookingId}`);
  try {
    const reason = event.reason || 'Ride service failed to match driver';
    // Update booking status to CANCELLED or FAILED
    await bookingService.updateBookingStatus(event.bookingId, 'FAILED', {
        reason: reason
    });
    logger.info(`[Compensation] Booking ${event.bookingId} marked as FAILED due to ride failure`);
  } catch (error) {
    logger.error(`[Consumer] Error handling ride.failed:`, error);
  }
};

/**
 * Handle Payment Failure
 * Compensation: mark booking as FAILED and publish booking.payment_failed
 */
const handlePaymentFailed = async (event) => {
  logger.info(`[Consumer] Handling payment.failed for booking ${event.bookingId} (Ride: ${event.rideId})`);
  try {
    if (event.bookingId) {
      const updated = await bookingService.updateBookingStatus(event.bookingId, 'FAILED', {
        reason: event.reason || 'Payment transaction failed'
      });

      await rabbitmq.publish(
        rabbitmq.config.exchanges.bookingEvents,
        'booking.payment_failed',
        {
          bookingId: updated._id?.toString?.() || event.bookingId,
          rideId: event.rideId,
          userId: updated.passengerId,
          status: 'FAILED',
          reason: updated.failureReason || event.reason || 'Payment transaction failed',
          timestamp: new Date().toISOString(),
        }
      );

      logger.info(`[Compensation] Booking ${event.bookingId} marked as FAILED due to payment failure`);
    } else {
      logger.warn(`[Consumer] Received payment.failed without bookingId. RideId: ${event.rideId}`);
    }
  } catch (error) {
    logger.error(`[Consumer] Error handling payment.failed:`, error);
  }
};

/**
 * Handle Driver Cancellation (after acceptance)
 * Rematching: exclude driver, reset booking, offer to next
 */
const handleDriverCancelled = async (event) => {
  logger.info(`[Consumer] Handling ride.driver_cancelled for booking ${event.bookingId} (Driver: ${event.driverId})`);
  try {
    await bookingService.handleDriverCancellation(event.bookingId, event.driverId);
    logger.info(`[Rematching] Rematching started for booking ${event.bookingId}`);
  } catch (error) {
    logger.error(`[Consumer] Error handling ride.driver_cancelled:`, error);
  }
};

module.exports = {
  startConsumers
};
