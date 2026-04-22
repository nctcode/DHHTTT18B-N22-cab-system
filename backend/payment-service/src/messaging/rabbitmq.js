const amqp = require('amqplib');
const config = {
  url: process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672',
  queues: {
    rideFinished: 'ride.finished',
    paymentProcess: 'payment.process'
  },
  exchanges: {
    rideEvents: 'ride.events',
    paymentEvents: 'payment.events',
    deadLetter: 'dlx.exchange',
  },
  maxRetries: 3,
};

let channel = null;
let connection = null;

const connect = async () => {
  let connected = false;
  while (!connected) {
    try {
      connection = await amqp.connect(config.url);
      channel = await connection.createChannel();
      
      await channel.assertExchange(config.exchanges.rideEvents, 'topic', { durable: true });
      await channel.assertExchange(config.exchanges.paymentEvents, 'topic', { durable: true });

      // Dead Letter Exchange + Queue
      await channel.assertExchange(config.exchanges.deadLetter, 'topic', { durable: true });
      await channel.assertQueue('dlq.all', { durable: true });
      await channel.bindQueue('dlq.all', config.exchanges.deadLetter, '#');
      
      console.log('[RabbitMQ Payment] Connected');
      console.log('[RabbitMQ Payment] Dead Letter Queue configured');
      connected = true;
      
      connection.on('close', () => {
         console.warn('[RabbitMQ Payment] Connection closed, restarting process...');
         setTimeout(() => process.exit(1), 5000);
      });
    } catch (error) {
      console.error('[RabbitMQ Payment] Connection Error:', error.message);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
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
        await handler(JSON.parse(msg.content.toString()));
        channel.ack(msg);
      } catch (err) {
        const deaths = msg.properties.headers?.['x-death'] || [];
        const retryCount = deaths.length > 0 ? deaths[0].count || 0 : 0;
        
        if (retryCount < config.maxRetries) {
          console.warn(`[RabbitMQ Payment] Processing failed (attempt ${retryCount + 1}/${config.maxRetries}), requeueing: ${queue}`, err.message);
          channel.nack(msg, false, true);
        } else {
          console.error(`[RabbitMQ Payment] ❌ Max retries reached for ${queue}. Sending to DLQ.`, err.message);
          channel.nack(msg, false, false);
        }
      }
    }
  });
  console.log(`[RabbitMQ Payment] Subscribed to ${queue} (with DLQ support)`);
};

const publish = async (exchange, key, data) => {
  if (!channel) return;
  channel.publish(exchange, key, Buffer.from(JSON.stringify(data)), { persistent: true });
};

module.exports = { connect, subscribe, publish, config };
