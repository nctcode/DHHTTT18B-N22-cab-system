// backend/shared/resilience/index.js
/**
 * Main export for resilience patterns
 */

const circuitBreaker = require('./circuitBreaker');
const retry = require('./retry');
const gracefulDegradation = require('./gracefulDegradation');
const healthCheck = require('./healthCheck');

module.exports = {
  // Circuit Breaker
  ...circuitBreaker,
  
  // Retry
  ...retry,
  
  // Graceful Degradation
  ...gracefulDegradation,
  
  // Health Check
  ...healthCheck
};
