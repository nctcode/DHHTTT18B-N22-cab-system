// src/socket/eventBridge.js
/**
 * Event Bridge: RabbitMQ → Socket.IO
 * Listens to RabbitMQ events and broadcasts them to connected WebSocket clients
 */

const amqplib = require('amqplib');

let channel = null;
let io = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';

/**
 * Initialize the event bridge
 * @param {SocketIO.Server} socketIoInstance - Socket.IO server instance
 */
const initializeEventBridge = async (socketIoInstance) => {
  io = socketIoInstance;
  
  try {
    const connection = await amqplib.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    
    // Assert exchanges
    await channel.assertExchange('ride.events', 'topic', { durable: true });
    await channel.assertExchange('driver.events', 'topic', { durable: true });
    await channel.assertExchange('booking.events', 'topic', { durable: true });
    
    console.log('[Event Bridge] RabbitMQ connected');

    // Subscribe to all events for WebSocket broadcasting
    await subscribeToRideEvents();
    await subscribeToDriverEvents();
    await subscribeToBookingEvents();

    connection.on('close', () => {
      console.error('[Event Bridge] RabbitMQ connection closed, reconnecting...');
      setTimeout(() => initializeEventBridge(socketIoInstance), 5000);
    });

    connection.on('error', (err) => {
      console.error('[Event Bridge] RabbitMQ error:', err);
    });

  } catch (error) {
    console.error('[Event Bridge] Failed to connect to RabbitMQ:', error);
    setTimeout(() => initializeEventBridge(socketIoInstance), 5000);
  }
};

/**
 * Subscribe to ride events and broadcast to WebSocket clients
 */
const subscribeToRideEvents = async () => {
  const queue = 'socket.ride.events';
  
  await channel.assertQueue(queue, { durable: true });
  
  // Bind to all ride events using wildcard
  await channel.bindQueue(queue, 'ride.events', 'ride.#');
  
  channel.consume(queue, (msg) => {
    if (msg !== null) {
      try {
        const event = JSON.parse(msg.content.toString());
        handleRideEvent(event, msg.fields.routingKey);
        channel.ack(msg);
      } catch (error) {
        console.error('[Event Bridge] Error processing ride event:', error);
        channel.ack(msg);
      }
    }
  });

  console.log('[Event Bridge] Subscribed to ride.events');
};

/**
 * Subscribe to driver events and broadcast to WebSocket clients
 */
const subscribeToDriverEvents = async () => {
  const queue = 'socket.driver.events';
  
  await channel.assertQueue(queue, { durable: true });
  
  // Bind to driver location updates
  await channel.bindQueue(queue, 'driver.events', 'driver.location.updated');
  await channel.bindQueue(queue, 'driver.events', 'driver.assigned.ack');
  
  channel.consume(queue, (msg) => {
    if (msg !== null) {
      try {
        const event = JSON.parse(msg.content.toString());
        handleDriverEvent(event, msg.fields.routingKey);
        channel.ack(msg);
      } catch (error) {
        console.error('[Event Bridge] Error processing driver event:', error);
        channel.ack(msg);
      }
    }
  });

  console.log('[Event Bridge] Subscribed to driver.events');
};

/**
 * Subscribe to booking events and broadcast to WebSocket clients
 */
const subscribeToBookingEvents = async () => {
  const queue = 'socket.booking.events';
  
  await channel.assertQueue(queue, { durable: true });
  
  // Bind to booking events
  await channel.bindQueue(queue, 'booking.events', 'booking.#');
  
  channel.consume(queue, (msg) => {
    if (msg !== null) {
      try {
        const event = JSON.parse(msg.content.toString());
        handleBookingEvent(event, msg.fields.routingKey);
        channel.ack(msg);
      } catch (error) {
        console.error('[Event Bridge] Error processing booking event:', error);
        channel.ack(msg);
      }
    }
  });

  console.log('[Event Bridge] Subscribed to booking.events');
};

/**
 * Handle ride events and emit to appropriate rooms
 */
