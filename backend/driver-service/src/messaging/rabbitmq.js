// src/messaging/rabbitmq.js
const amqp = require('amqplib');

const config = {
  url: process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672',
  queues: {
    driverRideAssigned: 'driver.ride.assigned',
    driverLocationUpdate: 'driver.location.update',
    paymentSuccessDriver: 'driver.payment.success',
    driverRatingUpdate: 'driver.rating.update',
    driverPaymentCompleted: 'driver.payment.completed'
  },
  exchanges: {
    rideEvents: 'ride.events',
    driverEvents: 'driver.events',
    paymentEvents: 'payment.events',
    reviewEvents: 'review.events',
    deadLetter: 'dlx.exchange',
  },
  maxRetries: 3,
};

let channel = null;
let connection = null;
let _onReconnect = null;

const connect = async () => {
  try {
    connection = await amqp.connect(config.url);
    channel = await connection.createChannel();
    
    await channel.assertExchange(config.exchanges.rideEvents, 'topic', { durable: true });
    await channel.assertExchange(config.exchanges.driverEvents, 'topic', { durable: true });
    await channel.assertExchange(config.exchanges.paymentEvents, 'topic', { durable: true });
    await channel.assertExchange(config.exchanges.reviewEvents, 'topic', { durable: true });

    // Dead Letter Exchange + Queue
    await channel.assertExchange(config.exchanges.deadLetter, 'topic', { durable: true });
    await channel.assertQueue('dlq.all', { durable: true });
    await channel.bindQueue('dlq.all', config.exchanges.deadLetter, '#');

    console.log('[Driver Service RabbitMQ] Connected to', config.url);
    console.log('[Driver Service RabbitMQ] Dead Letter Queue configured');

    // Re-start consumers if this is a reconnection
    if (_onReconnect) {
      console.log('[Driver Service RabbitMQ] Reconnected — re-starting consumers...');
      try {
        await _onReconnect();
      } catch (err) {
        console.error('[Driver Service RabbitMQ] Failed to re-start consumers on reconnect:', err);
      }
    }
    
    connection.on('close', () => {
      console.error('[Driver Service RabbitMQ] Connection closed, retrying...');
      setTimeout(connect, 5000);
    });
    
    connection.on('error', (err) => {
      console.error('[Driver Service RabbitMQ] Connection error', err);
    });

  } catch (error) {
    console.error('[Driver Service RabbitMQ] Connection failed', error);
    setTimeout(connect, 5000);
  }
};

const publish = async (exchange, routingKey, data) => {
  if (!channel) {
    console.error('[Driver Service RabbitMQ] Channel not ready, cannot publish');
    return false;
  }
  
  try {
    const success = channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(data)),
      { persistent: true }
    );
    console.log(`[Driver Service RabbitMQ] Published to ${exchange} -> ${routingKey}`);
    return success;
  } catch (error) {
    console.error('[Driver Service RabbitMQ] Publish error', error);
    return false;
  }
};

const subscribe = async (exchange, routingKey, queue, handler) => {
  if (!channel) {
     console.error('[Driver Service RabbitMQ] Channel not ready, cannot subscribe');
     return;
  }

  try {
    await channel.assertQueue(queue, { 
      durable: true,
      arguments: {
        'x-dead-letter-exchange': config.exchanges.deadLetter,
        'x-dead-letter-routing-key': `dlq.${queue}`,
      }
    });
    await channel.bindQueue(queue, exchange, routingKey);
    
    channel.consume(queue, async (msg) => {
      if (msg !== null) {
        try {
          const content = JSON.parse(msg.content.toString());
          await handler(content);
          channel.ack(msg);
        } catch (error) {
          const deaths = msg.properties.headers?.['x-death'] || [];
          const retryCount = deaths.length > 0 ? deaths[0].count || 0 : 0;
          
          if (retryCount < config.maxRetries) {
            console.warn(`[Driver Service RabbitMQ] Processing failed (attempt ${retryCount + 1}/${config.maxRetries}), requeueing: ${queue}`, error.message);
            channel.nack(msg, false, true);
          } else {
            console.error(`[Driver Service RabbitMQ] ❌ Max retries reached for ${queue}. Sending to DLQ.`, error.message);
            channel.nack(msg, false, false);
          }
        }
      }
    });
    console.log(`[Driver Service RabbitMQ] Subscribed to ${queue} (with DLQ support)`);
  } catch (error) {
    console.error('[Driver Service RabbitMQ] Subscribe error:', error);
  }
};

const setOnReconnect = (callback) => {
  _onReconnect = callback;
};

module.exports = {
  connect,
  publish,
  subscribe,
  setOnReconnect,
  config
};
