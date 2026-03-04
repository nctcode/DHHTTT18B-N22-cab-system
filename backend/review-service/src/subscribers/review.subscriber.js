const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { EVENTS } = require('../events/eventContracts');
const eventBus = require('../events/eventBus');
const rabbitmq = require('../utils/rabbitmq');

/**
 * Review Subscriber
 * Listens to RideCompleted events and maintains a lightweight read model.
 * This enables ride validation WITHOUT synchronous calls to Ride Service.
 */
class ReviewSubscriber {

  async register() {
    console.log('[ReviewSubscriber] Registering event handlers...');

    // Internal In-Memory Listener
    eventBus.subscribe(EVENTS.RIDE_COMPLETED, async (payload) => {
      const { rideId, passengerId, driverId } = payload;
      console.log(`[ReviewSubscriber] RideCompleted received: ride=${rideId}`);

      try {
        await prisma.rideReadModel.upsert({
          where: { rideId },
          update: {
            status: 'COMPLETED',
            completedAt: new Date()
          },
          create: {
            rideId,
            passengerId,
            driverId,
            status: 'COMPLETED',
            completedAt: new Date()
          }
        });
        console.log(`[ReviewSubscriber] RideReadModel updated for ride ${rideId}`);
      } catch (error) {
        console.error(`[ReviewSubscriber] Failed to update RideReadModel: ${error.message}`);
      }
    });

    eventBus.subscribe(EVENTS.REVIEW_CREATED, async (payload) => {
      console.log(`[ReviewSubscriber] Forwarding REVIEW_CREATED to RabbitMQ: review=${payload.reviewId}`);
      try {
        await rabbitmq.publish(rabbitmq.config.exchanges.reviewEvents, 'review.created', payload);
      } catch (error) {
        console.error(`[ReviewSubscriber] Failed to publish review.created to RabbitMQ: ${error.message}`);
      }
    });

    // External RabbitMQ Listener -> Internal EventBus
    try {
      await rabbitmq.subscribe(
        rabbitmq.config.exchanges.rideEvents,
        'ride.completed',
        rabbitmq.config.queues.reviewRideCompleted,
        async (payload) => {
          console.log(`[ReviewSubscriber] Received RabbitMQ ride.completed for ride=${payload.rideId}`);
          eventBus.publish(EVENTS.RIDE_COMPLETED, {
            rideId: payload.rideId,
            passengerId: payload.userId, // Map from payload.userId -> passengerId
            driverId: payload.driverId
          });
        }
      );
    } catch (err) {
      console.error('[ReviewSubscriber] Failed to subscribe to ride.completed', err);
    }

    console.log('[ReviewSubscriber] ✅ Event handlers registered.');
  }
}

module.exports = new ReviewSubscriber();