const handleRideEvent = (event, routingKey) => {
  if (!io) return;

  console.log(`[Event Bridge] Handling ride event: ${routingKey}`, JSON.stringify(event, null, 2));

  const { bookingId, rideId, userId, driverId } = event;
  const targetRideId = rideId || bookingId;
  
  if (routingKey === 'ride.assigned') {
      console.log(`DEBUG: ride.assigned found. Target Room: ride:${targetRideId}`);
      console.log(`DEBUG: Emitting to user:${userId} (Passenger)`);
      console.log(`DEBUG: Emitting to user:${driverId} (Driver)`);
  }

  switch (routingKey) {
    case 'ride.assigned':
      // Emit to ride room (both customer and driver will join this room)
      io.to(`ride:${targetRideId}`).emit('ride:assigned', event);
      
      // Also emit to specific user rooms
      if (userId) {
        io.to(`user:${userId}`).emit('ride:assigned', event);
      }
      if (driverId) {
        io.to(`user:${driverId}`).emit('ride:assigned', event);
      }
      
      console.log(`📤 [WebSocket] Emitted ride:assigned to ride:${targetRideId}`);
      break;

    case 'ride.status.changed':
      // Broadcast status change to ride room
      io.to(`ride:${targetRideId}`).emit('ride:statusChanged', event);
      
      if (userId) {
        io.to(`user:${userId}`).emit('ride:statusChanged', event);
      }
      if (driverId) {
        io.to(`user:${driverId}`).emit('ride:statusChanged', event);
      }
      
      console.log(`📤 [WebSocket] Emitted ride:statusChanged (${event.status}) to ride:${targetRideId}`);
      break;

    case 'ride.failed':
      // Notify user of failure
      if (userId) {
        io.to(`user:${userId}`).emit('ride:failed', event);
      }
      
      console.log(`📤 [WebSocket] Emitted ride:failed to user:${userId}`);
      break;

    case 'ride.cancelled':
      // Notify both driver and passenger of cancellation
      if (driverId) {
        io.to(`user:${driverId}`).emit('ride:cancelled', event);
      }
      if (userId) {
        io.to(`user:${userId}`).emit('ride:cancelled', event);
      }
      io.to(`ride:${targetRideId}`).emit('ride:cancelled', event);
      console.log(`📤 [WebSocket] Emitted ride:cancelled to ride:${targetRideId}`);
      break;

    case 'ride.started':
      // Emit distinct ride:started event with tripRoute so driver app can swap to trip route
      io.to(`ride:${targetRideId}`).emit('ride:started', event);
      if (userId) {
        io.to(`user:${userId}`).emit('ride:started', event);
      }
      if (driverId) {
        io.to(`user:${driverId}`).emit('ride:started', event);
      }
      console.log(`📤 [WebSocket] Emitted ride:started to ride:${targetRideId}`);
      break;

    case 'ride.completed':
      io.to(`ride:${targetRideId}`).emit('ride:completed', event);
      if (userId) {
        io.to(`user:${userId}`).emit('ride:completed', event);
      }
      if (driverId) {
        io.to(`user:${driverId}`).emit('ride:completed', event);
      }
      console.log(`📤 [WebSocket] Emitted ride:completed to ride:${targetRideId}`);
      break;

    case 'ride.payment.process':
      // Not forwarded to clients, this is for backend processing
      break;

    case 'ride.payment.completed':
      io.to(`ride:${targetRideId}`).emit('ride:paymentCompleted', event);
      if (userId) io.to(`user:${userId}`).emit('ride:paymentCompleted', event);
      if (driverId) io.to(`user:${driverId}`).emit('ride:paymentCompleted', event);
      console.log(`📤 [WebSocket] Emitted ride:paymentCompleted to ride:${targetRideId}`);
      break;

    case 'ride.payment.failed':
      io.to(`ride:${targetRideId}`).emit('ride:paymentFailed', event);
      if (userId) io.to(`user:${userId}`).emit('ride:paymentFailed', event);
      if (driverId) io.to(`user:${driverId}`).emit('ride:paymentFailed', event);
      console.log(`📤 [WebSocket] Emitted ride:paymentFailed to ride:${targetRideId}`);
      break;

    default:
      // Generic ride update
      io.to(`ride:${targetRideId}`).emit('ride:update', {
        routingKey,
        ...event
      });
      console.log(`📤 [WebSocket] Emitted ride:update to ride:${targetRideId}`);
  }
};

/**
 * Handle driver events and emit to appropriate rooms
 */
const handleDriverEvent = (event, routingKey) => {
  if (!io) return;

  console.log(`[Event Bridge] Handling driver event: ${routingKey}`, event);

  const { driverId, rideId, bookingId, location } = event;
  const targetRideId = rideId || bookingId;

  switch (routingKey) {
    case 'driver.location.updated':
      // Emit location update to ride room so customer can see driver moving
      if (targetRideId) {
        io.to(`ride:${targetRideId}`).emit('driver.location.updated', {
          driverId,
          location,
          timestamp: event.timestamp
        });
        console.log(`📤 [WebSocket] Emitted driver.location.updated to ride:${targetRideId}`);
      }
      break;

    case 'driver.assigned.ack':
      // Notify customer that driver acknowledged the assignment
      if (targetRideId) {
        io.to(`ride:${targetRideId}`).emit('driver:acknowledged', event);
        console.log(`📤 [WebSocket] Emitted driver:acknowledged to ride:${targetRideId}`);
      }
      break;

    default:
      console.log(`📤 [WebSocket] Unknown driver event: ${routingKey}`);
  }
};

