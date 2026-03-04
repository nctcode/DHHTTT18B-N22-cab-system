const amqp = require('amqplib');

const config = {
  url: process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672',
  exchanges: {
    rideEvents: 'ride.events',
    paymentEvents: 'payment.events'
  },
  queues: {
    notificationPayment: 'notification.payment',
    notificationRide: 'notification.ride',
    notificationRideAssigned: 'notification.ride.assigned',
    notificationRideStatus: 'notification.ride.status'
  }
};

let channel = null;
let connection = null;

const connect = async () => {
  try {
    connection = await amqp.connect(config.url);
    channel = await connection.createChannel();
    
    // Assert Exchanges
    await channel.assertExchange(config.exchanges.rideEvents, 'topic', { durable: true });
    await channel.assertExchange(config.exchanges.paymentEvents, 'topic', { durable: true });
    
    console.log('[RabbitMQ Notification] Connected');
    
    connection.on('close', () => {
      console.error('[RabbitMQ Notification] Connection closed, retrying...');
      setTimeout(connect, 5000);
    });
  } catch (error) {
    console.error('[RabbitMQ Notification] Connection error', error);
    setTimeout(connect, 5000);
  }
};

const subscribe = async (exchange, key, queue, handler) => {
  if (!channel) return;
  
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, key);
  
  channel.consume(queue, async (msg) => {
    if (msg) {
      try {
        const data = JSON.parse(msg.content.toString());
        await handler(data);
        channel.ack(msg);
      } catch (error) {
        console.error('Error processing message:', error);
        // channel.nack(msg); // Depends on retry policy
        channel.ack(msg); // Ack to prevent loop for now
      }
    }
  });
};

module.exports = { connect, subscribe, config };
