const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const services = require('../config/services.config');
const { verifyToken } = require('../middlewares/auth.middleware');

const router = express.Router();

// Apply authentication to all pricing routes
router.use(verifyToken);

// Proxy configuration for pricing service
const pricingProxy = createProxyMiddleware({
  target: services.pricing.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/pricing': '/api/pricing',
  },
  onProxyReq: (proxyReq, req, res) => {
    // Forward user info to pricing service
    if (req.user && req.user.id) {
      proxyReq.setHeader('X-User-Id', String(req.user.id));
      proxyReq.setHeader('X-User-Role', String(req.user.role || 'guest'));
    }
    console.log(`[Pricing Service] ${req.method} ${req.path} -> ${services.pricing.url}${req.path}`);
  },
  onError: (err, req, res) => {
    console.error('[Pricing Service] Proxy Error:', err);
    res.status(503).json({
      success: false,
      message: 'Pricing service unavailable',
      error: err.message,
    });
  },
});

// Route all pricing requests to pricing service
router.use('/', pricingProxy);

module.exports = router;
