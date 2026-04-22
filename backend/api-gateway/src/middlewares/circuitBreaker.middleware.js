/**
 * Circuit Breaker Middleware for API Gateway
 * Wraps http-proxy-middleware with circuit breaker pattern to prevent
 * cascading failures when backend services are down.
 */

const CircuitBreaker = require('opossum');

// Store circuit breakers per service
const breakers = new Map();

/**
 * Default circuit breaker options
 */
const DEFAULT_OPTIONS = {
  timeout: 10000,              // 10s timeout per request
  errorThresholdPercentage: 50, // Open circuit if 50% of requests fail
  resetTimeout: 30000,          // Try again after 30s
  volumeThreshold: 5,           // Min 5 requests before tripping
  rollingCountTimeout: 10000,   // 10s rolling window
};

/**
 * Create or get a circuit breaker for a service
 */
function getBreaker(serviceName, options = {}) {
  if (breakers.has(serviceName)) {
    return breakers.get(serviceName);
  }

  const breakerOptions = { ...DEFAULT_OPTIONS, ...options };
  
  // The action is a pass-through — the actual proxying happens via http-proxy-middleware
  // The circuit breaker just controls whether to allow the request through
  const breaker = new CircuitBreaker(
    async () => true, // Dummy action — we use events for control
    breakerOptions
  );

  // Log state changes
  breaker.on('open', () => {
    console.error(`[CircuitBreaker] ⛔ ${serviceName} circuit OPENED — requests will be rejected`);
  });
  breaker.on('halfOpen', () => {
    console.warn(`[CircuitBreaker] 🟡 ${serviceName} circuit HALF-OPEN — testing...`);
  });
  breaker.on('close', () => {
    console.log(`[CircuitBreaker] ✅ ${serviceName} circuit CLOSED — service recovered`);
  });

  breakers.set(serviceName, breaker);
  return breaker;
}

/**
 * Middleware that checks circuit breaker state before proxying.
 * If circuit is OPEN, returns 503 immediately without trying to proxy.
 * If circuit is CLOSED or HALF-OPEN, lets the request through.
 * 
 * Usage:
 *   router.use('/bookings', circuitBreakerMiddleware('booking-service'), bookingProxy);
 */
function circuitBreakerMiddleware(serviceName, options = {}) {
  const breaker = getBreaker(serviceName, options);

  return (req, res, next) => {
    // Check if circuit is OPEN
    if (breaker.opened) {
      console.warn(`[CircuitBreaker] ⛔ ${serviceName} is DOWN — returning 503 for ${req.method} ${req.path}`);
      return res.status(503).json({
        success: false,
        message: `${serviceName} is temporarily unavailable. Please try again later.`,
        circuitBreaker: {
          state: 'OPEN',
          service: serviceName,
          retryAfter: Math.ceil(breaker.options.resetTimeout / 1000),
        }
      });
    }

    // Store original res.end to track success/failure
    const originalEnd = res.end;
    const startTime = Date.now();

    res.end = function (...args) {
      const duration = Date.now() - startTime;
      
      if (res.statusCode >= 500) {
        // Server error — record failure
        breaker.fire().catch(() => {}); // Fire and fail to record
        breaker.emit('failure', new Error(`${serviceName} returned ${res.statusCode}`));
        console.warn(`[CircuitBreaker] ${serviceName} failure: ${res.statusCode} (${duration}ms)`);
      } else {
        // Success — record
        breaker.fire().catch(() => {});
        console.log(`[CircuitBreaker] ${serviceName} success: ${res.statusCode} (${duration}ms)`);
      }
      
      originalEnd.apply(res, args);
    };

    next();
  };
}

/**
 * Get all circuit breaker statistics for monitoring
 */
function getAllBreakerStats() {
  const stats = {};
  for (const [name, breaker] of breakers) {
    stats[name] = {
      state: breaker.opened ? 'OPEN' : (breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED'),
      stats: breaker.stats ? {
        fires: breaker.stats.fires,
        failures: breaker.stats.failures,
        successes: breaker.stats.successes,
        timeouts: breaker.stats.timeouts,
        cacheHits: breaker.stats.cacheHits,
        fallbacks: breaker.stats.fallbacks,
      } : {}
    };
  }
  return stats;
}

module.exports = {
  circuitBreakerMiddleware,
  getAllBreakerStats,
  getBreaker,
};
