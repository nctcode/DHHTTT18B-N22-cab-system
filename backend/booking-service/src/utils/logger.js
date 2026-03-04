const winston = require('winston');
const path = require('path');

const logDir = 'logs';

// Định nghĩa các cấp độ log
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Xác định cấp độ log dựa trên môi trường
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Định nghĩa màu sắc cho từng cấp độ log
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Thêm màu sắc cho winston
winston.addColors(colors);

// Định dạng log
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Các transport cho logger
const transports = [
  // Hiển thị log ra console
  new winston.transports.Console(),
  // Ghi log error vào file
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
  }),
  // Ghi tất cả log vào file
  new winston.transports.File({ filename: path.join(logDir, 'all.log') }),
];

// Tạo logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});

module.exports = logger;