const amqp = require('amqplib');

const config = {
  url: process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672',
  exchanges: {
    rideEvents: 'ride.events',
    reviewEvents: 'review.events'
  },
  queues: {
    reviewRideCompleted: 'review.ride.completed'
  }
};

let channel = null;
let connection = null;

const connect = async () => {
  try {
    connection = await amqp.connect(config.url);
    channel = await connection.createChannel();
    
    // Assert Exchanges
    await channel.assertExchange(config.exchanges.reviewEvents, 'topic', { durable: true });

    console.log('[Review Service RabbitMQ] Connected to', config.url);
    
    connection.on('close', () => {
      console.error('[Review Service RabbitMQ] Connection closed, retrying...');
      setTimeout(connect, 5000);
    });
    
    connection.on('error', (err) => {
      console.error('[Review Service RabbitMQ] Connection error', err);
    });

  } catch (error) {
    console.error('[Review Service RabbitMQ] Connection failed', error);
    setTimeout(connect, 5000);
  }
};

const publish = async (exchange, routingKey, data) => {
  if (!channel) {
    console.error('[Review Service RabbitMQ] Channel not ready, cannot publish');
    return false;
  }
  
  try {
    const success = channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(data)),
      { persistent: true }
    );
    console.log(`[Review Service RabbitMQ] Published to ${exchange} -> ${routingKey}`);
    return success;
  } catch (error) {
    console.error('[Review Service RabbitMQ] Publish error', error);
    return false;
  }
};

const subscribe = async (exchange, routingKey, queue, handler) => {
  if (!channel) {
     console.error('[Review Service RabbitMQ] Channel not ready, cannot subscribe');
     return;
  }

  try {
    await channel.assertQueue(queue, { durable: true });
    await channel.bindQueue(queue, exchange, routingKey);
    
    channel.consume(queue, async (msg) => {
      if (msg !== null) {
        try {
          const content = JSON.parse(msg.content.toString());
          await handler(content);
          channel.ack(msg);
        } catch (error) {
          console.error('[Review Service RabbitMQ] Error processing message:', error);
          channel.ack(msg); // Ack to prevent endless loops
        }
      }
    });
    console.log(`[Review Service RabbitMQ] Subscribed to ${queue}`);
  } catch (error) {
    console.error('[Review Service RabbitMQ] Subscribe error:', error);
  }
};

module.exports = {
  connect,
  publish,
  subscribe,
  config
};
