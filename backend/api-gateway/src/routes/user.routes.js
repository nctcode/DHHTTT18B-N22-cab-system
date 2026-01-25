const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const services = require('../config/services.config');
const { verifyToken } = require('../middlewares/auth.middleware');

const router = express.Router();

// Apply authentication to all user routes
router.use(verifyToken);

// Proxy configuration for user service
const userProxy = createProxyMiddleware({
  target: services.user.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/users': '/api/users',
  },
  onProxyReq: (proxyReq, req, res) => {
    // Forward user info to user service
    if (req.user && req.user.id) {
      proxyReq.setHeader('X-User-Id', String(req.user.id));
      proxyReq.setHeader('X-User-Role', String(req.user.role || 'guest'));
    }
    console.log(`[User Service] ${req.method} ${req.path} -> ${services.user.url}${req.path}`);
  },
  onError: (err, req, res) => {
    console.error('[User Service] Proxy Error:', err);
    res.status(503).json({
      success: false,
      message: 'User service unavailable',
      error: err.message,
    });
  },
});

// Route all user requests to user service
router.use('/', userProxy);

module.exports = router;
