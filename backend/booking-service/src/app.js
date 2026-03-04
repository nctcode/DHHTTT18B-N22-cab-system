const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();
const rabbitmq = require('./messaging/rabbitmq');

const app = express();
const PORT = process.env.PORT || 3004;

// Database
const db = require('./config/database');

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Request timeout
app.use((req, res, next) => {
  req.setTimeout(30000);
  res.setTimeout(30000);
  next();
});

// Routes
app.use('/bookings', require('./routes/booking.routes'));
// Internal API for other services (e.g. ride-service) - no user auth
app.use('/internal', require('./routes/internal.routes'));

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbStatus = db.getStatus();
  
  res.status(200).json({
    success: true,
    message: 'Booking service is healthy',
    timestamp: new Date().toISOString(),
    database: dbStatus.connected ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Booking Service Error:', err.message);
  
  // JSON parse error
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body'
    });
  }
  
  // Validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }
  
  // Default error
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
  async function startServer() {
  try {
    // Connect to database
    await db.connect();
    
    // Connect to RabbitMQ
    await rabbitmq.connect();

    // Start Consumers
    const consumers = require('./messaging/consumers');
    await consumers.startConsumers();

    // Register consumers to auto-restart on RabbitMQ reconnection
    rabbitmq.setOnReconnect(() => consumers.startConsumers());
    
    app.listen(PORT, () => {
      console.log(`✅ Booking Service running on port ${PORT}`);
      console.log(`🌐 Health: http://localhost:${PORT}/health`);
      console.log(`📊 MongoDB: ${process.env.MONGODB_URI}`);
    });
  } catch (error) {
    console.error('Failed to start booking service:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await db.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  await db.disconnect();
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;