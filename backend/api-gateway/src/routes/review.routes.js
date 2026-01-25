const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const services = require('../config/services.config');
const { verifyToken } = require('../middlewares/auth.middleware');

const router = express.Router();

// Apply authentication to all review routes
router.use(verifyToken);

// Proxy configuration for review service
const reviewProxy = createProxyMiddleware({
  target: services.review.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/reviews': '/api/reviews',
  },
  onProxyReq: (proxyReq, req, res) => {
    // Forward user info to review service
    if (req.user && req.user.id) {
      proxyReq.setHeader('X-User-Id', String(req.user.id));
      proxyReq.setHeader('X-User-Role', String(req.user.role || 'guest'));
    }
    console.log(`[Review Service] ${req.method} ${req.path} -> ${services.review.url}${req.path}`);
  },
  onError: (err, req, res) => {
    console.error('[Review Service] Proxy Error:', err);
    res.status(503).json({
      success: false,
      message: 'Review service unavailable',
      error: err.message,
    });
  },
});

// Route all review requests to review service
router.use('/', reviewProxy);

module.exports = router;
