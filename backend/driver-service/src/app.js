const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const { gatewayAuth } = require('./middleware/gateway.middleware');

// Import routes
const driverRoutes = require('./routes/driver.routes');

// Import middleware
// const errorHandler = require('./middleware/errorHandler'); 
// Assuming errorHandler exists or we use simple error handling. 
// User didn't ask for errorHandler refactor but we should keep it if it exists, or just use simple one.
// Let's keep it if it was there, otherwise simple one. The previous file had it at line 12.

// Import messaging and Redis (Keeping these as they might be needed for other features not mentioned, but user said "Refactor WHOLE service")
// If the new requirements don't mention Redis/RabbitMQ explicitly, but they are infrastructure, I should probably keep them if they are used.
// However, the `driver.service.js` I wrote doesn't use Redis/RabbitMQ.
// The requirements focused on "schema Prisma mới", "REST API", "Microservice architecture".
// If I remove them, I might break async logic. But the user didn't ask to implement async messaging in THIS prompt.
// "Refactor toàn bộ... đồng bộ với schema Prisma... Endpoint Design... Clean Architecture".
// I'll comment them out for now to ensure strict adherence to the *requested* scope (REST API), 
// OR keep them if they don't conflict. 
// Since `driver.service.js` DOES NOT emit events, keeping them might be dead code.
// I will remove them to keep it clean and focused on the requested refactor.

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;
const prisma = new PrismaClient();

// Global timeout
app.use((req, res, next) => {
  req.setTimeout(60000);
  res.setTimeout(60000);
  next();
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check (no auth needed)
app.get('/health', (req, res) => {
  res.status(200).json({
    service: 'Driver Service',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// API Routes - gatewayAuth is applied selectively inside the router
// /drivers/available is public (used by booking-service internally)
// Other routes require gatewayAuth (applied via router.use in driver.routes.js)
app.use('/drivers', driverRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start Server
async function startServer() {
  try {
    // Connect to Database
    await prisma.$connect();
    console.log('Prisma connected to Database');

    // Initialize RabbitMQ
    const rabbitmq = require('./messaging/rabbitmq');
    const { startConsumers } = require('./messaging/consumers');
    
    // Register consumers as reconnect callback BEFORE connecting
    // This ensures consumers start even if initial connect fails and retries
    rabbitmq.setOnReconnect(startConsumers);
    
    await rabbitmq.connect();
    await startConsumers();
    console.log('RabbitMQ connected and consumers started');

    app.listen(PORT, () => {
      console.log(`Driver Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  try {
    const rabbitmq = require('./messaging/rabbitmq');
    if (rabbitmq.connection) await rabbitmq.connection.close();
  } catch (err) {}
  process.exit(0);
});

startServer();

module.exports = app;
