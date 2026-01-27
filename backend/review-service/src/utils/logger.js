const winston = require("winston");
const { format } = winston;

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: format.combine(
    format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json(),
  ),
  defaultMeta: {
    service: "review-service",
    database: "mongodb-atlas",
  },
  transports: [
    new winston.transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          const metaString = Object.keys(meta).length
            ? JSON.stringify(meta)
            : "";
          return `${timestamp} [${level}]: ${message} ${metaString}`;
        }),
      ),
    }),
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
    }),
    new winston.transports.File({
      filename: "logs/combined.log",
    }),
  ],
});

// Log MongoDB Atlas connection events
logger.info("Review Service initialized with MongoDB Atlas");

module.exports = logger;
