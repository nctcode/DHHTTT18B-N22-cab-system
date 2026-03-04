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
    '^/api/reviews': '/reviews',
  },
  timeout: 30000,
  proxyTimeout: 30000,
  onProxyReq: (proxyReq, req, res) => {
    // Forward user info to review service
    if (req.user && req.user.id) {
      proxyReq.setHeader('X-User-Id', String(req.user.id));
      proxyReq.setHeader('X-User-Role', String(req.user.role || 'guest'));
    }

    // Forward request body for POST/PUT/PATCH
    if (req.body && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
    
    console.log(`[Review Service] ${req.method} ${req.originalUrl} -> ${services.review.url}${req.path}`);
  },
  onError: (err, req, res) => {
    console.error('[Review Service] Proxy Error:', err.code);
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({ success: false, message: 'Review service is unavailable' });
    }
    if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
      return res.status(504).json({ success: false, message: 'Review service request timeout' });
    }
    res.status(503).json({ success: false, message: 'Review service unavailable', error: err.message });
  },
});

// Route all review requests to review service
router.use('/', reviewProxy);

module.exports = router;
