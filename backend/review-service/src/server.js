require('dotenv').config();
const app = require('./app');
const reviewSubscriber = require('./subscribers/review.subscriber');
const rabbitmq = require('./utils/rabbitmq');

const PORT = process.env.PORT || 3006;

const startServer = async () => {
  try {
    // 1. Connect RabbitMQ FIRST so channel is ready for subscribers
    await rabbitmq.connect();

    // 2. Register event subscribers (Local and RabbitMQ)
    await reviewSubscriber.register();

    // 2. Start HTTP server
    const server = app.listen(PORT, () => {
      console.log(`⭐ Review Service running on port ${PORT}`);
      console.log(`📊 Database: PostgreSQL (Prisma)`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

startServer();
