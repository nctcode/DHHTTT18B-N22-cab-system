// src/config/constants.js
module.exports = {
  // Booking statuses
  BOOKING_STATUS: {
    PENDING: 'PENDING',
    ASSIGNED: 'ASSIGNED',
    ARRIVING: 'ARRIVING',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    NO_DRIVER: 'NO_DRIVER',
    TIMEOUT: 'TIMEOUT'
  },
  
  // Vehicle types
  VEHICLE_TYPES: {
    STANDARD: 'STANDARD',
    PREMIUM: 'PREMIUM',
    LUXURY: 'LUXURY',
    BIKE: 'BIKE'
  },
  
  // Payment methods
  PAYMENT_METHODS: {
    CASH: 'CASH',
    CARD: 'CARD',
    WALLET: 'WALLET',
    BANKING: 'BANKING'
  },
  
  // Payment statuses
  PAYMENT_STATUS: {
    PENDING: 'PENDING',
    PAID: 'PAID',
    FAILED: 'FAILED',
    REFUNDED: 'REFUNDED'
  },
  
  // User types
  USER_TYPES: {
    PASSENGER: 'passenger',
    DRIVER: 'driver',
    ADMIN: 'admin'
  },
  
  // Redis cache keys
  CACHE_KEYS: {
    BOOKING_PREFIX: 'booking:',
    USER_BOOKINGS_PREFIX: 'user_bookings:',
    NEARBY_BOOKINGS_PREFIX: 'nearby_bookings:',
    RATE_LIMIT_PREFIX: 'rate_limit:'
  },
  
  // RabbitMQ exchanges and queues
  RABBITMQ: {
    EXCHANGE: 'booking_events',
    QUEUES: {
      RIDE_SERVICE: 'ride.service.queue',
      PAYMENT_SERVICE: 'payment.service.queue',
      NOTIFICATION: 'notification.queue',
      AI_MATCHING: 'ai.matching.queue'
    },
    ROUTING_KEYS: {
      BOOKING_CREATED: 'booking.created',
      BOOKING_STATUS_CHANGED: 'booking.status.',
      DRIVER_ASSIGNED: 'booking.driver.assigned',
      BOOKING_CANCELLED: 'booking.cancelled',
      PAYMENT_COMPLETED: 'payment.completed',
      PAYMENT_FAILED: 'payment.failed'
    }
  },
  
  // HTTP status codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  },
  
  // Time constants (in milliseconds)
  TIME: {
    SECOND: 1000,
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000
  },
  
  // Rate limiting
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100
  },
  
  // Cache TTL (in seconds)
  CACHE_TTL: {
    BOOKING: 300, // 5 minutes
    NEARBY_BOOKINGS: 30, // 30 seconds
    USER_STATS: 600 // 10 minutes
  }
};