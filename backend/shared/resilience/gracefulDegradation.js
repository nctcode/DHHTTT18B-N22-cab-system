// backend/shared/resilience/gracefulDegradation.js
/**
 * Graceful Degradation Strategies
 * Provides fallback mechanisms when services are unavailable
 */

const NodeCache = require('node-cache');

/**
 * Cache for storing fallback data
 * TTL: 5 minutes (300 seconds)
 */
const fallbackCache = new NodeCache({
  stdTTL: 300,
  checkperiod: 60,
  useClones: false
});

/**
 * Cache response and set up fallback
 * @param {string} key - Cache key
 * @param {*} data - Data to cache
 * @param {number} ttl - Time to live in seconds
 */
const cacheForFallback = (key, data, ttl = 300) => {
  fallbackCache.set(key, data, ttl);
};

/**
 * Get cached fallback data
 * @param {string} key - Cache key
 * @returns {*} Cached data or null
 */
const getFallbackData = (key) => {
  return fallbackCache.get(key);
};

/**
 * Wrapper for service calls with graceful degradation
 * @param {Function} serviceCall - Async function that calls the service
 * @param {Object} options - Options
 * @returns {Promise} Service response or fallback
 */
const withGracefulDegradation = async (serviceCall, options = {}) => {
  const {
    cacheKey,
    fallbackData,
    cacheTTL = 300,
    cacheResult = true,
    onFallback = () => {}
  } = options;

  try {
    // Try the actual service call
    const result = await serviceCall();

    // Cache successful result if key provided
    if (cacheKey && cacheResult) {
      cacheForFallback(cacheKey, result, cacheTTL);
    }

    return {
      data: result,
      source: 'service',
      degraded: false
    };

  } catch (error) {
    console.warn('Service call failed, attempting graceful degradation', {
      error: error.message,
      cacheKey
    });

    // Try to get from cache
    if (cacheKey) {
      const cached = getFallbackData(cacheKey);
      
      if (cached) {
        console.log('Using cached data for fallback');
        onFallback('cache', error);
        
        return {
          data: cached,
          source: 'cache',
          degraded: true,
          warning: 'Using cached data due to service unavailability'
        };
      }
    }

    // Use provided fallback data
    if (fallbackData !== undefined) {
      console.log('Using provided fallback data');
      onFallback('fallback', error);
      
      return {
        data: fallbackData,
        source: 'fallback',
        degraded: true,
        warning: 'Using fallback data due to service unavailability'
      };
    }

    // No fallback available, throw error
    throw error;
  }
};

/**
 * Predefined fallback responses
 */
const FallbackResponses = {
  /**
   * Empty list fallback
   */
  emptyList: (message = 'Data temporarily unavailable') => ({
    items: [],
    total: 0,
    message,
    degraded: true
  }),

  /**
   * Unavailable service fallback
   */
  serviceUnavailable: (serviceName) => ({
    success: false,
    message: `${serviceName} is temporarily unavailable. Please try again later.`,
    degraded: true,
    retryAfter: 60
  }),

  /**
   * Default user fallback
   */
  defaultUser: (userId) => ({
    id: userId,
    name: 'User',
    email: null,
    degraded: true,
    message: 'User service unavailable, showing limited information'
  }),

  /**
   * Default driver fallback
   */
  defaultDriver: () => ({
    available: false,
    message: 'No drivers available. Please try again later.',
    degraded: true
  }),

  /**
   * Payment pending fallback
   */
  paymentPending: () => ({
    status: 'PENDING',
    message: 'Payment is being processed. You will be notified once completed.',
    degraded: true
  })
};

/**
 * Feature Toggle Manager
 * Disable non-critical features under high load or failures
 */
class FeatureToggleManager {
  constructor() {
    this.features = new Map();
    this.defaultState = true;
  }

  /**
   * Register a feature
   */
  register(featureName, enabled = true, priority = 'medium') {
    this.features.set(featureName, {
      enabled,
      priority, // 'critical', 'high', 'medium', 'low'
      disabledAt: enabled ? null : new Date(),
      reason: null
    });
  }

  /**
   * Enable a feature
   */
  enable(featureName) {
    const feature = this.features.get(featureName);
    
    if (feature) {
      feature.enabled = true;
      feature.disabledAt = null;
      feature.reason = null;
      console.log(`✅ Feature enabled: ${featureName}`);
    }
  }

  /**
   * Disable a feature
   */
  disable(featureName, reason = 'Manual disable') {
    const feature = this.features.get(featureName);
    
    if (feature) {
      feature.enabled = false;
      feature.disabledAt = new Date();
      feature.reason = reason;
      console.warn(`⛔ Feature disabled: ${featureName} - ${reason}`);
    }
  }

  /**
   * Check if feature is enabled
   */
  isEnabled(featureName) {
    const feature = this.features.get(featureName);
    return feature ? feature.enabled : this.defaultState;
  }

  /**
   * Disable low-priority features under load
   */
  degradeGracefully() {
    console.warn('🔻 Graceful degradation activated - disabling low-priority features');
    
    for (const [name, feature] of this.features.entries()) {
      if (feature.priority === 'low' && feature.enabled) {
        this.disable(name, 'Graceful degradation under load');
      }
    }
  }

  /**
   * Restore all features
   */
  restore() {
    console.log('🔺 Restoring all features');
    
    for (const [name, feature] of this.features.entries()) {
      if (!feature.enabled && feature.reason === 'Graceful degradation under load') {
        this.enable(name);
      }
    }
  }

  /**
   * Get all features status
   */
  getStatus() {
    const status = {};
    
    for (const [name, feature] of this.features.entries()) {
      status[name] = { ...feature };
    }

    return status;
  }
}

/**
 * Global feature toggle instance
 */
const featureToggle = new FeatureToggleManager();

// Register default features
featureToggle.register('notifications', true, 'low');
featureToggle.register('analytics', true, 'low');
featureToggle.register('reviews', true, 'medium');
featureToggle.register('ai-matching', true, 'high');
featureToggle.register('payments', true, 'critical');
featureToggle.register('ride-booking', true, 'critical');

/**
 * Check system health and degrade if needed
 */
const monitorAndDegrade = (metrics) => {
  const {
    cpuUsage = 0,
    memoryUsage = 0,
    errorRate = 0,
    responseTime = 0
  } = metrics;

  // Degrade if system is under stress
  if (
    cpuUsage > 80 ||
    memoryUsage > 80 ||
    errorRate > 0.1 ||
    responseTime > 5000
  ) {
    console.warn('System under stress, activating graceful degradation');
    featureToggle.degradeGracefully();
    return true;
  }

  return false;
};

module.exports = {
  cacheForFallback,
  getFallbackData,
  withGracefulDegradation,
  FallbackResponses,
  FeatureToggleManager,
  featureToggle,
  monitorAndDegrade,
  fallbackCache
};