/**
 * Handle booking events and emit to appropriate user rooms
 */
const handleBookingEvent = (event, routingKey) => {
  if (!io) return;

  console.log(`[Event Bridge] Handling booking event: ${routingKey}`, event);

  const { bookingId, userId, driverId } = event;

  switch (routingKey) {
    // ── Sequential Matching: Offer to single driver ──
    case 'booking.offer':
      if (driverId) {
        io.to(`user:${driverId}`).emit('booking:offer', {
          bookingId,
          pickup: event.pickup,
          estimatedPrice: event.estimatedPrice,
          vehicleType: event.vehicleType,
          approxDistanceToPickup: event.approxDistanceToPickup,
          timeoutMs: event.timeoutMs,
          candidateIndex: event.candidateIndex,
          totalCandidates: event.totalCandidates,
        });
        console.log(`📤 [WebSocket] Emitted booking:offer to driver user:${driverId}`);
      }
      break;

    // ── Driver accepted, confirmed ──
    case 'booking.offer.confirmed':
      if (driverId) {
        io.to(`user:${driverId}`).emit('booking:confirmed', {
          bookingId,
          pickup: event.pickup,
          dropoff: event.dropoff,
          vehicleType: event.vehicleType,
          estimatedPrice: event.estimatedPrice,
          passengerId: event.passengerId,
        });
        console.log(`📤 [WebSocket] Emitted booking:confirmed to driver user:${driverId}`);
      }
      break;

    // ── Matching complete: notify passenger ──
    case 'booking.matched':
      if (userId) {
        io.to(`user:${userId}`).emit('driver_matched', {
          bookingId,
          driver: event.driver,
          pickup: event.pickup,
          estimatedPrice: event.estimatedPrice,
          approxDistanceToPickup: event.approxDistanceToPickup,
        });
        console.log(`📤 [WebSocket] Emitted driver_matched to user:${userId}`);
      }
      break;

    // ── No drivers found ──
    case 'booking.noDrivers':
      if (userId) {
        io.to(`user:${userId}`).emit('booking:noDrivers', {
          bookingId,
          status: 'NO_DRIVERS',
        });
        console.log(`📤 [WebSocket] Emitted booking:noDrivers to user:${userId}`);
      }
      break;

    // ── Payment failed compensation: booking rolled back ──
    case 'booking.payment_failed':
      if (userId) {
        io.to(`user:${userId}`).emit('booking:paymentFailed', {
          bookingId,
          status: event.status || 'FAILED',
          reason: event.reason || 'Payment transaction failed',
        });
        console.log(`📤 [WebSocket] Emitted booking:paymentFailed to user:${userId}`);
      }
      break;

    // ── Rematching: driver cancelled, searching for new driver ──
    case 'booking.rematching':
      if (userId) {
        io.to(`user:${userId}`).emit('booking:rematching', {
          bookingId,
          status: 'REMATCHING',
        });
        console.log(`📤 [WebSocket] Emitted booking:rematching to user:${userId}`);
      }
      break;

    case 'booking.created':
      if (userId) {
        io.to(`user:${userId}`).emit('booking:created', {
          bookingId,
          status: event.status,
        });
      }
      console.log(`📤 [WebSocket] Emitted booking:created to user:${userId}`);
      break;

    case 'booking.cancelled':
      if (userId) {
        io.to(`user:${userId}`).emit('booking:cancelled', {
          bookingId,
          status: 'CANCELLED',
        });
      }
      // Notify the assigned driver
      if (driverId) {
        io.to(`user:${driverId}`).emit('booking:cancelled', {
          bookingId,
          status: 'CANCELLED',
        });
        console.log(`📤 [WebSocket] Emitted booking:cancelled to driver user:${driverId}`);
      }
      // Also notify currently offered driver (during SEARCHING)
      if (event.currentOfferedDriverUserId && event.currentOfferedDriverUserId !== driverId) {
        io.to(`user:${event.currentOfferedDriverUserId}`).emit('booking:cancelled', {
          bookingId,
          status: 'CANCELLED',
        });
        console.log(`📤 [WebSocket] Emitted booking:cancelled to offered driver user:${event.currentOfferedDriverUserId}`);
      }
      console.log(`📤 [WebSocket] Emitted booking:cancelled to user:${userId}`);
      break;

    default:
      console.log(`📤 [WebSocket] Unknown booking event: ${routingKey}`);
  }
};

module.exports = {
  initializeEventBridge
};
