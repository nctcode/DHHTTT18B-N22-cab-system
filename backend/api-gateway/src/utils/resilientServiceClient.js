// backend/api-gateway/src/utils/resilientServiceClient.js
/**
 * Resilient Service Client
 * Integrates Circuit Breaker, Retry, and Graceful Degradation
 */

const axios = require('axios');
const { CircuitBreakers } = require('../../../shared/resilience/circuitBreaker');
const { createRetryableAxios } = require('../../../shared/resilience/retry');
const { withGracefulDegradation, FallbackResponses } = require('../../../shared/resilience/gracefulDegradation');

/**
 * Service client with full resilience patterns
 */
class ResilientServiceClient {
  constructor(serviceName, baseURL, options = {}) {
    this.serviceName = serviceName;
    this.baseURL = baseURL;
    this.options = options;

    // Create retryable axios instance
    this.axios = createRetryableAxios(
      { baseURL, timeout: options.timeout || 5000 },
      { retries: options.retries || 3 }
    );

    // Get or create circuit breaker for this service
    this.breaker = CircuitBreakers.getServiceBreaker(serviceName, baseURL, {
      timeout: options.timeout || 5000,
      errorThresholdPercentage: options.errorThreshold || 50,
      fallback: options.fallback || this.defaultFallback.bind(this)
    });
  }

  /**
   * Default fallback response
   */
  defaultFallback(path, config) {
    console.warn(`Service ${this.serviceName} unavailable, using fallback`);
    return FallbackResponses.serviceUnavailable(this.serviceName);
  }

  /**
   * Make a GET request with full resilience
   */
  async get(path, config = {}) {
    const cacheKey = `${this.serviceName}:GET:${path}`;

    return withGracefulDegradation(
      async () => {
        // Use circuit breaker
        const response = await this.breaker.fire(path, {
          ...config,
          method: 'GET'
        });
        return response.data;
      },
      {
        cacheKey,
        cacheTTL: config.cacheTTL || 300,
        fallbackData: config.fallbackData
      }
    );
  }

  /**
   * Make a POST request with full resilience
   */
  async post(path, data, config = {}) {
    // POST requests typically shouldn't be retried automatically
    // But we still use circuit breaker
    const response = await this.breaker.fire(path, {
      ...config,
      method: 'POST',
      data
    });

    return response.data;
  }

  /**
   * Make a PUT request with full resilience
   */
  async put(path, data, config = {}) {
    const response = await this.breaker.fire(path, {
      ...config,
      method: 'PUT',
      data
    });

    return response.data;
  }

  /**
   * Make a DELETE request with full resilience
   */
  async delete(path, config = {}) {
    const response = await this.breaker.fire(path, {
      ...config,
      method: 'DELETE'
    });

    return response.data;
  }

  /**
   * Get circuit breaker statistics
   */
  getStats() {
    return this.breaker.stats;
  }
}

/**
 * Service clients for all microservices
 */
const ServiceClients = {
  // Auth Service
  auth: new ResilientServiceClient(
    'auth-service',
    process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
    {
      timeout: 5000,
      retries: 3,
      fallback: () => FallbackResponses.serviceUnavailable('Authentication')
    }
  ),

  // User Service
  user: new ResilientServiceClient(
    'user-service',
    process.env.USER_SERVICE_URL || 'http://user-service:3002',
    {
      timeout: 3000,
      retries: 3,
      fallback: (path) => {
        // If getting a specific user, return default user
        if (path.includes('/users/')) {
          const userId = path.split('/').pop();
          return FallbackResponses.defaultUser(userId);
        }
        return FallbackResponses.serviceUnavailable('User');
      }
    }
  ),

  // Booking Service
  booking: new ResilientServiceClient(
    'booking-service',
    process.env.BOOKING_SERVICE_URL || 'http://booking-service:3003',
    {
      timeout: 10000, // Bookings may take longer
      retries: 2
    }
  ),

  // Ride Service
  ride: new ResilientServiceClient(
    'ride-service',
    process.env.RIDE_SERVICE_URL || 'http://ride-service:3004',
    {
      timeout: 8000,
      retries: 3
    }
  ),

  // Driver Service
  driver: new ResilientServiceClient(
    'driver-service',
    process.env.DRIVER_SERVICE_URL || 'http://driver-service:3005',
    {
      timeout: 5000,
      retries: 3,
      fallback: () => FallbackResponses.defaultDriver()
    }
  ),

  // Payment Service
  payment: new ResilientServiceClient(
    'payment-service',
    process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3006',
    {
      timeout: 15000, // Payment operations can be slow
      retries: 2,
      fallback: () => FallbackResponses.paymentPending()
    }
  ),

  // Pricing Service
  pricing: new ResilientServiceClient(
    'pricing-service',
    process.env.PRICING_SERVICE_URL || 'http://pricing-service:3007',
    {
      timeout: 3000,
      retries: 3
    }
  ),

  // Notification Service
  notification: new ResilientServiceClient(
    'notification-service',
    process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3008',
    {
      timeout: 5000,
      retries: 2,
      fallback: () => ({
        success: true,
        message: 'Notification queued for later delivery',
        degraded: true
      })
    }
  ),

  /**
   * Get statistics for all service clients
   */
  getAllStats() {
    const stats = {};
    
    for (const [name, client] of Object.entries(this)) {
      if (client instanceof ResilientServiceClient) {
        stats[name] = client.getStats();
      }
    }

    return stats;
  }
};

module.exports = {
  ResilientServiceClient,
  ServiceClients
};
