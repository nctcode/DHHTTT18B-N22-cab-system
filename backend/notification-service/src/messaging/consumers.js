const messaging = require('./rabbitmq');
const Notification = require('../models/Notification');

const startConsumers = async () => {
  console.log('[Notification Service] Starting event consumers...');

  // Subscribe to Payment Success Event
  await messaging.subscribe(
    messaging.config.exchanges.paymentEvents,
    'payment.success',
    messaging.config.queues.notificationPayment,
    handlePaymentSuccess
  );

  // Subscribe to Ride Assigned Event
  await messaging.subscribe(
    messaging.config.exchanges.rideEvents,
    'ride.assigned',
    messaging.config.queues.notificationRideAssigned,
    handleRideAssigned
  );

  // Subscribe to Ride Status Changed Event
  await messaging.subscribe(
    messaging.config.exchanges.rideEvents,
    'ride.status.changed',
    messaging.config.queues.notificationRideStatus,
    handleRideStatusChanged
  );

  // Subscribe to Driver Assigned Acknowledgment
  await messaging.subscribe(
    'driver.events',
    'driver.assigned.ack',
    'notification.driver.assigned.ack',
    handleDriverAssignedAck
  );

  console.log('[Notification Service] All consumers started');
};

/**
 * Handle payment success event
 */
const handlePaymentSuccess = async (data) => {
  console.log('[Notification Service] Received payment.success:', data);
  
  try {
    // Create notification for User
    await Notification.create({
      userId: data.userId || data.ride_id || data.rideId,
      title: 'Thanh toán thành công',
      message: `Thanh toán ${data.amount} VND (${data.method}) thành công.`,
      type: 'PAYMENT_SUCCESS'
    });
    console.log('✅ Notification created for payment:', data.id);
  } catch (error) {
    console.error('[Notification Service] Error creating payment notification:', error);
  }
};

/**
 * Handle ride assigned event
 */
const handleRideAssigned = async (data) => {
  console.log('[Notification Service] Received ride.assigned:', data);
  
  try {
    const { driverId, bookingId, rideId, userId } = data;

    // Notify Driver
    if (driverId) {
      await Notification.create({
        userId: driverId,
        title: 'Chuyến đi mới',
        message: `Bạn được phân công chuyến đi #${rideId || bookingId}`,
        type: 'RIDE_ASSIGNED',
        metadata: JSON.stringify({ rideId: rideId || bookingId, bookingId })
      });
      console.log(`✅ Driver notification created for driver ${driverId}`);
    }

    // Notify Customer
    if (userId) {
      await Notification.create({
        userId: userId,
        title: 'Tìm thấy tài xế',
        message: `Tài xế đã được phân công cho chuyến đi của bạn`,
        type: 'DRIVER_FOUND',
        metadata: JSON.stringify({ rideId: rideId || bookingId, driverId })
      });
      console.log(`✅ Customer notification created for user ${userId}`);
    }
  } catch (error) {
    console.error('[Notification Service] Error creating ride assigned notification:', error);
  }
};

/**
 * Handle ride status changed event
 */
const handleRideStatusChanged = async (data) => {
  console.log('[Notification Service] Received ride.status.changed:', data);
  
  try {
    const { rideId, status, userId, driverId } = data;

    const statusMessages = {
      'ACCEPTED': 'Tài xế đã chấp nhận chuyến đi',
      'PICKED_UP': 'Tài xế đã đón bạn',
      'IN_PROGRESS': 'Chuyến đi đang diễn ra',
      'COMPLETED': 'Chuyến đi đã hoàn thành',
      'CANCELLED': 'Chuyến đi đã bị hủy'
    };

    const message = statusMessages[status] || `Trạng thái chuyến đi: ${status}`;

    // Notify Customer
    if (userId) {
      await Notification.create({
        userId: userId,
        title: 'Cập nhật chuyến đi',
        message: message,
        type: 'RIDE_STATUS_UPDATE',
        metadata: JSON.stringify({ rideId, status })
      });
    }

    // Notify Driver
    if (driverId && status === 'COMPLETED') {
      await Notification.create({
        userId: driverId,
        title: 'Chuyến đi hoàn thành',
        message: `Chuyến đi #${rideId} đã hoàn thành`,
        type: 'RIDE_COMPLETED',
        metadata: JSON.stringify({ rideId, status })
      });
    }

    console.log(`✅ Status change notifications created for ride ${rideId}`);
  } catch (error) {
    console.error('[Notification Service] Error creating status change notification:', error);
  }
};

/**
 * Handle driver assigned acknowledgment
 */
const handleDriverAssignedAck = async (data) => {
  console.log('[Notification Service] Received driver.assigned.ack:', data);
  
  try {
    const { driverId, rideId, bookingId } = data;

    // Could create additional notification or update existing one
    console.log(`✅ Driver ${driverId} acknowledged assignment for ride ${rideId || bookingId}`);
  } catch (error) {
    console.error('[Notification Service] Error handling driver ack:', error);
  }
};

module.exports = { startConsumers };

