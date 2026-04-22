const amqp = require('amqplib');

const config = {
  url: process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672',
  exchanges: {
    rideEvents: 'ride.events',
    reviewEvents: 'review.events',
    deadLetter: 'dlx.exchange',
  },
  queues: {
    reviewRideCompleted: 'review.ride.completed'
  },
  maxRetries: 3,
};

let channel = null;
let connection = null;

const connect = async () => {
  try {
    connection = await amqp.connect(config.url);
    channel = await connection.createChannel();
    
    await channel.assertExchange(config.exchanges.reviewEvents, 'topic', { durable: true });

    // Dead Letter Exchange + Queue
    await channel.assertExchange(config.exchanges.deadLetter, 'topic', { durable: true });
    await channel.assertQueue('dlq.all', { durable: true });
    await channel.bindQueue('dlq.all', config.exchanges.deadLetter, '#');

    console.log('[Review Service RabbitMQ] Connected to', config.url);
    console.log('[Review Service RabbitMQ] Dead Letter Queue configured');
    
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
            console.warn(`[Review Service RabbitMQ] Processing failed (attempt ${retryCount + 1}/${config.maxRetries}), requeueing: ${queue}`, error.message);
            channel.nack(msg, false, true);
          } else {
            console.error(`[Review Service RabbitMQ] ❌ Max retries reached for ${queue}. Sending to DLQ.`, error.message);
            channel.nack(msg, false, false);
          }
        }
      }
    });
    console.log(`[Review Service RabbitMQ] Subscribed to ${queue} (with DLQ support)`);
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
