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
 * Compensation: Mark booking as PAYMENT_FAILED (or Cancelled)
 */
const handlePaymentFailed = async (event) => {
  logger.info(`[Consumer] Handling payment.failed for booking ${event.bookingId} (Ride: ${event.rideId})`);
  try {
    // Ideally booking has a direct link, or we look it up. 
    // If the event only has rideId, we might need to find the booking associated with that ride.
    // However, in the provided architecture, bookingId is usually passed along.
    
    if (event.bookingId) {
        await bookingService.updateBookingStatus(event.bookingId, 'PAYMENT_FAILED', {
            reason: 'Payment transaction failed'
        });
        logger.info(`[Compensation] Booking ${event.bookingId} marked as PAYMENT_FAILED`);
    } else {
        logger.warn(`[Consumer] Received payment.failed without bookingId. RideId: ${event.rideId}`);
        // TODO: potential lookup by rideId if needed
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
