const amqp = require('amqplib');
const config = {
  url: process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672',
  queues: {
    rideCreated: 'ride.created',
    rideAssigned: 'ride.assigned',
  },
  exchanges: {
    bookingEvents: 'booking.events',
    rideEvents: 'ride.events',
    paymentEvents: 'payment.events',
    reviewEvents: 'review.events',
    deadLetter: 'dlx.exchange',
  },
  maxRetries: 3,
};

let channel = null;
let connection = null;

const connect = async () => {
  try {
    connection = await amqp.connect(config.url);
    channel = await connection.createChannel();
    
    await channel.assertExchange(config.exchanges.bookingEvents, 'topic', { durable: true });
    await channel.assertExchange(config.exchanges.rideEvents, 'topic', { durable: true });
    await channel.assertExchange(config.exchanges.paymentEvents, 'topic', { durable: true });
    await channel.assertExchange(config.exchanges.reviewEvents, 'topic', { durable: true });

    // Dead Letter Exchange + Queue
    await channel.assertExchange(config.exchanges.deadLetter, 'topic', { durable: true });
    await channel.assertQueue('dlq.all', { durable: true });
    await channel.bindQueue('dlq.all', config.exchanges.deadLetter, '#');
    
    console.log('[RabbitMQ Ride] Connected to', config.url);
    console.log('[RabbitMQ Ride] Dead Letter Queue configured');
    
    connection.on('close', () => {
      console.error('[RabbitMQ Ride] Connection closed, retrying...');
      setTimeout(connect, 5000);
    });

  } catch (error) {
    console.error('[RabbitMQ Ride] Connection failed', error);
    setTimeout(connect, 5000);
  }
};

const subscribe = async (exchange, routingKey, queue, handler) => {
  if (!channel) return;
  
  await channel.assertQueue(queue, { 
    durable: true,
    arguments: {
      'x-dead-letter-exchange': config.exchanges.deadLetter,
      'x-dead-letter-routing-key': `dlq.${queue}`,
    }
  });
  await channel.bindQueue(queue, exchange, routingKey);
  
  channel.consume(queue, async (msg) => {
    if (msg) {
      try {
        const data = JSON.parse(msg.content.toString());
        console.log(`[RabbitMQ Ride] Received from ${queue}:`, data.eventId);
        await handler(data);
        channel.ack(msg);
      } catch (err) {
        const deaths = msg.properties.headers?.['x-death'] || [];
        const retryCount = deaths.length > 0 ? deaths[0].count || 0 : 0;
        
        if (retryCount < config.maxRetries) {
          console.warn(`[RabbitMQ Ride] Processing failed (attempt ${retryCount + 1}/${config.maxRetries}), requeueing: ${queue}`, err.message);
          channel.nack(msg, false, true);
        } else {
          console.error(`[RabbitMQ Ride] ❌ Max retries reached for ${queue}. Sending to DLQ.`, err.message);
          channel.nack(msg, false, false);
        }
      }
    }
  });
  console.log(`[RabbitMQ Ride] Subscribed to ${queue} (with DLQ support)`);
};

const publish = async (exchange, routingKey, data) => {
  if (!channel) return false;
  try {
    return channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(data)),
      { persistent: true }
    );
  } catch (err) {
    console.error('[RabbitMQ Ride] Publish error:', err);
    return false;
  }
};

module.exports = {
  connect,
  subscribe,
  publish,
  config
};
