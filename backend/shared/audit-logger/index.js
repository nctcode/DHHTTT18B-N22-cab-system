// backend/shared/audit-logger/index.js
/**
 * Centralized Audit Logging System
 * Logs security-critical events for compliance and threat detection
 */

const winston = require('winston');
const { createClient } = require('redis');

let redisClient = null;
let logger = null;

// Audit event types
const AuditEventTypes = {
  // Authentication Events
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  TOKEN_REFRESH: 'TOKEN_REFRESH',
  TOKEN_REVOKED: 'TOKEN_REVOKED',
  
  // Authorization Events
  ACCESS_DENIED: 'ACCESS_DENIED',
  PERMISSION_CHANGED: 'PERMISSION_CHANGED',
  ROLE_CHANGED: 'ROLE_CHANGED',
  
  // Payment Events
  PAYMENT_INITIATED: 'PAYMENT_INITIATED',
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_REFUND: 'PAYMENT_REFUND',
  
  // Data Access Events
  SENSITIVE_DATA_ACCESS: 'SENSITIVE_DATA_ACCESS',
  DATA_MODIFICATION: 'DATA_MODIFICATION',
  DATA_DELETION: 'DATA_DELETION',
  DATA_EXPORT: 'DATA_EXPORT',
  
  // Security Events
  WAF_BLOCK: 'WAF_BLOCK',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  SECURITY_VIOLATION: 'SECURITY_VIOLATION',
  
  // Admin Events
  ADMIN_ACTION: 'ADMIN_ACTION',
  CONFIG_CHANGE: 'CONFIG_CHANGE',
  USER_CREATED: 'USER_CREATED',
  USER_DELETED: 'USER_DELETED'
};

// Initialize Winston logger
const initLogger = () => {
  if (logger) return logger;

  logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    defaultMeta: { service: 'audit-logger' },
    transports: [
      // Write to file
      new winston.transports.File({ 
        filename: 'logs/audit-error.log', 
        level: 'error' 
      }),
      new winston.transports.File({ 
        filename: 'logs/audit-combined.log' 
      }),
      // Console output in development
      ...(process.env.NODE_ENV === 'development' 
        ? [new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.simple()
            )
          })]
        : []
      )
    ]
  });

  return logger;
};

// Initialize Redis for real-time audit streaming (optional)
const initRedis = async () => {
  if (!process.env.REDIS_HOST) return null;

  try {
    redisClient = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'redis',
        port: process.env.REDIS_PORT || 6379
      }
    });

    await redisClient.connect();
    console.log('✅ Audit Logger Redis connected');
    return redisClient;
  } catch (error) {
    console.error('❌ Audit Logger Redis connection failed:', error);
    return null;
  }
};

/**
 * Log audit event
 * @param {Object} event - Audit event details
 */
const logAuditEvent = async (event) => {
  const log = initLogger();

  const auditLog = {
    timestamp: new Date().toISOString(),
    eventType: event.eventType,
    userId: event.userId || 'anonymous',
    userEmail: event.userEmail || null,
    userRole: event.userRole || null,
    action: event.action,
    resource: event.resource || null,
    resourceId: event.resourceId || null,
    status: event.status || 'unknown', // success, failure, denied
    ipAddress: event.ipAddress || null,
    userAgent: event.userAgent || null,
    details: event.details || {},
    severity: event.severity || 'info', // info, warning, error, critical
    service: event.service || 'unknown'
  };

  // Log to file
  log.info('AUDIT', auditLog);

  // Stream to Redis for real-time monitoring (optional)
  if (!redisClient && process.env.REDIS_HOST) {
    await initRedis();
  }

  if (redisClient) {
    try {
      // Add to Redis stream for SIEM
      await redisClient.xAdd('audit-events', '*', {
        data: JSON.stringify(auditLog)
      });

      // Keep only last 10000 events in stream
      await redisClient.xTrim('audit-events', 'MAXLEN', '~', 10000);
    } catch (error) {
      console.error('Failed to stream audit log to Redis:', error);
    }
  }

  // Console log for critical events
  if (auditLog.severity === 'critical' || auditLog.severity === 'error') {
    console.warn('🚨 [CRITICAL AUDIT EVENT]', auditLog);
  }

  return auditLog;
};

