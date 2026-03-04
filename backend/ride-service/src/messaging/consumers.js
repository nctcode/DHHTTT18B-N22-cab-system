const rabbitmq = require('./rabbitmq');
const axios = require('axios'); // For calling driver-service
const Ride = require('../models/ride.model'); // Need to check if this exists or create it

const DRIVER_SERVICE_URL = process.env.DRIVER_SERVICE_URL || 'http://driver-service:3003';

const startConsumers = async () => {
  await rabbitmq.subscribe(
    rabbitmq.config.exchanges.bookingEvents,
    'ride.created',
    rabbitmq.config.queues.rideCreated,
    handleRideCreated
  );

  // Consume ride.payment.completed
  await rabbitmq.subscribe(
    rabbitmq.config.exchanges.rideEvents,
    'ride.payment.completed',
    'ride_payment_completed_queue', // unique queue name
    handlePaymentCompleted
  );

  // Consume ride.payment.failed
  await rabbitmq.subscribe(
    rabbitmq.config.exchanges.rideEvents,
    'ride.payment.failed',
    'ride_payment_failed_queue', // unique queue name
    handlePaymentFailed
  );
};

const handlePaymentCompleted = async (event) => {
  console.log(`[RideService] Payment completed for ride ${event.rideId}`);
  try {
    const Ride = require('../models/ride.model');
    await Ride.findByIdAndUpdate(event.rideId, { paymentStatus: 'PAID' });
  } catch (error) {
    console.error('Error updating ride payment status (PAID):', error);
  }
};

const handlePaymentFailed = async (event) => {
  console.log(`[RideService] Payment failed for ride ${event.rideId}`);
  try {
    const Ride = require('../models/ride.model');
    await Ride.findByIdAndUpdate(event.rideId, { paymentStatus: 'FAILED' });
  } catch (error) {
    console.error('Error updating ride payment status (FAILED):', error);
  }
};

const handleRideCreated = async (event) => {
  console.log('Processing Ride Created:', event.bookingId);
  
  try {
    // 1. Create Ride Record in DB
    // Assuming Ride model exists
    /*
    const ride = await Ride.create({
      bookingId: event.bookingId,
      userId: event.userId,
      pickup: event.pickup,
      dropoff: event.dropoff,
      status: 'MATCHING'
    });
    */
    
    // 2. Fetch Available Drivers from Driver Service
    // In real world, we might fetch only drivers within a certain radius
    let availableDrivers = [];
    try {
        const driverResponse = await axios.get(`${DRIVER_SERVICE_URL}/api/drivers/nearby`, {
            params: {
                lat: event.pickup.lat,
                lng: event.pickup.lng,
                limit: 10 // Fetch top 10 nearby drivers to send to AI
            }
        });
        if (driverResponse.data.success) {
            availableDrivers = driverResponse.data.data;
        }
    } catch (err) {
        console.error('Failed to fetch nearby drivers:', err.message);
    }

    if (availableDrivers.length === 0) {
         console.log('No nearby drivers found');
         // Publish failed event immediately
         const failedEvent = {
            eventId: event.eventId,
            type: 'RideFailed',
            bookingId: event.bookingId,
            reason: 'No drivers available nearby',
            timestamp: new Date().toISOString()
        };
        await rabbitmq.publish(rabbitmq.config.exchanges.rideEvents, 'ride.failed', failedEvent);
        console.log(`Published ride.failed for booking ${event.bookingId}`);
        return;
    }

    // 3. Call AI Service for Matching
    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:8000';
    let matchedDriverId = null;

    try {
        const matchResponse = await axios.post(`${AI_SERVICE_URL}/api/match`, {
            bookingId: event.bookingId,
            pickup: event.pickup,
            dropoff: event.dropoff,
            drivers: availableDrivers
        });

        if (matchResponse.data.success) {
            matchedDriverId = matchResponse.data.driverId;
            console.log(`AI Matching Score: ${matchResponse.data.score}`);
        }
    } catch (err) {
        console.error('AI Service matching failed:', err.message);
        // Fallback: Pick first driver if AI fails
        if (availableDrivers.length > 0) {
            matchedDriverId = availableDrivers[0].id;
            console.log('Fallback matching used');
        }
    }

    if (matchedDriverId) {
        console.log(`Driver Matched: ${matchedDriverId}`);
        // Publish ride.assigned
        const assignedEvent = {
            eventId: event.eventId,
            type: 'RideAssigned',
            bookingId: event.bookingId,
            driverId: matchedDriverId,
            userId: event.userId, // Include userId for notifications
            pickup: event.pickup,
            dropoff: event.dropoff,
            timestamp: new Date().toISOString()
        };
        
        await rabbitmq.publish(
            rabbitmq.config.exchanges.rideEvents,
            'ride.assigned',
            assignedEvent
        );
        console.log('Published ride.assigned');

        // Publish ride.status.changed for real-time updates
        const statusChangedEvent = {
            eventId: `${Date.now()}-status`,
            type: 'RideStatusChanged',
            rideId: event.bookingId,
            bookingId: event.bookingId,
            status: 'DRIVER_ASSIGNED',
            userId: event.userId,
            driverId: matchedDriverId,
            timestamp: new Date().toISOString()
        };

        await rabbitmq.publish(
            rabbitmq.config.exchanges.rideEvents,
            'ride.status.changed',
            statusChangedEvent
        );
        console.log('Published ride.status.changed: DRIVER_ASSIGNED');
    } else {
        // Should not be reached if drivers > 0, but safe handling
         const failedEvent = {
            eventId: event.eventId,
            type: 'RideFailed',
            bookingId: event.bookingId,
            userId: event.userId,
            reason: 'AI failed to match driver',
            timestamp: new Date().toISOString()
        };
        await rabbitmq.publish(rabbitmq.config.exchanges.rideEvents, 'ride.failed', failedEvent);

        // Also publish status change
        const statusChangedEvent = {
            eventId: `${Date.now()}-status`,
            type: 'RideStatusChanged',
            rideId: event.bookingId,
            bookingId: event.bookingId,
            status: 'FAILED',
            userId: event.userId,
            reason: 'AI failed to match driver',
            timestamp: new Date().toISOString()
        };

        await rabbitmq.publish(
            rabbitmq.config.exchanges.rideEvents,
            'ride.status.changed',
            statusChangedEvent
        );
        console.log('Published ride.status.changed: FAILED');
    }

  } catch (error) {
    console.error('Error handling ride created:', error);
  }
};

module.exports = { startConsumers };
