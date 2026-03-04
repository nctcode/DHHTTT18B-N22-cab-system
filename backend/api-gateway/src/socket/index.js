const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config/app.config');
const amqplib = require('amqplib');
const axios = require('axios');
const { initializeEventBridge } = require('./eventBridge');
const { createClient } = require('redis');

let io;
let channel;
let redisClient;

const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || 'http://booking-service:3004';

// Initialize Redis client for Geo operations
const initRedis = async () => {
  try {
    const redisHost = process.env.REDIS_HOST || 'redis';
    const redisPort = process.env.REDIS_PORT || 6379;
    
    redisClient = createClient({
      socket: {
        host: redisHost,
        port: redisPort
      }
    });

    await redisClient.connect();
    console.log('[Gateway] Redis connected for Geo operations');
  } catch (err) {
    console.error('[Gateway] Redis connection failed:', err);
  }
};

// RabbitMQ Setup
const connectRabbitMQ = async () => {
  try {
    const connection = await amqplib.connect(process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672');
    channel = await connection.createChannel();
    await channel.assertExchange('ride.events', 'topic', { durable: true });
    await channel.assertExchange('driver.events', 'topic', { durable: true });
    console.log('[Gateway] RabbitMQ connected for Socket.IO');
  } catch (err) {
    console.error('[Gateway] RabbitMQ connection failed', err);
    setTimeout(connectRabbitMQ, 5000);
  }
};

const initializeSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Zero Trust: Authenticate Socket Connection
  io.use((socket, next) => {
    if (socket.handshake.auth && socket.handshake.auth.token) {
      jwt.verify(socket.handshake.auth.token, config.jwt.secret, (err, decoded) => {
        if (err) return next(new Error('Authentication error'));
        socket.decoded = decoded;
        next();
      });
    } else {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.decoded.userId || socket.decoded.id;
    const role = socket.decoded.role;
    
    console.log(`[Socket] User connected: ${userId} (${role})`);
    
    // Join user-specific room
    socket.join(`user:${userId}`);
    
    // Driver Logic
    if (role === 'DRIVER') {
        socket.on('driver.location', async (data) => {
            console.log(`[Socket] Received driver.location from ${userId}:`, JSON.stringify(data));
            
            // data: { lat, lng, bearing, speed, rideId }
            const { lat, lng, bearing, speed, rideId } = data;

            // Update Redis Geo for location tracking
            if (redisClient) {
              try {
                await redisClient.geoAdd('drivers:locations', {
                  longitude: parseFloat(lng),
                  latitude: parseFloat(lat),
                  member: `driver:${userId}`
                });

                // Store metadata
                await redisClient.hSet(`driver:${userId}:meta`, {
                  lastUpdate: new Date().toISOString(),
                  latitude: lat.toString(),
                  longitude: lng.toString(),
                  bearing: bearing?.toString() || '0',
                  speed: speed?.toString() || '0',
                  vehicleType: socket.decoded.vehicleType || 'CAR',
                  currentRideId: rideId || '' // active ride
                });

                // console.log(`📍 Updated Geo location for driver ${userId}: (${lat}, ${lng})`);
              } catch (error) {
                console.error('[Socket] Redis Geo error:', error);
              }
            } else {
                console.warn('[Socket] Redis client not available, skipping Geo update');
            }

            // Publish to RabbitMQ -> Real-time Layer
            if (channel) {
                const event = {
                    driverId: userId,
                    rideId: rideId, // Pass rideId to EventBridge for room broadcasting
                    location: { lat, lng, bearing, speed },
                    timestamp: new Date().toISOString()
                };
                try {
                    const result = channel.publish('driver.events', 'driver.location.updated', Buffer.from(JSON.stringify(event)));
                    console.log(`[Socket] Published driver.location.updated for ride ${rideId}. Result: ${result}`);
                } catch (pubErr) {
                    console.error('[Socket] Failed to publish to RabbitMQ:', pubErr);
                }
            } else {
                console.error('[Socket] RabbitMQ channel is NULL. Cannot publish event!');
            }
        });

        // ── Sequential Matching: Driver accept/reject ──
        socket.on('booking:accept', async (data) => {
            const { bookingId } = data;
            console.log(`[Socket] Driver ${userId} ACCEPTS booking ${bookingId}`);
            try {
                await axios.post(`${BOOKING_SERVICE_URL}/internal/bookings/${bookingId}/respond`, {
                    driverUserId: userId,
                    accepted: true,
                });
            } catch (err) {
                console.error(`[Socket] booking:accept failed:`, err.response?.data || err.message);
                socket.emit('booking:error', { bookingId, message: 'Failed to accept offer' });
            }
        });

        socket.on('booking:reject', async (data) => {
            const { bookingId } = data;
            console.log(`[Socket] Driver ${userId} REJECTS booking ${bookingId}`);
            try {
                await axios.post(`${BOOKING_SERVICE_URL}/internal/bookings/${bookingId}/respond`, {
                    driverUserId: userId,
                    accepted: false,
                });
            } catch (err) {
                console.error(`[Socket] booking:reject failed:`, err.response?.data || err.message);
            }
        });
    }

    // Passenger Logic: Request Nearby Drivers
    if (role === 'PASSENGER') {
        socket.on('passenger.location', async (data) => {
             const { lat, lng } = data;
             if (!redisClient) return; // Fixed: removed !result check
             
             try {
                // Find drivers within 5km
                const drivers = await redisClient.geoSearch(
                    'drivers:locations',
                    { longitude: parseFloat(lng), latitude: parseFloat(lat) },
                    { radius: 5, unit: 'km' }
                );
                
                // drivers is array of members, e.g., ['driver:123', 'driver:456']
                if (drivers.length > 0) {
                     // Fetch actual coordinates/metadata if needed, or just return basic info
                     // GEORADIUS can return coords, but geoSearch needs WITHCOORD option if using raw redis command
                     // node-redis geoSearch returns member names by default.
                     // Let's use geoSearchWith to get coordinates
                     const driversWithCoords = await redisClient.geoSearchWith(
                        'drivers:locations',
                        { longitude: parseFloat(lng), latitude: parseFloat(lat) },
                        { radius: 5, unit: 'km' },
                        ['WITHCOORD']
                    );
                    
                    const result = driversWithCoords.map(d => ({
                        id: d.member.replace('driver:', ''),
                        lat: parseFloat(d.coordinates.latitude),
                        lng: parseFloat(d.coordinates.longitude)
                    }));

                    socket.emit('nearby_drivers', result);
                } else {
                    socket.emit('nearby_drivers', []);
                }
             } catch (error) {
                 console.error('[Socket] Failed to fetch nearby drivers:', error);
             }
        });
    }

    // Join Ride Room
    socket.on('join:ride', (rideId) => {
        // Check permission (TODO: Call Auth Service or Token Check)
        socket.join(`ride:${rideId}`);
        console.log(`User ${userId} joined ride:${rideId}`);
    });

    socket.on('disconnect', () => {
        console.log(`[Socket] Disconnected: ${userId}`);
    });
  });
  
  // Initialize Redis for Geo
  initRedis();
  
  // Connect to RabbitMQ
  connectRabbitMQ();

  // Initialize Event Bridge (RabbitMQ → Socket.IO)
  initializeEventBridge(io);
  console.log('[Gateway] Event Bridge initialized');
  
  return io;
};

module.exports = { initializeSocket, io };

