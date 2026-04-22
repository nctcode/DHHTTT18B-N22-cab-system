const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const services = require('../config/services.config');
const { verifyToken } = require('../middlewares/auth.middleware');
const { circuitBreakerMiddleware } = require('../middlewares/circuitBreaker.middleware');

const router = express.Router();
router.use(verifyToken);

const paymentProxy = createProxyMiddleware({
  target: services.payment.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/payments': '/payments',
  },
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
