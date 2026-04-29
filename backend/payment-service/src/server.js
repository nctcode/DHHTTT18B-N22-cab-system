const app = require('./app');
const rabbitmq = require('./messaging/rabbitmq');
const { startConsumers } = require('./messaging/consumers');
const { startPublishers } = require('./messaging/publishers');
const eventBus = require('./events/eventBus');
const paymentSaga = require('./sagas/payment.saga');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3006;
const MTLS_PORT = process.env.MTLS_PORT || 3016;

async function start() {
  try {
    await rabbitmq.connect();
    console.log('✅ RabbitMQ connected');
    await startConsumers();
    startPublishers();

    // HTTP server (backward compatibility)
    app.listen(PORT, () => {
      console.log(`✅ Payment Service (HTTP) running on port ${PORT}`);
    });

    // mTLS HTTPS server (secure service-to-service communication)
    const certsDir = path.join(__dirname, '..', 'certs');
    const caCertPath = path.join(certsDir, 'ca.crt');
    const serverCertPath = path.join(certsDir, 'server.crt');
    const serverKeyPath = path.join(certsDir, 'server.key');

    if (fs.existsSync(caCertPath) && fs.existsSync(serverCertPath) && fs.existsSync(serverKeyPath)) {
      const mtlsOptions = {
        key: fs.readFileSync(serverKeyPath),
        cert: fs.readFileSync(serverCertPath),
        ca: fs.readFileSync(caCertPath),
        requestCert: true,        // Yêu cầu Client gửi certificate (mTLS)
        rejectUnauthorized: true  // Từ chối nếu Client không có certificate hợp lệ
      };

      const mtlsServer = https.createServer(mtlsOptions, app);
      mtlsServer.listen(MTLS_PORT, () => {
        console.log(`🔒 Payment Service (mTLS HTTPS) running on port ${MTLS_PORT}`);
        console.log(`   → Chỉ chấp nhận request có Client Certificate hợp lệ`);
      });
    } else {
      console.log('⚠️  mTLS certificates not found, skipping mTLS server');
    }
  } catch (error) {
    console.error('Failed to start service:', error);
    process.exit(1);
  }
}

start();
