// src/app.js
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

// Config
const { connectDatabase, getDatabaseStatus } = require('./config/database');
const { connectRabbitMQ, getChannel } = require('./config/rabbitmq');
const redis = require('./config/redis');

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
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"]
        }
      }
    }));
    
    // CORS
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }));
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
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
    
    // Add request ID
    this.app.use((req, res, next) => {
      req.requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      res.setHeader('X-Request-ID', req.requestId);
      next();
    });
  }

  initializeRoutes() {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const dbStatus = getDatabaseStatus();
        const redisStatus = this.redisClient ? 'connected' : 'disconnected';
        
        res.json({
          status: 'healthy',
          service: 'booking-service',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          database: dbStatus.readyState === 1 ? 'connected' : 'disconnected',
          redis: redisStatus,
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
    this.app.use('/api/v1/bookings', authMiddleware.verifyToken, bookingRoutes);
    
    // 404 handler
    this.app.use('*', ErrorHandler.notFound);
  }

  initializeSocketIO() {
    this.io.on('connection', (socket) => {
      logger.info('New WebSocket connection:', socket.id);
      
      socket.on('join', (data) => {
        if (data.userId) {
          socket.join(`user:${data.userId}`);
          logger.info(`User ${data.userId} joined room`);
        }
        if (data.driverId) {
          socket.join(`driver:${data.driverId}`);
          logger.info(`Driver ${data.driverId} joined room`);
        }
        if (data.bookingId) {
          socket.join(`booking:${data.bookingId}`);
          logger.info(`Socket joined booking room: ${data.bookingId}`);
        }
      });
      
      socket.on('location_update', (data) => {
        // Broadcast location updates to relevant rooms
        if (data.bookingId) {
          socket.to(`booking:${data.bookingId}`).emit('driver_location', data);
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
      // Connect to MongoDB
      await connectDatabase();
      
      // Initialize Redis - SỬA Ở ĐÂY
      // this.redisClient = createRedisClient();
      // await this.redisClient.connect();
      
      // Thay bằng:
      this.redisClient = redis();
      await this.redisClient.connect();
      
      // Connect to RabbitMQ
      const channel = await connectRabbitMQ();
      
      // Start event consumers
      eventService.startConsumers(channel);
      
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
        if (this.redisClient) {
          await this.redisClient.quit();
          logger.info('Redis connection closed');
        }
        
        // Close MongoDB connection
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');
        
        // Close RabbitMQ connection
        const { closeConnection } = require('./config/rabbitmq');
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
  bookingService.start();
}

module.exports = new BookingService().getApp();