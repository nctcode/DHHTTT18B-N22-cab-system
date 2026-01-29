require('dotenv').config();
const mongoose = require('../src/db/mongoConnection');
const Notification = require('../src/models/Notification');

const testNotifications = [
  {
    userId: 'user-123',
    type: 'RIDE_STATUS',
    title: 'Chuyến đi đã được xác nhận',
    message: 'Tài xế Nguyễn Văn A sẽ đến đón bạn trong 5 phút',
    metadata: {
      rideId: 'ride-001',
      driverName: 'Nguyễn Văn A',
      eta: '5 phút',
      vehicle: 'Toyota Vios'
    },
    isRead: false
  },
  {
    userId: 'user-123',
    type: 'RIDE_STATUS',
    title: 'Tài xế đang trên đường đến',
    message: 'Tài xế đã bắt đầu di chuyển đến điểm đón',
    metadata: {
      rideId: 'ride-001',
      driverLocation: { lat: 10.762622, lng: 106.660172 }
    },
    isRead: true,
    readAt: new Date('2024-01-15T10:30:00Z')
  },
  {
    userId: 'user-123',
    type: 'PAYMENT',
    title: 'Thanh toán thành công',
    message: 'Chuyến đi #RIDE-001 đã được thanh toán thành công 150,000 VND',
    metadata: {
      rideId: 'ride-001',
      amount: 150000,
      paymentMethod: 'VNPay',
      transactionId: 'txn-001'
    },
    isRead: false
  },
  {
    userId: 'user-456',
    type: 'SYSTEM',
    title: 'Chào mừng đến với CAB Booking',
    message: 'Cảm ơn bạn đã đăng ký tài khoản!',
    metadata: {
      welcomeBonus: 50000
    },
    isRead: false
  },
  {
    userId: 'user-456',
    type: 'PROMOTION',
    title: 'Khuyến mãi đặc biệt',
    message: 'Giảm 30% cho chuyến đi đầu tiên',
    metadata: {
      discount: '30%',
      code: 'WELCOME30',
      expires: '2024-12-31'
    },
    isRead: true,
    readAt: new Date('2024-01-14T15:45:00Z')
  },
  {
    userId: 'driver-789',
    type: 'RIDE_STATUS',
    title: 'Có chuyến đi mới',
    message: 'Bạn có yêu cầu đặt xe từ Quận 1 đến Quận 7',
    metadata: {
      rideId: 'ride-002',
      pickup: 'Quận 1, TP.HCM',
      dropoff: 'Quận 7, TP.HCM',
      fare: 120000
    },
    isRead: false
  },
  {
    userId: 'driver-789',
    type: 'PAYMENT',
    title: 'Đã nhận thanh toán',
    message: 'Bạn đã nhận 95,000 VND cho chuyến đi #RIDE-002',
    metadata: {
      rideId: 'ride-002',
      amount: 95000,
      commission: 25000
    },
    isRead: false
  }
];

async function seedDatabase() {
  try {
    // Đợi kết nối MongoDB
    await mongoose.connection.dropDatabase();
    console.log('✅ Đã xóa database cũ');

    // Thêm dữ liệu test
    await Notification.insertMany(testNotifications);
    console.log(`✅ Đã thêm ${testNotifications.length} thông báo test`);

    // Hiển thị thống kê
    const user123Count = await Notification.countDocuments({ userId: 'user-123' });
    const user456Count = await Notification.countDocuments({ userId: 'user-456' });
    const driver789Count = await Notification.countDocuments({ userId: 'driver-789' });

    console.log('\n📊 Thống kê dữ liệu test:');
    console.log(`- User user-123: ${user123Count} thông báo`);
    console.log(`- User user-456: ${user456Count} thông báo`);
    console.log(`- Driver driver-789: ${driver789Count} thông báo`);

    // Tổng số
    const total = await Notification.countDocuments();
    console.log(`- Tổng cộng: ${total} thông báo`);

    // Hiển thị endpoints test
    console.log('\n🔗 Endpoints để test:');
    console.log('1. GET http://localhost:3009/notifications/user/user-123');
    console.log('2. GET http://localhost:3009/notifications/user/user-456?unreadOnly=true');
    console.log('3. POST http://localhost:3009/notifications/send');
    console.log('   Body: { "userId": "user-999", "type": "SYSTEM", "title": "Test", "message": "Đây là test" }');
    console.log('4. PUT http://localhost:3009/notifications/{notificationId}/read');
    console.log('5. GET http://localhost:3009/health');

  } catch (error) {
    console.error('❌ Lỗi khi seed database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Hoàn thành seed database');
    process.exit(0);
  }
}

seedDatabase();