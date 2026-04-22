const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const services = require('../config/services.config');
const { verifyToken } = require('../middlewares/auth.middleware');
const { circuitBreakerMiddleware } = require('../middlewares/circuitBreaker.middleware');

const router = express.Router();

// Apply authentication to all driver routes
router.use(verifyToken);

const driverProxy = createProxyMiddleware({
  target: services.driver.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/drivers': '/drivers', // Rewrite /api/drivers/* -> /drivers/*
  },
  timeout: 30000,
  proxyTimeout: 30000,
  onProxyReq: (proxyReq, req, res) => {
    // Middleware has already injected 'x-user-id' and 'x-user-role' into req.headers
    // and removed 'authorization'.
    // http-proxy-middleware forwards req.headers by default.

    if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onError: (err, req, res) => {
    console.error('[Driver Service] Proxy Error:', err.code);
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        success: false, 
        message: 'Driver service is unavailable' 
      });
    }
    if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
      return res.status(504).json({ 
        success: false, 
        message: 'Driver service request timeout' 
      });
    }
    res.status(503).json({ 
      success: false, 
      message: 'Driver service unavailable', 
      error: err.message 
    });
  },
});

router.use('/', circuitBreakerMiddleware('driver-service'), driverProxy);

module.exports = router;
