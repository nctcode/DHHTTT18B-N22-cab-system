// backend/shared/resilience/circuitBreaker.js
/**
 * Circuit Breaker Pattern Implementation
 * Using Netflix Hystrix-inspired pattern via opossum library
 * 
 * States:
 * - CLOSED: Normal operation, request passes through
 * - OPEN: Too many failures, requests fail fast with fallback
 * - HALF_OPEN: Testing if service recovered
 */

const CircuitBreaker = require('opossum');

/**
 * Default circuit breaker options
 */
const DEFAULT_OPTIONS = {
  timeout: 3000,                    // 3 seconds timeout
  errorThresholdPercentage: 50,     // Open circuit at 50% error rate
  resetTimeout: 30000,              // Try to close circuit after 30s
  rollingCountTimeout: 10000,       // 10-second rolling window
  rollingCountBuckets: 10,          // 10 buckets in the window
  volumeThreshold: 10,              // Minimum 10 requests before opening
  allowWarmUp: true,                // Allow warm-up period
  capacity: 100                     // Max concurrent requests
};

/**
 * Create a circuit breaker for a function
 * @param {Function} action - Async function to protect
 * @param {Object} options - Circuit breaker configuration
 * @param {Function} fallback - Fallback function when circuit is open
 * @returns {CircuitBreaker} Circuit breaker instance
 */
const createCircuitBreaker = (action, options = {}, fallback = null) => {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  const breaker = new CircuitBreaker(action, config);

  // Event listeners for monitoring
  breaker.on('open', () => {
    console.warn(`🔴 Circuit breaker OPENED for ${action.name || 'anonymous'}`);
  });

  breaker.on('halfOpen', () => {
    console.log(`🟡 Circuit breaker HALF-OPEN for ${action.name || 'anonymous'}`);
  });

  breaker.on('close', () => {
    console.log(`🟢 Circuit breaker CLOSED for ${action.name || 'anonymous'}`);
  });

  breaker.on('success', (result, latency) => {
    if (latency > config.timeout * 0.8) {
      console.warn(`⚠️ Slow response: ${latency}ms`);
    }
  });

  breaker.on('timeout', () => {
    console.error(`⏱️ Circuit breaker timeout for ${action.name || 'anonymous'}`);
  });

  breaker.on('reject', () => {
    console.error(`⛔ Circuit breaker rejected request (circuit OPEN)`);
  });

  breaker.on('fallback', (result) => {
    console.log(`💾 Fallback executed for ${action.name || 'anonymous'}`);
  });

  // Set fallback function if provided
  if (fallback) {
    breaker.fallback(fallback);
  }

  return breaker;
};

/**
 * Create a circuit breaker for HTTP service calls
 * @param {string} serviceName - Name of the service
 * @param {string} serviceUrl - Base URL of the service
 * @param {Object} options - Additional options
 * @returns {CircuitBreaker}
 */
const createServiceCircuitBreaker = (serviceName, serviceUrl, options = {}) => {
  const axios = require('axios');
  
  const action = async (path, config = {}) => {
    return axios({
      url: `${serviceUrl}${path}`,
      ...config
    });
  };

  const fallback = options.fallback || ((path, config) => {
    console.warn(`Service ${serviceName} unavailable, returning fallback`);
    return {
      status: 503,
      data: {
        success: false,
        message: `${serviceName} is temporarily unavailable`,
        fallback: true
      }
    };
  });

  return createCircuitBreaker(
    action,
    {
      name: serviceName,
      timeout: options.timeout || 5000,
      ...options
    },
    fallback
  );
};

/**
 * Get circuit breaker statistics
 * @param {CircuitBreaker} breaker
 * @returns {Object} Statistics
 */
const getStats = (breaker) => {
  const stats = breaker.stats;
  
  return {
    state: breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
    failures: stats.failures,
    successes: stats.successes,
    rejects: stats.rejects,
    timeouts: stats.timeouts,
    fallbacks: stats.fallbacks,
    latency: {
      mean: stats.latencyMean,
      p50: stats.percentiles['0.5'],
      p95: stats.percentiles['0.95'],
      p99: stats.percentiles['0.99']
    },
    errorRate: stats.failures / (stats.failures + stats.successes + 0.0001)
  };
};

/**
 * Predefined circuit breakers for common services
 */
const CircuitBreakers = {
  // Store breaker instances
  _breakers: new Map(),

  /**
   * Get or create a circuit breaker for a service
   */
  getServiceBreaker(serviceName, serviceUrl, options = {}) {
    const key = `${serviceName}:${serviceUrl}`;
    
    if (!this._breakers.has(key)) {
      const breaker = createServiceCircuitBreaker(serviceName, serviceUrl, options);
      this._breakers.set(key, breaker);
    }

    return this._breakers.get(key);
  },

  /**
   * Get all breaker statistics
   */
  getAllStats() {
    const stats = {};
    
    for (const [key, breaker] of this._breakers.entries()) {
      stats[key] = getStats(breaker);
    }

    return stats;
  },

  /**
   * Reset all circuit breakers
   */
  resetAll() {
    for (const breaker of this._breakers.values()) {
      breaker.close();
    }
  },

  /**
   * Shutdown all circuit breakers
   */
  shutdownAll() {
    for (const breaker of this._breakers.values()) {
      breaker.shutdown();
    }
    this._breakers.clear();
  }
};

/**
 * Express middleware to expose circuit breaker metrics
 */
const circuitBreakerMetricsMiddleware = (req, res) => {
  const stats = CircuitBreakers.getAllStats();
  
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    circuitBreakers: stats
  });
};

/**
 * Health check that includes circuit breaker status
 */
const healthCheckWithCircuitBreakers = () => {
  const stats = CircuitBreakers.getAllStats();
  const hasOpenCircuits = Object.values(stats).some(s => s.state === 'OPEN');
  
  return {
    healthy: !hasOpenCircuits,
    circuitBreakers: stats,
    message: hasOpenCircuits 
      ? 'Some circuit breakers are OPEN' 
      : 'All circuit breakers are healthy'
  };
};

module.exports = {
  createCircuitBreaker,
  createServiceCircuitBreaker,
  getStats,
  CircuitBreakers,
  circuitBreakerMetricsMiddleware,
  healthCheckWithCircuitBreakers,
  DEFAULT_OPTIONS
};