/**
 * Express middleware to automatically log requests
 */
const auditMiddleware = (options = {}) => {
  return async (req, res, next) => {
    const start = Date.now();

    // Capture response
    const originalSend = res.send;
    let responseBody;

    res.send = function(body) {
      responseBody = body;
      res.send = originalSend;
      return res.send(body);
    };

    // Log after response
    res.on('finish', async () => {
      const duration = Date.now() - start;

      // Only log specific events based on options
      const shouldLog = 
        options.logAll ||
        res.statusCode >= 400 || // Errors
        req.method !== 'GET' || // Non-GET requests
        options.paths?.some(path => req.path.startsWith(path));

      if (shouldLog) {
        await logAuditEvent({
          eventType: res.statusCode >= 400 ? 'ACCESS_DENIED' : 'DATA_ACCESS',
          userId: req.user?.id,
          userEmail: req.user?.email,
          userRole: req.user?.role,
          action: `${req.method} ${req.path}`,
          resource: req.path,
          status: res.statusCode < 400 ? 'success' : 'failure',
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          details: {
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            query: req.query,
            params: req.params
          },
          severity: res.statusCode >= 500 ? 'error' : 'info',
          service: options.service || 'api-gateway'
        });
      }
    });

    next();
  };
};

/**
 * Helper functions for common audit events
 */
const auditHelpers = {
  loginSuccess: (userId, userEmail, userRole, ipAddress, userAgent) => 
    logAuditEvent({
      eventType: AuditEventTypes.LOGIN_SUCCESS,
      userId,
      userEmail,
      userRole,
      action: 'User logged in',
      status: 'success',
      ipAddress,
      userAgent,
      severity: 'info'
    }),

  loginFailure: (email, ipAddress, userAgent, reason) => 
    logAuditEvent({
      eventType: AuditEventTypes.LOGIN_FAILURE,
      userId: null,
      userEmail: email,
      action: 'Login attempt failed',
      status: 'failure',
      ipAddress,
      userAgent,
      details: { reason },
      severity: 'warning'
    }),

  paymentSuccess: (userId, rideId, amount, method) => 
    logAuditEvent({
      eventType: AuditEventTypes.PAYMENT_SUCCESS,
      userId,
      action: 'Payment processed',
      resource: 'payment',
      resourceId: rideId,
      status: 'success',
      details: { amount, method },
      severity: 'info'
    }),

  paymentFailure: (userId, rideId, amount, reason) => 
    logAuditEvent({
      eventType: AuditEventTypes.PAYMENT_FAILED,
      userId,
      action: 'Payment failed',
      resource: 'payment',
      resourceId: rideId,
      status: 'failure',
      details: { amount, reason },
      severity: 'error'
    }),

  accessDenied: (userId, resource, reason, ipAddress) => 
    logAuditEvent({
      eventType: AuditEventTypes.ACCESS_DENIED,
      userId,
      action: 'Access denied',
      resource,
      status: 'denied',
      ipAddress,
      details: { reason },
      severity: 'warning'
    }),

  wafBlock: (ipAddress, threatType, path, userAgent) => 
    logAuditEvent({
      eventType: AuditEventTypes.WAF_BLOCK,
      userId: null,
      action: 'WAF blocked request',
      resource: path,
      status: 'blocked',
      ipAddress,
      userAgent,
      details: { threatType },
      severity: 'critical'
    }),

  permissionChanged: (adminId, targetUserId, oldRole, newRole) => 
    logAuditEvent({
      eventType: AuditEventTypes.PERMISSION_CHANGED,
      userId: adminId,
      action: 'User role changed',
      resource: 'user',
      resourceId: targetUserId,
      status: 'success',
      details: { oldRole, newRole },
      severity: 'warning'
    })
};

module.exports = {
  logAuditEvent,
  auditMiddleware,
  auditHelpers,
  AuditEventTypes,
  initLogger,
  initRedis
};
