// api-gateway/src/config/services.config.js
require('dotenv').config();

const services = {
  auth: {
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    endpoints: {
      register: '/api/auth/register',
      login: '/api/auth/login',
      me: '/api/auth/me',
      refreshToken: '/api/auth/refresh',
      logout: '/api/auth/logout',
      logoutAll: '/api/auth/logout-all',
    },
  },

  user: {
    url: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    endpoints: {
      health: '/api/users/health',
      register: '/api/users/register',
      users: '/api/users', // GET / (Admin)
      user: '/api/users/:id', // GET, PUT, DELETE /:id
      userByPhone: '/api/users/phone/:phone', // GET /phone/:phone
      addresses: '/api/users/:id/addresses', // GET, POST /:id/addresses
    },
  },

  driver: {
    url: process.env.DRIVER_SERVICE_URL || 'http://localhost:3003',
    endpoints: {
      drivers: '/api/drivers',
      available: '/api/drivers/available',
      // Dynamic routes like /:id, /:id/status, /:id/location are handled by REST conventions
    },
  },

  ride: {
    url: process.env.RIDE_SERVICE_URL || 'http://localhost:3005',
    endpoints: {
      rides: '/api/rides',
      request: '/api/rides/request',
      accept: '/api/rides/accept',
      start: '/api/rides/start',
      complete: '/api/rides/complete',
      cancel: '/api/rides/cancel',
      history: '/api/rides/history',
    },
  },

  booking: {
    url: process.env.BOOKING_SERVICE_URL || 'http://localhost:3004',
    endpoints: {
      bookings: '/api/bookings',
      create: '/api/bookings/create',
      confirm: '/api/bookings/confirm',
      cancel: '/api/bookings/cancel',
    },
  },

  payment: {
    url: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006',
    endpoints: {
      payments: '/api/payments',
      process: '/api/payments/process',
      refund: '/api/payments/refund',
      methods: '/api/payments/methods',
      history: '/api/payments/history',
    },
  },

  pricing: {
    url: process.env.PRICING_SERVICE_URL || 'http://localhost:3007',
    endpoints: {
      calculate: '/api/pricing/calculate',
      estimate: '/api/pricing/estimate',
    },
  },

  notification: {
    url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008',
    endpoints: {
      send: '/api/notifications/send',
      notifications: '/api/notifications',
    },
  },

  review: {
    url: process.env.REVIEW_SERVICE_URL || 'http://localhost:3009',
    endpoints: {
      reviews: '/api/reviews',
      create: '/api/reviews', // usually POST /
      driver: '/api/reviews/driver',
      rider: '/api/reviews/rider',
    },
  },

  routing: {
    url: process.env.ROUTING_SERVICE_URL || 'http://localhost:4040',
    endpoints: {
      route: '/route',
    },
  },

  // ── AI/ML Layer ──
  aiMatching: {
    url: process.env.AI_MATCHING_URL || 'http://localhost:4001',
    endpoints: { bestDriver: '/ai/matching/best-driver' },
  },
  aiEta: {
    url: process.env.AI_ETA_URL || 'http://localhost:4002',
    endpoints: { predict: '/ai/eta/predict' },
  },
  aiSurge: {
    url: process.env.AI_SURGE_URL || 'http://localhost:4003',
    endpoints: { predict: '/ai/surge/predict' },
  },
  featureStore: {
    url: process.env.FEATURE_STORE_URL || 'http://localhost:4020',
    endpoints: { driver: '/features/driver', zone: '/features/zone', tripContext: '/features/trip-context' },
  },
  modelServing: {
    url: process.env.MODEL_SERVING_URL || 'http://localhost:4010',
    endpoints: { matching: '/predict/matching', eta: '/predict/eta', surge: '/predict/surge' },
  },
  mlTraining: {
    url: process.env.ML_TRAINING_URL || 'http://localhost:4030',
    endpoints: { trigger: '/training/trigger', status: '/training/status' },
  },
};

module.exports = services;