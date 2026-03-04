const amqp = require('amqplib');

const config = {
  url: process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672',
  queues: {
    rideCreated: 'ride.created',
    bookingRideFailed: 'booking.ride.failed', // Queue for Booking Service to listen to ride failures
    bookingPaymentFailed: 'booking.payment.failed', // Queue for Booking Service to listen to payment failures
    bookingDriverCancelled: 'booking.driver.cancelled', // Queue for driver cancellation rematching
  },
  exchanges: {
    bookingEvents: 'booking.events',
    rideEvents: 'ride.events',
    paymentEvents: 'payment.events',
  }
};

let channel = null;
let connection = null;
let _onReconnect = null; // callback to re-start consumers

const connect = async () => {
  try {
    connection = await amqp.connect(config.url);
    channel = await connection.createChannel();
    
    // Assert Exchanges
    await channel.assertExchange(config.exchanges.bookingEvents, 'topic', { durable: true });
    await channel.assertExchange(config.exchanges.rideEvents, 'topic', { durable: true });
    await channel.assertExchange(config.exchanges.paymentEvents, 'topic', { durable: true });

    console.log('[RabbitMQ] Connected to', config.url);

    // Re-start consumers if this is a reconnection
    if (_onReconnect) {
      console.log('[RabbitMQ] Reconnected — re-starting consumers...');
      try {
        await _onReconnect();
      } catch (err) {
        console.error('[RabbitMQ] Failed to re-start consumers on reconnect:', err);
      }
    }
    
    connection.on('close', () => {
      console.error('[RabbitMQ] Connection closed, retrying...');
      channel = null;
      setTimeout(connect, 5000);
    });
    
    connection.on('error', (err) => {
      console.error('[RabbitMQ] Connection error', err);
    });

  } catch (error) {
    console.error('[RabbitMQ] Connection failed', error);
    setTimeout(connect, 5000);
  }
};

const setOnReconnect = (callback) => {
  _onReconnect = callback;
};

const publish = async (exchange, routingKey, data) => {
  if (!channel) {
    console.error('[RabbitMQ] Channel not ready, cannot publish');
    return false;
  }
  
  try {
    const success = channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(data)),
      { persistent: true }
    );
    console.log(`[RabbitMQ] Published to ${exchange} -> ${routingKey}`);
    return success;
  } catch (error) {
    console.error('[RabbitMQ] Publish error', error);
    return false;
  }
};

const subscribe = async (exchange, routingKey, queue, handler) => {
  if (!channel) {
     console.error('[RabbitMQ] Channel not ready, cannot subscribe');
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
          console.error('[RabbitMQ] Error processing message:', error);
          // channel.nack(msg); // Optional: requeue or dead-letter
          channel.ack(msg); // Ack to prevent endless loops for now
        }
      }
    });
    console.log(`[RabbitMQ] Subscribed to ${queue}`);
  } catch (error) {
    console.error('[RabbitMQ] Subscribe error:', error);
  }
};

module.exports = {
  connect,
  publish,
  subscribe,
  setOnReconnect,
  config
};
