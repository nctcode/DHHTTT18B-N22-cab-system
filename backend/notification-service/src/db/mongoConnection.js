const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/notification_db';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});

mongoose.connection.on('connected', () => {
  console.log('✅ Đã kết nối MongoDB:', MONGODB_URI);
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Lỗi kết nối MongoDB:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('📴 Ngắt kết nối MongoDB');
});

// Xử lý khi ứng dụng bị tắt
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed through app termination');
  process.exit(0);
});

module.exports = mongoose;