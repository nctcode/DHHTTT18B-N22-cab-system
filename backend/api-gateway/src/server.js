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

// Create Express app
const app = express();

// Trust proxy
app.set('trust proxy', 1);

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

// Rate limiting
app.use(generalLimiter);

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
const PORT = config.port;
const server = app.listen(PORT, () => {
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
