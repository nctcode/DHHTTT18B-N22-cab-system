const amqp = require('amqplib');
const config = {
  url: process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672',
  queues: {
    rideFinished: 'ride.finished',
    paymentProcess: 'payment.process'
  },
  exchanges: {
    rideEvents: 'ride.events',
    paymentEvents: 'payment.events'
  }
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
      
      console.log('[RabbitMQ Payment] Connected');
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
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, key);
  channel.consume(queue, async (msg) => {
    if (msg) {
        await handler(JSON.parse(msg.content.toString()));
        channel.ack(msg);
    }
  });
};

const publish = async (exchange, key, data) => {
  if (!channel) return;
  channel.publish(exchange, key, Buffer.from(JSON.stringify(data)), { persistent: true });
};

module.exports = { connect, subscribe, publish, config };
