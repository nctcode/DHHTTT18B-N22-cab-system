// scripts/test-events.js
const eventService = require('../src/services/event.service');
const { connectRabbitMQ, getChannel } = require('../src/config/rabbitmq');
const logger = require('../src/utils/logger');

async function testEventSystem() {
  console.log('🎭 Testing Event System\n');
  console.log('='.repeat(60));

  try {
    // 1. Connect to RabbitMQ
    console.log('1. Connecting to RabbitMQ...');
    const channel = await connectRabbitMQ();
    console.log('✅ RabbitMQ connected successfully\n');

    // 2. Initialize event service
    console.log('2. Initializing event service...');
    await eventService.startConsumers(channel);
    console.log('✅ Event service initialized\n');

    // 3. Test publishing events
    console.log('3. Testing event publishing...');
    
    // Test booking created event
    const bookingCreatedEventId = await eventService.publishBookingEvent(
      'booking.created',
      {
        type: 'BOOKING_CREATED',
        bookingId: `TEST-${Date.now()}`,
        passengerId: 'TEST-PASSENGER-001',
        pickupLocation: {
          address: '123 Test Street',
          coordinates: { lat: 10.762622, lng: 106.660172 }
        },
        destination: {
          address: '456 Test Avenue',
          coordinates: { lat: 10.771952, lng: 106.700272 }
        },
        vehicleType: 'STANDARD'
      }
    );
    console.log(`✅ Booking created event published: ${bookingCreatedEventId}`);

    // Test driver assigned event
    const driverAssignedEventId = await eventService.publishBookingEvent(
      'booking.driver.assigned',
      {
        type: 'DRIVER_ASSIGNED',
        bookingId: `TEST-${Date.now()}`,
        driverId: 'TEST-DRIVER-001',
        eta: 5,
        timestamp: new Date().toISOString()
      }
    );
    console.log(`✅ Driver assigned event published: ${driverAssignedEventId}`);

    // Test payment completed event
    const paymentEventId = await eventService.publishBookingEvent(
      'payment.completed',
      {
        type: 'PAYMENT_COMPLETED',
        bookingId: `TEST-${Date.now()}`,
        amount: 50000,
        currency: 'VND',
        transactionId: `TXN-${Date.now()}`
      }
    );
    console.log(`✅ Payment completed event published: ${paymentEventId}`);

    // 4. Test consumer status
    console.log('\n4. Checking consumer status...');
    const consumerStatus = eventService.getConsumerStatus();
    console.log('📊 Consumer Status:');
    console.log(`   Total Consumers: ${consumerStatus.totalConsumers}`);
    console.log(`   Initialized: ${consumerStatus.isInitialized}`);
    consumerStatus.consumers.forEach((consumer, index) => {
      console.log(`   Consumer ${index + 1}: ${consumer.name} - ${consumer.status}`);
    });

    // 5. Test queue operations
    console.log('\n5. Testing queue operations...');
    
    // Create a test queue
    const testQueueName = `test.queue.${Date.now()}`;
    const queue = await eventService.createQueue(
      testQueueName,
      'booking.created'
    );
    console.log(`✅ Test queue created: ${testQueueName}`);

    // Get queue stats
    const queueStats = await eventService.getQueueStats(testQueueName);
    console.log('📈 Queue Statistics:');
    console.log(`   Message Count: ${queueStats?.messageCount || 0}`);
    console.log(`   Consumer Count: ${queueStats?.consumerCount || 0}`);

    // Purge queue
    await eventService.purgeQueue(testQueueName);
    console.log(`✅ Test queue purged`);

    // Delete queue
    await eventService.deleteQueue(testQueueName);
    console.log(`✅ Test queue deleted`);

    // 6. Test system events
    console.log('\n6. Testing system events...');
    await eventService.handleSystemEvent({
      type: 'CONSUMER_RESTART',
      data: { reason: 'Test restart' }
    });
    console.log('✅ System event handled');

    // 7. Test sending test event
    console.log('\n7. Sending test event...');
    const testEventId = await eventService.sendTestEvent('booking.created', {
      test: true,
      message: 'This is a test event'
    });
    console.log(`✅ Test event sent: ${testEventId}`);

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Event system test completed successfully!');
    console.log('='.repeat(60));

    // 8. Cleanup
    console.log('\nCleaning up...');
    await eventService.stopConsumers();
    console.log('✅ Event service stopped');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Event system test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run test
testEventSystem().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});