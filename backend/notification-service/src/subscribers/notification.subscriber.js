const { EVENTS } = require('../events/eventContracts');
const eventBus = require('../events/eventBus');
const notificationService = require('../services/notification.service');

/**
 * Notification Subscriber — Passive event listener.
 * Does NOT initiate business logic, does NOT call other services.
 */
class NotificationSubscriber {

  register() {
    console.log('[Subscriber] Registering notification event handlers...');

    // ─── Ride Lifecycle ───

    eventBus.subscribe(EVENTS.RIDE_CREATED, async (payload) => {
      const { rideId, passengerId } = payload;
      await notificationService.processNotification({
        userId: passengerId,
        eventType: EVENTS.RIDE_CREATED,
        channel: 'PUSH',
        message: `Your ride request #${rideId} has been created. Looking for a driver...`,
        idempotencyKey: `ride_created_${rideId}`,
        metadata: payload
      });
    });

    eventBus.subscribe(EVENTS.RIDE_ASSIGNED, async (payload) => {
      const { rideId, passengerId, driverId, driverName } = payload;
      await notificationService.processNotification({
        userId: passengerId,
        eventType: EVENTS.RIDE_ASSIGNED,
        channel: 'PUSH',
        message: `Driver ${driverName || driverId} has been assigned to your ride #${rideId}.`,
        idempotencyKey: `ride_assigned_passenger_${rideId}`,
        metadata: payload
      });
      await notificationService.processNotification({
        userId: driverId,
        eventType: EVENTS.RIDE_ASSIGNED,
        channel: 'PUSH',
        message: `You have been assigned to ride #${rideId}. Please pick up the passenger.`,
        idempotencyKey: `ride_assigned_driver_${rideId}`,
        metadata: payload
      });
    });

    eventBus.subscribe(EVENTS.RIDE_COMPLETED, async (payload) => {
      const { rideId, passengerId, driverId, fare } = payload;
      await notificationService.processNotification({
        userId: passengerId,
        eventType: EVENTS.RIDE_COMPLETED,
        channel: 'PUSH',
        message: `Your ride #${rideId} is complete. Fare: ${fare || 'N/A'} VND. Thank you!`,
        idempotencyKey: `ride_completed_passenger_${rideId}`,
        metadata: payload
      });
      await notificationService.processNotification({
        userId: driverId,
        eventType: EVENTS.RIDE_COMPLETED,
        channel: 'IN_APP',
        message: `Ride #${rideId} completed. Earnings: ${fare || 'N/A'} VND.`,
        idempotencyKey: `ride_completed_driver_${rideId}`,
        metadata: payload
      });
    });

    // ─── Payment Saga ───

    eventBus.subscribe(EVENTS.PAYMENT_SUCCESS, async (payload) => {
      const { paymentId, amount, rideId } = payload;
      const userId = payload.passengerId || payload.passenger_id;
      await notificationService.processNotification({
        userId: userId || 'system',
        eventType: EVENTS.PAYMENT_SUCCESS,
        channel: 'EMAIL',
        message: `Payment of ${amount} VND for ride #${rideId || 'N/A'} was successful. Ref: ${paymentId}.`,
        idempotencyKey: `payment_success_${paymentId}`,
        metadata: payload
      });
    });

    eventBus.subscribe(EVENTS.PAYMENT_FAILED, async (payload) => {
      const { paymentId, rideId } = payload;
      const userId = payload.passengerId || payload.passenger_id;
      await notificationService.processNotification({
        userId: userId || 'system',
        eventType: EVENTS.PAYMENT_FAILED,
        channel: 'SMS',
        message: `Payment failed for ride #${rideId || 'N/A'}. Please update your payment method. Ref: ${paymentId}.`,
        idempotencyKey: `payment_failed_${paymentId}`,
        metadata: payload
      });
    });

    eventBus.subscribe(EVENTS.PAYMENT_REFUNDED, async (payload) => {
      const { paymentId, amount, rideId } = payload;
      const userId = payload.passengerId || payload.passenger_id;
      await notificationService.processNotification({
        userId: userId || 'system',
        eventType: EVENTS.PAYMENT_REFUNDED,
        channel: 'EMAIL',
        message: `Refund of ${amount || 'N/A'} VND processed for ride #${rideId || 'N/A'}. Ref: ${paymentId}.`,
        idempotencyKey: `payment_refunded_${paymentId}`,
        metadata: payload
      });
    });

    // ─── Surge (logged only, not sent to users) ───

    eventBus.subscribe(EVENTS.SURGE_PRICE_UPDATED, async (payload) => {
      const { zoneId, multiplier, areaName } = payload;
      console.log(`[Subscriber] SurgePriceUpdated: zone=${areaName || zoneId} → ${multiplier}x (logged only)`);
    });

    console.log('[Subscriber] ✅ All notification event handlers registered.');
  }
}

module.exports = new NotificationSubscriber();
