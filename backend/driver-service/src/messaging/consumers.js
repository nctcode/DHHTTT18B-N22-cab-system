// src/messaging/consumers.js
const rabbitmq = require('./rabbitmq');
const DriverService = require('../services/driver.service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const startConsumers = async () => {
  console.log('[Driver Service] Starting event consumers...');

  // Subscribe to ride.assigned events
  await rabbitmq.subscribe(
    rabbitmq.config.exchanges.rideEvents,
    'ride.assigned',
    rabbitmq.config.queues.driverRideAssigned,
    handleRideAssigned
  );

  // Subscribe to ride.payment.completed events (for earnings)
  await rabbitmq.subscribe(
    rabbitmq.config.exchanges.rideEvents,
    'ride.payment.completed',
    rabbitmq.config.queues.driverPaymentCompleted,
    handlePaymentCompleted
  );

  // Subscribe to driver.location.updated events
  await rabbitmq.subscribe(
    rabbitmq.config.exchanges.driverEvents,
    'driver.location.updated',
    'driver_service_location_queue', // Specific queue for this service
    handleDriverLocationUpdated
  );

  // Subscribe to review.created events (for rating updates)
  await rabbitmq.subscribe(
    rabbitmq.config.exchanges.reviewEvents,
    'review.created',
    rabbitmq.config.queues.driverRatingUpdate,
    handleReviewCreated
  );

  console.log('[Driver Service] All consumers started');
};

/**
 * Handle driver location update
 */
/**
 * Handle driver location update
 */
const handleDriverLocationUpdated = async (event) => {
    try {
        const { driverId, location } = event; // driverId here is userId
        
        // Find driver by user_id
        const driver = await prisma.driver.findFirst({
            where: { user_id: driverId }
        });

        if (driver) {
            await DriverService.updateLocation(driver.id, location.lat, location.lng);
            console.log(`[Driver Service] Location updated for driver ${driver.id} (User ${driverId})`);
        } else {
             console.warn(`[Driver Service] Driver not found for user_id: ${driverId}`);
        }
    } catch (error) {
        console.error('[Driver Service] Failed to update location:', error.message);
    }
};

/**
 * Handle ride assigned event
 */
const handleRideAssigned = async (event) => {
  console.log('[Driver Service] Processing ride.assigned:', event);
  
  try {
    const { driverId, bookingId, rideId } = event; // driverId is userId

    // Find driver by user_id
    const driver = await prisma.driver.findFirst({
        where: { user_id: driverId }
    });

    if (!driver) {
        console.warn(`[Driver Service] Driver not found for user_id: ${driverId}, cannot update status`);
        return;
    }

    // Update driver status to BUSY
    await prisma.driver.update({
        where: { id: driver.id },
        data: { 
            is_available: false, // Busy
        }
    });

    console.log(`✅ Driver ${driver.id} (User ${driverId}) status updated to BUSY for ride ${rideId || bookingId}`);

    // Publish acknowledgment
    const ackEvent = {
        eventId: `${Date.now()}-${driverId}`,
        type: 'DriverAssignedAck',
        driverId, // Send back userId as driverId for consistency with other services
        bookingId,
        rideId: rideId || bookingId,
        status: 'ACKNOWLEDGED',
        timestamp: new Date().toISOString()
    };
    
    // ... publish ack ...
    await rabbitmq.publish(
      rabbitmq.config.exchanges.driverEvents,
      'driver.assigned.ack',
      ackEvent
    );

  } catch (error) {
    console.error('[Driver Service] Error handling ride.assigned:', error);
  }
};

/**
 * Handle ride.payment.completed event
 * Record earnings and free up driver
 */
const handlePaymentCompleted = async (event) => {
  console.log('[Driver Service] Processing ride.payment.completed:', event);

  try {
    const { rideId, driverId, finalFare, paymentMethod } = event;
    // driverId in event is userId (from ride-service)
    
    if (!driverId) {
        console.warn('[Driver Service] No driverId in payment event, cannot record earnings');
        return;
    }

    // Find driver by user_id
    const driver = await prisma.driver.findFirst({
        where: { user_id: driverId }
    });

    if (!driver) {
        console.warn(`[Driver Service] Driver not found for user_id: ${driverId}`);
        return;
    }

    // Create Earnings Record via Prisma
    const amount = parseFloat(finalFare || 0) * 0.8; // 20% platform fee
    await prisma.driverEarnings.create({
      data: {
        driver_id: driver.id,
        ride_id: rideId,
        amount: amount
      }
    });

    // Update Driver Status to Available
    await prisma.driver.update({
        where: { id: driver.id },
        data: { is_available: true }
    });

    console.log(`✅ Driver ${driver.id} (User ${driverId}) earnings ${amount} recorded, status set to ONLINE`);

  } catch (error) {
    console.error('[Driver Service] Error handling ride.payment.completed:', error);
  }
};

/**
 * Handle review created event
 * Fetch new average rating and update driver
 */
const handleReviewCreated = async (event) => {
  console.log('[Driver Service] Processing review.created:', event);

  try {
    const { targetUserId, averageRating, rating } = event;
    
    // 1. Check if this target user is a driver
    const driver = await prisma.driver.findFirst({
        where: { user_id: targetUserId }
    });

    if (!driver) {
      console.log(`[Driver Service] Ignored review for user ${targetUserId}, not a driver.`);
      return;
    }

    // 2. Use averageRating from event payload directly (no HTTP call needed)
    const newRating = averageRating || rating || driver.rating_avg;
      
    // 3. Update driver rating_avg
    await prisma.driver.update({
        where: { id: driver.id },
        data: { rating_avg: parseFloat(newRating) }
    });
    console.log(`✅ Driver ${driver.id} rating updated to ${newRating}`);

  } catch (error) {
    console.error('[Driver Service] Error handling review.created:', error.message);
  }
};

module.exports = { startConsumers };
