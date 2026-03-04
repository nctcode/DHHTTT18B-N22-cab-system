const app = require('./app');
const rabbitmq = require('./messaging/rabbitmq');
const { startConsumers } = require('./messaging/consumers');
const { startPublishers } = require('./messaging/publishers');
const eventBus = require('./events/eventBus');
const paymentSaga = require('./sagas/payment.saga');

const PORT = process.env.PORT || 3006;

async function start() {
  try {
    await rabbitmq.connect();
    console.log('✅ RabbitMQ connected');
    await startConsumers();
    startPublishers();

    app.listen(PORT, () => {
      console.log(`✅ Payment Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start service:', error);
    process.exit(1);
  }
}

start();
