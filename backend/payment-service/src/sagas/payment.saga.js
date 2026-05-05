const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const eventBus = require('../events/eventBus');
const { EVENTS } = require('../events/eventContracts');
const { executeWithRetry } = require('../utils/retry');
const { getAdapter } = require('../adapters/psp.adapter');
const { evaluateFraudAssessment } = require('../services/fraudRule.service');

class PaymentSaga {
  constructor() {
    this.subscribeToEvents();
  }

  subscribeToEvents() {
    eventBus.subscribe(EVENTS.RIDE_FINISHED, this.handleRideFinished.bind(this));
    eventBus.subscribe(EVENTS.WALLET_CREDITED, this.handleWalletCredited.bind(this));
    eventBus.subscribe(EVENTS.WALLET_CREDIT_FAILED, this.handleWalletCreditFailed.bind(this));
    eventBus.subscribe(EVENTS.PAYMENT_RETRY_REQUESTED, this.handlePaymentRetry.bind(this));
  }

  /**
   * Step 1: RideFinished -> Create Payment (PENDING) -> Process Charge
   */
  async handleRideFinished(payload) {
    const { rideId, bookingId, passengerId, amount, method, driverId, fraud_score, fraudScore } = payload;
    console.log(`[Saga] RideFinished received for ride ${rideId}`);

    // IDEMPOTENCY CHECK
    const existingPayment = await prisma.payment.findFirst({
      where: { ride_id: rideId }
    });

    if (existingPayment) {
      console.log(`[Saga] Payment already exists for ride ${rideId}. Skipping creation.`);
      // If stuck, maybe resume? For now, assume idempotency means "done".
      return;
    }

    const fraudAssessment = evaluateFraudAssessment(fraudScore ?? fraud_score);

    try {
      // Create Payment PENDING
      const payment = await prisma.payment.create({
        data: {
          ride_id: rideId,
          passenger_id: passengerId,
          driver_id: driverId,
          amount: parseFloat(amount),
          payment_method: method,
          status: 'PENDING',
          fraud_score: fraudAssessment.fraudScore,
          flagged: fraudAssessment.flagged,
          saga_status: 'STARTED',
          retry_count: 0,
          idempotency_key: `${rideId}:${bookingId || 'no-booking'}`
        }
      });

      eventBus.publish(EVENTS.PAYMENT_STARTED, payment);

      // Trigger Charge
      await this.processCharge(payment, driverId, bookingId);

    } catch (error) {
      console.error(`[Saga] Failed to initialize payment: ${error.message}`);
    }
  }

  async handlePaymentRetry(payload) {
    const { paymentId } = payload;
    console.log(`[Saga] Manual retry requested for payment ${paymentId}`);

    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return;

    // Trigger Charge again
    await this.processCharge(payment, payment.driver_id, payload.bookingId);
  }

  /**
   * Step 2: Process Charge with Retry
   */
  async processCharge(payment, driverId, bookingId = null) {
    const adapter = getAdapter(payment.payment_method);

    const baseIdempotencyKey = payment.idempotency_key || `${payment.ride_id}:${bookingId || 'no-booking'}`;
    const pspIdempotencyKey = `psp:${payment.id}:${baseIdempotencyKey}`;
    
    try {
      let details = {
        idempotencyKey: pspIdempotencyKey,
      };
      if (payment.payment_method === 'CARD') {
         const savedCard = await prisma.savedPaymentMethod.findFirst({
             where: { passenger_id: payment.passenger_id },
             orderBy: { created_at: 'desc' }
         });
         if (!savedCard) throw new Error('No saved card found for passenger');
         details.paymentMethodId = savedCard.payment_method_id;
      }

      const result = await executeWithRetry(async () => {
        return await adapter.charge(payment.amount, payment.payment_method, details);
      }, { maxAttempts: 3, baseDelay: 1000 });

      // CHARGE SUCCESS
      await prisma.payment.update({
        where: { id: payment.id },
        data: { 
          status: 'SUCCESS',
          saga_status: 'CHARGE_SUCCESS',
          psp_reference: result.transactionId
        }
      });

      console.log(`[Saga] Charge successful for ${payment.id}`);
      
      // EMIT SUCCESS to RabbitMQ
      const rabbitmq = require('../messaging/rabbitmq');
      await rabbitmq.publish(
        rabbitmq.config.exchanges.rideEvents,
        'ride.payment.completed',
        {
          eventId: `payment-completed-${payment.id}`,
          type: 'PaymentCompleted',
          rideId: payment.ride_id,
          userId: payment.passenger_id,
          driverId: payment.driver_id,
          paymentMethod: payment.payment_method,
          paymentStatus: 'PAID',
          finalFare: payment.amount,
        }
      );

    } catch (error) {
      // CHARGE FAILED
      console.error(`[Saga] Charge failed for ${payment.id} after retries: ${error.message}`);
      
      await prisma.payment.update({
        where: { id: payment.id },
        data: { 
          status: 'FAILED',
          saga_status: 'RETRY_EXHAUSTED',
          retry_count: 3 // max
        }
      });

      const rabbitmq = require('../messaging/rabbitmq');
      await rabbitmq.publish(
        rabbitmq.config.exchanges.rideEvents,
        'ride.payment.failed',
        {
          eventId: `payment-failed-${payment.id}`,
          type: 'PaymentFailed',
          rideId: payment.ride_id,
          bookingId,
          userId: payment.passenger_id,
          driverId: payment.driver_id,
          paymentMethod: payment.payment_method,
          paymentStatus: 'FAILED',
          error: error.message
        }
      );
    }
  }

  /**
   * For the simplified Card payment flow, Wallet credit and Compensation
   * steps are currently omitted. Further adjustments can be added later.
   */
  async handleWalletCredited(payload) {
    console.log(`[Saga] handleWalletCredited received: ${JSON.stringify(payload)}`);
  }

  async handleWalletCreditFailed(payload) {
    console.log(`[Saga] handleWalletCreditFailed received: ${JSON.stringify(payload)}`);
  }
}

module.exports = new PaymentSaga();
