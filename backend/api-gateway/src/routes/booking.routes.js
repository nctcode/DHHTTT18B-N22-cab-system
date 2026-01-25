const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const services = require('../config/services.config');
const { verifyToken } = require('../middlewares/auth.middleware');

const router = express.Router();

// Apply authentication to all booking routes
router.use(verifyToken);

// Proxy configuration for booking service
const bookingProxy = createProxyMiddleware({
  target: services.booking.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/bookings': '/api/bookings',
  },
  onProxyReq: (proxyReq, req, res) => {
    // Forward user info to booking service
    if (req.user && req.user.id) {
      proxyReq.setHeader('X-User-Id', String(req.user.id));
      proxyReq.setHeader('X-User-Role', String(req.user.role || 'guest'));
    }
    console.log(`[Booking Service] ${req.method} ${req.path} -> ${services.booking.url}${req.path}`);
  },
  onError: (err, req, res) => {
    console.error('[Booking Service] Proxy Error:', err);
    res.status(503).json({
      success: false,
      message: 'Booking service unavailable',
      error: err.message,
    });
  },
});

// Route all booking requests to booking service
router.use('/', bookingProxy);

module.exports = router;
