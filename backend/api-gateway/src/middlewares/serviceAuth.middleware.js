// src/middlewares/serviceAuth.middleware.js
/**
 * Service-to-Service Authentication Middleware
 * Ensures only authenticated internal services can call protected endpoints
 */

const crypto = require('crypto');

// In production, these should be stored in a secure vault
// Each service should have its own API key
const SERVICE_API_KEYS = {
  'booking-service': process.env.BOOKING_SERVICE_API_KEY || 'booking_service_key_' + crypto.randomBytes(16).toString('hex'),
  'ride-service': process.env.RIDE_SERVICE_API_KEY || 'ride_service_key_' + crypto.randomBytes(16).toString('hex'),
  'driver-service': process.env.DRIVER_SERVICE_API_KEY || 'driver_service_key_' + crypto.randomBytes(16).toString('hex'),
  'payment-service': process.env.PAYMENT_SERVICE_API_KEY || 'payment_service_key_' + crypto.randomBytes(16).toString('hex'),
  'notification-service': process.env.NOTIF_SERVICE_API_KEY || 'notif_service_key_' + crypto.randomBytes(16).toString('hex')
};

/**
 * Verify service identity using API key
 */
const verifyServiceIdentity = (req, res, next) => {
  try {
    // Check for service identity header
    const serviceId = req.headers['x-service-identity'];
    const apiKey = req.headers['x-api-key'];

    if (!serviceId || !apiKey) {
      return res.status(403).json({
        success: false,
        message: 'Service authentication required',
        code: 'SERVICE_AUTH_REQUIRED'
      });
    }

    // Verify API key
    const expectedKey = SERVICE_API_KEYS[serviceId];

    if (!expectedKey || expectedKey !== apiKey) {
      console.warn(`🚨 [SERVICE AUTH] Invalid service credentials for ${serviceId} from ${req.ip}`);
      
      return res.status(403).json({
        success: false,
        message: 'Invalid service credentials',
        code: 'INVALID_SERVICE_CREDENTIALS'
      });
    }

    // Attach service info to request
    req.serviceIdentity = {
      id: serviceId,
      authenticated: true,
      timestamp: new Date().toISOString()
    };

    console.log(`✅ [SERVICE AUTH] ${serviceId} authenticated`);
    next();

  } catch (error) {
    console.error('[SERVICE AUTH] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Service authentication failed'
    });
  }
};

/**
 * Differentiate between internal and external requests
 */
const isInternalRequest = (req, res, next) => {
  const serviceId = req.headers['x-service-identity'];
  const apiKey = req.headers['x-api-key'];

  // Mark as internal if service identity is present
  req.isInternal = !!(serviceId && apiKey);
  
  next();
};

/**
 * Protect internal-only endpoints
 */
const internalOnly = (req, res, next) => {
  const serviceId = req.headers['x-service-identity'];
  const apiKey = req.headers['x-api-key'];

  if (!serviceId || !apiKey) {
    return res.status(403).json({
      success: false,
      message: 'This endpoint is only accessible by internal services',
      code: 'INTERNAL_ONLY'
    });
  }

  // Verify the service
  return verifyServiceIdentity(req, res, next);
};

/**
 * Generate API key for a service (admin function)
 */
const generateServiceApiKey = (serviceName) => {
  const prefix = serviceName.replace(/-/g, '_');
  const randomPart = crypto.randomBytes(32).toString('hex');
  return `${prefix}_${randomPart}`;
};

/**
 * Middleware to add service identity to outgoing requests (for axios interceptor)
 */
const addServiceIdentity = (serviceName) => {
  return (config) => {
    config.headers['X-Service-Identity'] = serviceName;
    config.headers['X-API-Key'] = SERVICE_API_KEYS[serviceName] || process.env[`${serviceName.toUpperCase().replace(/-/g, '_')}_API_KEY`];
    return config;
  };
};

module.exports = {
  verifyServiceIdentity,
  isInternalRequest,
  internalOnly,
  generateServiceApiKey,
  addServiceIdentity,
  SERVICE_API_KEYS
};
