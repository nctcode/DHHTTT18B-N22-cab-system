const { Sequelize } = require("sequelize");
const logger = require("../utils/logger");

// Tạo connection string từ các biến môi trường riêng lẻ
const databaseUrl =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

// Debug: Kiểm tra connection string
logger.debug(`Database URL: ${databaseUrl.replace(/:([^:@]+)@/, ":****@")}`); // Ẩn password

const sequelize = new Sequelize(databaseUrl, {
  dialect: "postgres",
  logging:
    process.env.NODE_ENV === "development" ? (msg) => logger.debug(msg) : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

async function connectDB() {
  try {
    await sequelize.authenticate();
    logger.info("✅ PostgreSQL connected successfully");

    // CHỈ KẾT NỐI, KHÔNG SYNC
    logger.info("📊 Database connection ready");

    // Kiểm tra bảng tồn tại
    const tableExists = await sequelize.getQueryInterface().showAllTables();
    if (tableExists.includes("reviews")) {
      logger.info("✅ Reviews table exists");
    } else {
      logger.warn("⚠️ Reviews table does not exist. Run: npm run seed");
    }
  } catch (error) {
    logger.error("❌ Unable to connect to PostgreSQL:", error.message);
    logger.error("Connection details:", {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
    });
    throw error;
  }
}

module.exports = { sequelize, connectDB };
