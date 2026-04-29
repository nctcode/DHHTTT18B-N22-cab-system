const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const services = require('../config/services.config');
const { verifyToken } = require('../middlewares/auth.middleware');
const { circuitBreakerMiddleware } = require('../middlewares/circuitBreaker.middleware');
const https = require('https');
const fs = require('fs');
const path = require('path');

const router = express.Router();
router.use(verifyToken);

// ── mTLS Agent Setup ──
// Load client certificates for mTLS communication with Payment Service
let mtlsAgent = null;
const certsDir = path.join(__dirname, '..', '..', 'certs');
const caCertPath = path.join(certsDir, 'ca.crt');
const clientCertPath = path.join(certsDir, 'client.crt');
const clientKeyPath = path.join(certsDir, 'client.key');

if (fs.existsSync(caCertPath) && fs.existsSync(clientCertPath) && fs.existsSync(clientKeyPath)) {
  mtlsAgent = new https.Agent({
    ca: fs.readFileSync(caCertPath),
    cert: fs.readFileSync(clientCertPath),
    key: fs.readFileSync(clientKeyPath),
    rejectUnauthorized: true
  });
  console.log('[mTLS] ✅ Client certificates loaded for Payment Service');
} else {
  console.log('[mTLS] ⚠️  Certificates not found, falling back to HTTP');
}

// Determine target: use mTLS (HTTPS port 3016) if certs available, otherwise HTTP
const paymentTarget = mtlsAgent
  ? (process.env.PAYMENT_SERVICE_MTLS_URL || 'https://payment-service:3016')
  : (services.payment.url);

const paymentProxy = createProxyMiddleware({
  target: paymentTarget,
  changeOrigin: true,
  secure: false, // We handle TLS verification via the agent
  pathRewrite: {
    '^/api/payments': '/payments',
  },
  ...(mtlsAgent && { agent: mtlsAgent }), // Attach mTLS agent if available
  onProxyReq: (proxyReq, req, res) => {
    if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  }
});

router.use('/', circuitBreakerMiddleware('payment-service', { timeout: 15000 }), paymentProxy);
module.exports = router;
