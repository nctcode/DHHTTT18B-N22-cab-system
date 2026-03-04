require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const notificationSubscriber = require('./subscribers/notification.subscriber');

const PORT = process.env.PORT || 3008;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/notification_db';

const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected:', MONGODB_URI);

    // 2. Register event subscribers (passive listeners)
    notificationSubscriber.register();

    // 3. Start HTTP server
    const server = app.listen(PORT, () => {
      console.log(`🔔 Notification Service running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('Shutting down...');
      server.close(async () => {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();