const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const services = require('../config/services.config');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

const router = express.Router();

// Public route for nearby drivers
router.get('/nearby', verifyToken);

// Protected routes - require authentication
router.use(verifyToken);

// Admin or driver only routes
router.post('/', checkRole('admin'));
router.put('/:id', checkRole('admin', 'driver'));
router.delete('/:id', checkRole('admin'));

// Proxy configuration for driver service
const driverProxy = createProxyMiddleware({
  target: services.driver.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/drivers': '/api/drivers',
  },
  onProxyReq: (proxyReq, req, res) => {
    // Forward user info to driver service
    if (req.user && req.user.id) {
      proxyReq.setHeader('X-User-Id', String(req.user.id));
      proxyReq.setHeader('X-User-Role', String(req.user.role || 'guest'));
    }
    console.log(`[Driver Service] ${req.method} ${req.path} -> ${services.driver.url}${req.path}`);
  },
  onError: (err, req, res) => {
    console.error('[Driver Service] Proxy Error:', err);
    res.status(503).json({
      success: false,
      message: 'Driver service unavailable',
      error: err.message,
    });
  },
});

// Route all driver requests to driver service
router.use('/', driverProxy);

module.exports = router;
