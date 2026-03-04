const rabbitmq = require('./rabbitmq');
const eventBus = require('../events/eventBus');
const { EVENTS } = require('../events/eventContracts');

const startConsumers = async () => {
  // Listen for ride.payment.process published by ride-service for WALLET payments
  await rabbitmq.subscribe(
    rabbitmq.config.exchanges.rideEvents,
    'ride.payment.process',
    rabbitmq.config.queues.paymentProcess,
    handleRidePaymentProcess
  );
};

const handleRidePaymentProcess = async (event) => {
  console.log('[Payment Consumer] Received ride.payment.process:', event.rideId);
  try {
    // Forward to local EventBus for PaymentSaga to handle
    eventBus.publish(EVENTS.RIDE_FINISHED, {
        rideId: event.rideId,
        passengerId: event.passengerId,
        driverId: event.driverId,
        amount: event.amount,
        method: event.method || 'WALLET'
    });
  } catch (error) {
    console.error('[Payment Consumer] Error forwarding payment process event:', error);
  }
};

module.exports = { startConsumers };
