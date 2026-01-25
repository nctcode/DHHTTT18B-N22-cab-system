const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const services = require('../config/services.config');
const { verifyToken } = require('../middlewares/auth.middleware');
const { rideLimiter } = require('../middlewares/rate-limit.middleware');

const router = express.Router();

// Apply authentication
router.use(verifyToken);

// Apply rate limiting only to ride request endpoint
router.post('/request', rideLimiter);

// Proxy configuration for ride service
const rideProxy = createProxyMiddleware({
  target: services.ride.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/rides': '/api/rides',
  },
  onProxyReq: (proxyReq, req, res) => {
    // Forward user info to ride service
    if (req.user && req.user.id) {
      proxyReq.setHeader('X-User-Id', String(req.user.id));
      proxyReq.setHeader('X-User-Role', String(req.user.role || 'guest'));
    }
    console.log(`[Ride Service] ${req.method} ${req.path} -> ${services.ride.url}${req.path}`);
  },
  onError: (err, req, res) => {
    console.error('[Ride Service] Proxy Error:', err);
    res.status(503).json({
      success: false,
      message: 'Ride service unavailable',
      error: err.message,
    });
  },
});

// Route all ride requests to ride service
router.use('/', rideProxy);

module.exports = router;
