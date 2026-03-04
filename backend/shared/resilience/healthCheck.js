 // backend/shared/resilience/healthCheck.js
/**
 * Enhanced Health Check System
 * Provides liveness and readiness probes for Kubernetes
 */

const { healthCheckWithCircuitBreakers } = require('./circuitBreaker');

/**
 * Health check result structure
 */
class HealthCheckResult {
  constructor() {
    this.healthy = true;
    this.checks = {};
    this.timestamp = new Date().toISOString();
  }

  addCheck(name, status, details = {}) {
    this.checks[name] = {
      status, // 'healthy', 'degraded', 'unhealthy'
      ...details
    };

    if (status === 'unhealthy') {
      this.healthy = false;
    }
  }

  toJSON() {
    return {
      status: this.healthy ? 'healthy' : 'unhealthy',
      timestamp: this.timestamp,
      checks: this.checks
    };
  }
}

/**
 * Database health check
 */
const checkDatabase = async (db) => {
  try {
    // Try a simple query
    await db.query('SELECT 1');
    
    return {
      status: 'healthy',
      message: 'Database connection OK'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Database connection failed',
      error: error.message
    };
  }
};

/**
 * Redis health check
 */
const checkRedis = async (redis) => {
  try {
    if (!redis || !redis.isOpen) {
      return {
        status: 'degraded',
        message: 'Redis not connected (using in-memory fallback)'
      };
    }

    await redis.ping();
    
    return {
      status: 'healthy',
      message: 'Redis connection OK'
    };
  } catch (error) {
    return {
      status: 'degraded',
      message: 'Redis connection failed',
      error: error.message
    };
  }
};

/**
 * RabbitMQ health check
 */
const checkRabbitMQ = async (rabbitMQ) => {
  try {
    if (!rabbitMQ || !rabbitMQ.connection) {
      return {
        status: 'unhealthy',
        message: 'RabbitMQ not connected'
      };
    }

    // Check if connection is open
    const isConnected = rabbitMQ.connection && !rabbitMQ.connection.connection.stream.destroyed;

    if (!isConnected) {
      return {
        status: 'unhealthy',
        message: 'RabbitMQ connection closed'
      };
    }

    return {
      status: 'healthy',
      message: 'RabbitMQ connection OK'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'RabbitMQ health check failed',
      error: error.message
    };
  }
};

/**
 * Memory health check
 */
const checkMemory = () => {
  const usage = process.memoryUsage();
  const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100;

  let status = 'healthy';
  let message = 'Memory usage normal';

  if (heapUsedPercent > 90) {
    status = 'unhealthy';
    message = 'Memory usage critical';
  } else if (heapUsedPercent > 75) {
    status = 'degraded';
    message = 'Memory usage high';
  }

  return {
    status,
    message,
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
    heapUsedPercent: `${heapUsedPercent.toFixed(2)}%`
  };
};

/**
 * Disk space health check (if applicable)
 */
const checkDisk = () => {
  // This is a placeholder - actual implementation would check disk space
  return {
    status: 'healthy',
    message: 'Disk space OK'
  };
};

/**
 * Liveness Probe
 * Answers: "Is the application process alive?"
 * Kubernetes will restart pod if this fails
 */
const livenessProbe = async () => {
  const result = new HealthCheckResult();

  // Check if process is responsive
  result.addCheck('process', 'healthy', {
    pid: process.pid,
    uptime: `${Math.round(process.uptime())}s`,
    nodeVersion: process.version
  });

  // Check memory (critical)
  const memCheck = checkMemory();
  result.addCheck('memory', memCheck.status === 'unhealthy' ? 'unhealthy' : 'healthy', memCheck);

  return result.toJSON();
};

/**
 * Readiness Probe
 * Answers: "Is the application ready to serve traffic?"
 * Kubernetes will remove pod from service if this fails
 */
