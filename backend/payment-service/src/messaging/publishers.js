const rabbitmq = require('./rabbitmq');
const eventBus = require('../events/eventBus');
const { EVENTS } = require('../events/eventContracts');

const startPublishers = () => {
  // Listen to local saga SUCCESS and publish ride.payment.completed
  eventBus.subscribe(EVENTS.PAYMENT_SUCCESS, async (payment) => {
    console.log(`[Payment Publisher] Publishing ride.payment.completed for payment ${payment.id}`);
    try {
      await rabbitmq.publish(
        rabbitmq.config.exchanges.rideEvents,
        'ride.payment.completed',
        {
          eventId: `${Date.now()}-payment-completed`,
          type: 'PaymentCompleted',
          paymentId: payment.id,
          rideId: payment.ride_id,
          userId: payment.passenger_id,
          driverId: payment.driver_id,
          passengerId: payment.passenger_id,
          amount: payment.amount,
          paymentMethod: payment.payment_method,
          paymentStatus: payment.status,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('[Payment Publisher] Error publishing ride.payment.completed:', error);
    }
  });

  // Listen to local saga FAILED and publish ride.payment.failed
  eventBus.subscribe(EVENTS.PAYMENT_FAILED, async (paymentDetails) => {
    console.log(`[Payment Publisher] Publishing ride.payment.failed for payment/ride ${paymentDetails.rideId}`);
    try {
      await rabbitmq.publish(
        rabbitmq.config.exchanges.rideEvents,
        'ride.payment.failed',
        {
          eventId: `${Date.now()}-payment-failed`,
          type: 'PaymentFailed',
          paymentId: paymentDetails.paymentId,
          rideId: paymentDetails.rideId,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('[Payment Publisher] Error publishing ride.payment.failed:', error);
    }
  });
};

module.exports = { startPublishers };
