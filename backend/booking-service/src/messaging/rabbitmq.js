const amqp = require('amqplib');

const config = {
  url: process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672',
  queues: {
    rideCreated: 'ride.created',
    bookingRideFailed: 'booking.ride.failed',
    bookingPaymentFailed: 'booking.payment.failed',
    bookingDriverCancelled: 'booking.driver.cancelled',
  },
  exchanges: {
    bookingEvents: 'booking.events',
    rideEvents: 'ride.events',
    paymentEvents: 'payment.events',
    deadLetter: 'dlx.exchange',    // Dead Letter Exchange
  },
  maxRetries: 3,  // Max retries before sending to DLQ
};

let channel = null;
let connection = null;
let _onReconnect = null;

const connect = async () => {
  try {
    connection = await amqp.connect(config.url);
    channel = await connection.createChannel();
    
    // Assert main Exchanges
    await channel.assertExchange(config.exchanges.bookingEvents, 'topic', { durable: true });
    await channel.assertExchange(config.exchanges.rideEvents, 'topic', { durable: true });
    await channel.assertExchange(config.exchanges.paymentEvents, 'topic', { durable: true });

    // Assert Dead Letter Exchange
    await channel.assertExchange(config.exchanges.deadLetter, 'topic', { durable: true });

    // Assert Dead Letter Queue (catches all failed messages)
    await channel.assertQueue('dlq.all', { durable: true });
    await channel.bindQueue('dlq.all', config.exchanges.deadLetter, '#');

    console.log('[RabbitMQ] Connected to', config.url);
    console.log('[RabbitMQ] Dead Letter Queue (dlq.all) configured');

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

/**
 * Publish with retry — retries up to 3 times if channel is not ready
 */
const publishWithRetry = async (exchange, routingKey, data, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const result = await publish(exchange, routingKey, data);
    if (result !== false) return result;
    
    console.warn(`[RabbitMQ] Publish attempt ${attempt}/${retries} failed, retrying in ${attempt * 1000}ms...`);
    await new Promise(resolve => setTimeout(resolve, attempt * 1000));
  }
  console.error(`[RabbitMQ] Publish failed after ${retries} attempts: ${exchange} -> ${routingKey}`);
  return false;
};

/**
 * Subscribe with Dead Letter Queue support.
 * Failed messages are retried up to maxRetries times, then routed to DLQ.
 */
const subscribe = async (exchange, routingKey, queue, handler) => {
  if (!channel) {
     console.error('[RabbitMQ] Channel not ready, cannot subscribe');
     return;
  }

  try {
    // Assert queue WITH dead-letter configuration
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
          // Count retries via x-death header
          const deaths = msg.properties.headers?.['x-death'] || [];
          const retryCount = deaths.length > 0 ? deaths[0].count || 0 : 0;
          
          if (retryCount < config.maxRetries) {
            console.warn(`[RabbitMQ] Processing failed (attempt ${retryCount + 1}/${config.maxRetries}), requeueing: ${queue}`, error.message);
            // nack with requeue=true for retry
            channel.nack(msg, false, true);
          } else {
            console.error(`[RabbitMQ] ❌ Max retries reached for ${queue}. Sending to DLQ.`, error.message);
            // nack with requeue=false → routes to Dead Letter Exchange
            channel.nack(msg, false, false);
          }
        }
      }
    });
    console.log(`[RabbitMQ] Subscribed to ${queue} (with DLQ support)`);
  } catch (error) {
    console.error('[RabbitMQ] Subscribe error:', error);
  }
};

module.exports = {
  connect,
  publish,
  publishWithRetry,
  subscribe,
  setOnReconnect,
  config
};

