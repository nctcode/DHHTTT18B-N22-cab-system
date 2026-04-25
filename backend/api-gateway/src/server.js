const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger.config');
const config = require('./config/app.config');
const services = require('./config/services.config');
const routes = require('./routes');
const { generalLimiter } = require('./middlewares/rate-limit.middleware');
const { errorHandler, notFoundHandler } = require('./utils/error-handler');
const { checkAllServices } = require('./utils/health-check');
const logger = require('./utils/logger');

// Security Middlewares
const { wafProtection } = require('./middlewares/waf.middleware');
const { checkTokenRevocation } = require('./middlewares/tokenRevocation.middleware');
// TODO: Enable after fixing shared modules in Docker
// const { auditMiddleware } = require('../../shared/audit-logger');

// Create Express app
const app = express();

// Trust proxy
app.set('trust proxy', 1);

// 1. EARLY REQUEST ABORT HANDLER - Prevent "already handled" errors
app.use((req, res, next) => {
  let isRequestAborted = false;
  
  // Handle client disconnect
  req.on('aborted', () => {
    isRequestAborted = true;
    logger.warn('[Request Aborted]', req.method, req.path);
  });
  
  res.on('finish', () => {
    if (isRequestAborted) {
      logger.log('[Request Finished After Abort]', req.method, req.path);
    }
  });
  
  // Store abort flag for later middleware
  req.isAborted = () => isRequestAborted;
  
  next();
});

// 2. TIMEOUT MIDDLEWARE - MUST BE BEFORE BODY PARSER
app.use((req, res, next) => {
  req.setTimeout(90000);    // 90 seconds for gateway
  res.setTimeout(90000);    // 90 seconds for gateway
  next();
});

// Security middleware - Allow Swagger UI
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS
app.use(cors(config.cors));

// Compression
app.use(compression());

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 3. BODY PARSER ERROR HANDLER - MUST COME RIGHT AFTER BODY PARSER
app.use((err, req, res, next) => {
  // If request is already aborted, don't try to send response
  if (req.isAborted && req.isAborted()) {
    logger.log('[Skipping response - request was aborted]', req.method, req.path);
    return;
  }
  
  if (err instanceof SyntaxError && 'body' in err) {
    logger.error('[Body Parser Error]', err.message);
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body',
      details: err.message
    });
  }
  
  if (err.code === 'ECONNABORTED' || err.code === 'ECONNREFUSED') {
    logger.error('[Connection Error]', err.code);
    if (!res.headersSent) {
      return res.status(408).json({
        success: false,
        message: 'Request timeout or connection aborted',
        code: err.code
      });
    }
    return;
  }
  
  // Pass other errors to next handler
  next(err);
});

// Logging middleware
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Custom request logger
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Swagger Documentation
app.use('/swagger', swaggerUi.serve);
app.get('/swagger', swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Cab Booking API Documentation',
}));

// Redirect /swagger/index.html to /swagger for compatibility
app.get('/swagger/index.html', (req, res) => {
  res.redirect('/swagger');
});

// Swagger JSON endpoint
app.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Zero Trust Security Middlewares
// 1. WAF Protection - Must come early to block malicious requests
app.use(wafProtection);

// 2. Rate limiting
app.use(generalLimiter);

// 3. Token Revocation Check - Applied globally
app.use(checkTokenRevocation);

// 4. Audit Logging - Log security-critical events
// TODO: Enable after fixing shared modules in Docker
// app.use(auditMiddleware({
//   service: 'api-gateway',
//   paths: ['/api/auth', '/api/payment', '/api/booking'] // Audit these paths
// }));

// Welcome route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Cab System API Gateway',
    version: '1.0.0',
    documentation: `http://localhost:${config.port}/swagger`,
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API Gateway is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
  });
});

// Liveness probe for Docker/K8s
app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Services health check endpoint
app.get('/health/services', async (req, res) => {
  try {
    const healthStatus = await checkAllServices(services);
    
    const allHealthy = healthStatus.every(service => service.status === 'healthy');
    
    res.status(allHealthy ? 200 : 503).json({
      success: allHealthy,
      message: allHealthy ? 'All services are healthy' : 'Some services are unhealthy',
      services: healthStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error checking services health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check services health',
      error: error.message,
    });
  }
});

// API routes
app.use('/api', routes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
const http = require('http');
const { initializeSocket } = require('./socket');

const PORT = process.env.PORT || config.port; // Use config.port as fallback

const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);

server.listen(PORT, () => {
  logger.info(`🚀 API Gateway is running on port ${PORT}`);
  logger.info(`Environment: ${config.env}`);
  logger.info(`CORS enabled for: ${config.cors.origin}`);
  logger.info(`JWT Secret: ${config.jwt.secret.substring(0, 10)}...`);
  
  // Log all registered services
  logger.info('Registered Services:');
  Object.entries(services).forEach(([name, service]) => {
    logger.info(`  - ${name.toUpperCase()}: ${service.url}`);
  });
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  gracefulShutdown('unhandledRejection');
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

module.exports = app;
 
