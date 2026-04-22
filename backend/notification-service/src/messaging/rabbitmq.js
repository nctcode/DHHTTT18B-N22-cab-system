const amqp = require('amqplib');

const config = {
  url: process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672',
  exchanges: {
    rideEvents: 'ride.events',
    paymentEvents: 'payment.events',
    deadLetter: 'dlx.exchange',
  },
  queues: {
    notificationPayment: 'notification.payment',
    notificationRide: 'notification.ride',
    notificationRideAssigned: 'notification.ride.assigned',
    notificationRideStatus: 'notification.ride.status'
  },
  maxRetries: 3,
};

let channel = null;
let connection = null;

const connect = async () => {
  try {
    connection = await amqp.connect(config.url);
    channel = await connection.createChannel();
    
    await channel.assertExchange(config.exchanges.rideEvents, 'topic', { durable: true });
    await channel.assertExchange(config.exchanges.paymentEvents, 'topic', { durable: true });

    // Dead Letter Exchange + Queue
    await channel.assertExchange(config.exchanges.deadLetter, 'topic', { durable: true });
    await channel.assertQueue('dlq.all', { durable: true });
    await channel.bindQueue('dlq.all', config.exchanges.deadLetter, '#');
    
    console.log('[RabbitMQ Notification] Connected');
    console.log('[RabbitMQ Notification] Dead Letter Queue configured');
    
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
  
  await channel.assertQueue(queue, { 
    durable: true,
    arguments: {
      'x-dead-letter-exchange': config.exchanges.deadLetter,
      'x-dead-letter-routing-key': `dlq.${queue}`,
    }
  });
  await channel.bindQueue(queue, exchange, key);
  
  channel.consume(queue, async (msg) => {
    if (msg) {
      try {
        const data = JSON.parse(msg.content.toString());
        await handler(data);
        channel.ack(msg);
      } catch (error) {
        const deaths = msg.properties.headers?.['x-death'] || [];
        const retryCount = deaths.length > 0 ? deaths[0].count || 0 : 0;
        
        if (retryCount < config.maxRetries) {
          console.warn(`[RabbitMQ Notification] Processing failed (attempt ${retryCount + 1}/${config.maxRetries}), requeueing: ${queue}`, error.message);
          channel.nack(msg, false, true);
        } else {
          console.error(`[RabbitMQ Notification] ❌ Max retries reached for ${queue}. Sending to DLQ.`, error.message);
          channel.nack(msg, false, false);
        }
      }
    }
  });
  console.log(`[RabbitMQ Notification] Subscribed to ${queue} (with DLQ support)`);
};

module.exports = { connect, subscribe, config };