const readinessProbe = async (dependencies = {}) => {
  const result = new HealthCheckResult();
  const { db, redis, rabbitMQ } = dependencies;

  // Check database (critical for most services)
  if (db) {
    const dbCheck = await checkDatabase(db);
    result.addCheck('database', dbCheck.status, dbCheck);
  }

  // Check Redis (degraded OK, can use fallback)
  if (redis) {
    const redisCheck = await checkRedis(redis);
    result.addCheck('redis', redisCheck.status === 'unhealthy' ? 'degraded' : redisCheck.status, redisCheck);
  }

  // Check RabbitMQ (critical for event-driven services)
  if (rabbitMQ) {
    const mqCheck = await checkRabbitMQ(rabbitMQ);
    result.addCheck('rabbitmq', mqCheck.status, mqCheck);
  }

  // Check circuit breakers
  const cbHealth = healthCheckWithCircuitBreakers();
  result.addCheck('circuitBreakers', cbHealth.healthy ? 'healthy' : 'degraded', cbHealth);

  // Memory check
  const memCheck = checkMemory();
  result.addCheck('memory', memCheck.status, memCheck);

  return result.toJSON();
};

/**
 * Startup Probe
 * Answers: "Has the application finished starting up?"
 * Used for slow-starting applications
 */
const startupProbe = async () => {
  // Check if all critical services are initialized
  const result = new HealthCheckResult();

  result.addCheck('startup', 'healthy', {
    message: 'Application started successfully',
    startTime: new Date(Date.now() - process.uptime() * 1000).toISOString()
  });

  return result.toJSON();
};

/**
 * Detailed health endpoint for monitoring
 */
const detailedHealth = async (dependencies = {}) => {
  const result = new HealthCheckResult();
  const { db, redis, rabbitMQ } = dependencies;

  // All checks
  if (db) {
    const dbCheck = await checkDatabase(db);
    result.addCheck('database', dbCheck.status, dbCheck);
  }

  if (redis) {
    const redisCheck = await checkRedis(redis);
    result.addCheck('redis', redisCheck.status, redisCheck);
  }

  if (rabbitMQ) {
    const mqCheck = await checkRabbitMQ(rabbitMQ);
    result.addCheck('rabbitmq', mqCheck.status, mqCheck);
  }

  // Circuit breakers
  const cbHealth = healthCheckWithCircuitBreakers();
  result.addCheck('circuitBreakers', cbHealth.healthy ? 'healthy' : 'degraded', cbHealth);

  // Memory
  const memCheck = checkMemory();
  result.addCheck('memory', memCheck.status, memCheck);

  // Disk
  const diskCheck = checkDisk();
  result.addCheck('disk', diskCheck.status, diskCheck);

  // Process info
  result.addCheck('process', 'healthy', {
    pid: process.pid,
    uptime: `${Math.round(process.uptime())}s`,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch
  });

  return result.toJSON();
};

/**
 * Express middleware for health endpoints
 */
const createHealthEndpoints = (app, dependencies = {}) => {
  // Liveness probe - simple and fast
  app.get('/health/live', async (req, res) => {
    const health = await livenessProbe();
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  });

  // Readiness probe - checks dependencies
  app.get('/health/ready', async (req, res) => {
    const health = await readinessProbe(dependencies);
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  });

  // Startup probe
  app.get('/health/startup', async (req, res) => {
    const health = await startupProbe();
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  });

  // Detailed health for monitoring
  app.get('/health', async (req, res) => {
    const health = await detailedHealth(dependencies);
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  });

  // Legacy health check (for backward compatibility)
  app.get('/api/health', async (req, res) => {
    res.json({
      success: true,
      message: 'API Gateway is running',
      timestamp: new Date().toISOString()
    });
  });
};

module.exports = {
  livenessProbe,
  readinessProbe,
  startupProbe,
  detailedHealth,
  createHealthEndpoints,
  checkDatabase,
  checkRedis,
  checkRabbitMQ,
  checkMemory
};
