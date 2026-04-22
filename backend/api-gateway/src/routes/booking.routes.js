const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const services = require('../config/services.config');
const { verifyToken } = require('../middlewares/auth.middleware');
const { circuitBreakerMiddleware } = require('../middlewares/circuitBreaker.middleware');

const router = express.Router();
router.use(verifyToken);

const bookingProxy = createProxyMiddleware({
  target: services.booking.url, 
  changeOrigin: true,
  pathRewrite: {
    '^/api/bookings': '/bookings', 
  },
  timeout: 30000,
  proxyTimeout: 30000,
  onProxyReq: (proxyReq, req, res) => {
    if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onError: (err, req, res) => {
    console.error('[Booking Service] Proxy Error:', err.code || err.message);
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        success: false, 
        message: 'Booking service is unavailable' 
      });
    }
    res.status(503).json({ 
      success: false, 
      message: 'Booking service unavailable', 
      error: err.message 
    });
  },
});

// Circuit Breaker runs BEFORE proxy — rejects requests if service is down
router.use('/', circuitBreakerMiddleware('booking-service'), bookingProxy);

module.exports = router;