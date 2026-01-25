const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const services = require('../config/services.config');
const { verifyToken } = require('../middlewares/auth.middleware');
const { paymentLimiter } = require('../middlewares/rate-limit.middleware');

const router = express.Router();

// Apply authentication and rate limiting
router.use(verifyToken);
router.use(paymentLimiter);

// Proxy configuration for payment service
const paymentProxy = createProxyMiddleware({
  target: services.payment.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/payments': '/api/payments',
  },
  onProxyReq: (proxyReq, req, res) => {
    // Forward user info to payment service
    if (req.user && req.user.id) {
      proxyReq.setHeader('X-User-Id', String(req.user.id));
      proxyReq.setHeader('X-User-Role', String(req.user.role || 'guest'));
    }
    console.log(`[Payment Service] ${req.method} ${req.path} -> ${services.payment.url}${req.path}`);
  },
  onError: (err, req, res) => {
    console.error('[Payment Service] Proxy Error:', err);
    res.status(503).json({
      success: false,
      message: 'Payment service unavailable',
      error: err.message,
    });
  },
});

// Route all payment requests to payment service
router.use('/', paymentProxy);

module.exports = router;
