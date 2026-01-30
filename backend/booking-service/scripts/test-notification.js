// scripts/test-notification.js
const notificationService = require('../src/services/notification.service');

async function testNotifications() {
  console.log('🔔 Testing Notification Service\n');
  
  const testBooking = {
    bookingId: 'TEST-' + Date.now(),
    passengerId: 'TEST-PASSENGER-001',
    driverId: 'TEST-DRIVER-001',
    pickupLocation: {
      address: '123 Test Street, HCM',
      coordinates: { lat: 10.762622, lng: 106.660172 }
    },
    destination: {
      address: '456 Test Avenue, HCM',
      coordinates: { lat: 10.771952, lng: 106.700272 }
    },
    vehicleType: 'STANDARD',
    fare: {
      totalFare: 50000,
      currency: 'VND'
    },
    payment: {
      method: 'CASH',
      status: 'PENDING'
    }
  };
  
  console.log('1. Testing nearby drivers notification...');
  try {
    const driverCount = await notificationService.notifyNearbyDrivers(testBooking);
    console.log(`✅ Notified ${driverCount} nearby drivers\n`);
  } catch (error) {
    console.log(`❌ Failed: ${error.message}\n`);
  }
  
  console.log('2. Testing status update notification...');
  try {
    await notificationService.sendStatusUpdate(testBooking, 'PENDING', 'ASSIGNED');
    console.log('✅ Status update notification sent\n');
  } catch (error) {
    console.log(`❌ Failed: ${error.message}\n`);
  }
  
  console.log('3. Testing driver assignment notification...');
  try {
    await notificationService.notifyPassengerDriverAssigned(testBooking, 'DRIVER001', 5);
    console.log('✅ Driver assignment notification sent\n');
  } catch (error) {
    console.log(`❌ Failed: ${error.message}\n`);
  }
  
  console.log('4. Testing payment notification...');
  try {
    await notificationService.sendPaymentNotification(testBooking, 'PAID');
    console.log('✅ Payment notification sent\n');
  } catch (error) {
    console.log(`❌ Failed: ${error.message}\n`);
  }
  
  console.log('🎉 Notification service test completed!');
  
  // Cleanup
  await notificationService.cleanup();
  process.exit(0);
}

testNotifications().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});