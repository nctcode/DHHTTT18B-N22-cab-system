require("dotenv").config();
const app = require("./app");
const { connectDB } = require("./config/database");
const logger = require("./utils/logger");

const PORT = process.env.PORT || 3006;

async function startServer() {
  try {
    // Connect to database
    await connectDB();
    logger.info("✅ Database connected successfully");

    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 Review Service running on port ${PORT}`);
      logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      logger.info(`🏥 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  logger.error("Unhandled Rejection:", err);
  process.exit(1);
});

startServer();
