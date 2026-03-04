const axios = require('axios');
const logger = require('./logger');

/**
 * Check health of a service
 */
const checkServiceHealth = async (serviceName, serviceUrl) => {
  try {
    const response = await axios.get(`${serviceUrl}/health`, {
      timeout: 5000,
    });
    
    return {
      service: serviceName,
      status: 'healthy',
      url: serviceUrl,
      responseTime: response.headers['x-response-time'] || 'N/A',
    };
  } catch (error) {
    logger.error(`Health check failed for ${serviceName}:`, error.message);
    
    return {
      service: serviceName,
      status: 'unhealthy',
      url: serviceUrl,
      error: error.message,
    };
  }
};

/**
 * Check health of all services
 */
const checkAllServices = async (services) => {
  const healthChecks = Object.entries(services).map(([name, config]) =>
    checkServiceHealth(name, config.url)
  );

  return Promise.all(healthChecks);
};

module.exports = {
  checkServiceHealth,
  checkAllServices,
};
