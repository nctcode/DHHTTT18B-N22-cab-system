const mongoose = require("mongoose");
const logger = require("../utils/logger");

async function connectDB() {
  try {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    // Connection options for MongoDB Atlas
    const options = {
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000, // 45 seconds
      maxPoolSize: 10,
    };

    await mongoose.connect(mongoURI, options);

    logger.info("✅ MongoDB Atlas connected successfully");
    logger.info(`📊 Database: ${mongoose.connection.name}`);
    logger.info(`📍 Host: ${mongoose.connection.host}`);

    // Connection events
    mongoose.connection.on("error", (err) => {
      logger.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected. Attempting to reconnect...");
    });

    mongoose.connection.on("reconnected", () => {
      logger.info("MongoDB reconnected successfully");
    });
  } catch (error) {
    logger.error("❌ Unable to connect to MongoDB Atlas:", error.message);
    logger.error("Troubleshooting tips:");
    logger.error("1. Check MONGODB_URI in .env file");
    logger.error("2. Verify internet connection");
    logger.error("3. Check Atlas IP whitelist (add 0.0.0.0/0 temporarily)");
    logger.error("4. Verify database credentials");
    throw error;
  }
}

module.exports = { mongoose, connectDB };
