const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const socketIo = require('socket.io');
const http = require('http');

const bookingRoutes = require('./routes/booking.routes');
const authMiddleware = require('./middleware/auth');
const ErrorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const eventService = require('./services/event.service');
const notificationService = require('./services/notification.service');

// Config
const { connectDatabase } = require('./config/database');
const { connectRabbitMQ, closeConnection } = require('./config/rabbitmq');
const { getRedisClient, connectRedis, disconnectRedis } = require('./config/redis');

require('dotenv').config();

class BookingService {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });
    this.port = process.env.PORT || 3002;
    this.redisClient = null;
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeSocketIO();
    this.initializeErrorHandling();
  }

  initializeMiddlewares() {
    // Security headers
    this.app.use(helmet({
      contentSecurityPolicy: false // Tắt CSP để đơn giản hóa
    }));
    
    // CORS
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }));
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: 'Too many requests, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    
    this.app.use('/api/', limiter);
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.url}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
  }

  initializeRoutes() {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const { getDatabaseStatus } = require('./config/database');
        const { checkRedisHealth } = require('./config/redis');
        
        const dbStatus = getDatabaseStatus();
        const redisHealth = await checkRedisHealth();
        const notificationHealth = await notificationService.healthCheck();
        
        res.json({
          status: 'healthy',
          service: 'booking-service',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          database: dbStatus.readyState === 1 ? 'connected' : 'disconnected',
          redis: redisHealth.status,
          notificationService: notificationHealth.status,
          memory: process.memoryUsage()
        });
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          error: error.message
        });
      }
    });
    
    // API routes
    this.app.use('/api/booking', authMiddleware.verifyToken, bookingRoutes);
    
    // 404 handler
    this.app.use('*', ErrorHandler.notFound);
  }

  initializeSocketIO() {
    this.io.on('connection', (socket) => {
      logger.info('New WebSocket connection:', socket.id);
      
      socket.on('join', (data) => {
        if (data.userId) {
          socket.join(`user:${data.userId}`);
        }
        if (data.driverId) {
          socket.join(`driver:${data.driverId}`);
        }
        if (data.bookingId) {
          socket.join(`booking:${data.bookingId}`);
        }
      });
      
      socket.on('disconnect', () => {
        logger.info('WebSocket disconnected:', socket.id);
      });
    });
    
    // Make io available in routes
    this.app.use((req, res, next) => {
      req.io = this.io;
      next();
    });
  }

  initializeErrorHandling() {
    this.app.use(ErrorHandler.handleError);
  }

  async initializeServices() {
    try {
      logger.info('Initializing services...');
      
      // Connect to MongoDB
      await connectDatabase();
      logger.info('MongoDB connected successfully');
      
      // Connect to Redis
      await connectRedis();
      this.redisClient = getRedisClient();
      logger.info('Redis connected successfully');
      
      // Initialize notification service
      await notificationService.initialize();
      logger.info('Notification service initialized');
      
      // Connect to RabbitMQ
      const channel = await connectRabbitMQ();
      logger.info('RabbitMQ connected successfully');
      
      // Start event consumers
      eventService.startConsumers(channel);
      logger.info('Event consumers started');
      
      logger.info('All services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize services:', error);
      throw error;
    }
  }

  async start() {
    try {
      await this.initializeServices();
      
      this.server.listen(this.port, () => {
        logger.info(`Booking service running on port ${this.port}`);
        logger.info(`Environment: ${process.env.NODE_ENV}`);
        logger.info(`Service URL: http://localhost:${this.port}`);
      });
      
      // Graceful shutdown
      this.setupGracefulShutdown();
      
    } catch (error) {
      logger.error('Failed to start booking service:', error);
      process.exit(1);
    }
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      
      // Close HTTP server
      this.server.close(async () => {
        logger.info('HTTP server closed');
        
        // Close Redis connection
        await disconnectRedis();
        logger.info('Redis connection closed');
        
        // Cleanup notification service
        await notificationService.cleanup();
        logger.info('Notification service cleaned up');
        
        // Close MongoDB connection
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');
        
        // Close RabbitMQ connection
        await closeConnection();
        logger.info('RabbitMQ connection closed');
        
        process.exit(0);
      });
      
      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      shutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
  }

  getApp() {
    return this.app;
  }

  getServer() {
    return this.server;
  }
}

// Start the service if this file is run directly
if (require.main === module) {
  const bookingService = new BookingService();
  bookingService.start().catch(error => {
    logger.error('Failed to start service:', error);
    process.exit(1);
  });
}

module.exports = new BookingService().getApp();