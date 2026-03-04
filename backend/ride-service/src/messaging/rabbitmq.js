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
  }
};

let channel = null;
let connection = null;

const connect = async () => {
  try {
    connection = await amqp.connect(config.url);
    channel = await connection.createChannel();
    
    // Assert Exchanges
    await channel.assertExchange(config.exchanges.bookingEvents, 'topic', { durable: true });
    await channel.assertExchange(config.exchanges.rideEvents, 'topic', { durable: true });
    
    console.log('[RabbitMQ] Connected to', config.url);
    
    connection.on('close', () => {
      console.error('[RabbitMQ] Connection closed, retrying...');
      setTimeout(connect, 5000);
    });

  } catch (error) {
    console.error('[RabbitMQ] Connection failed', error);
    setTimeout(connect, 5000);
  }
};

const subscribe = async (exchange, routingKey, queue, handler) => {
  if (!channel) return;
  
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, routingKey);
  
  channel.consume(queue, async (msg) => {
    if (msg) {
      try {
        const data = JSON.parse(msg.content.toString());
        console.log(`[RabbitMQ] Received from ${queue}:`, data.eventId);
        await handler(data);
        channel.ack(msg);
      } catch (err) {
        console.error('Error processing message:', err);
        // channel.nack(msg); // Be careful with nack loops
      }
    }
  });
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
    console.error('Publish error:', err);
    return false;
  }
};

module.exports = {
  connect,
  subscribe,
  publish,
  config
};
