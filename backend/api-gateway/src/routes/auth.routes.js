const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const services = require('../config/services.config');
const { authLimiter } = require('../middlewares/rate-limit.middleware');
const { verifyToken } = require('../middlewares/auth.middleware');

const router = express.Router();

// Apply rate limiting to auth routes
router.use(authLimiter);

// 1. PUBLIC ROUTES (No Token Verification)
// /register, /login, /refresh, /logout
// Proxy middleware for public routes
const publicAuthProxy = createProxyMiddleware({
  target: services.auth.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/auth': '/auth',
  },
  onProxyReq: (proxyReq, req, res) => {
    // 1. For logout: preserve original access token before overwriting
    if (req.path === '/logout' || req.originalUrl.endsWith('/logout')) {
      const originalAuth = req.headers.authorization;
      if (originalAuth && originalAuth.startsWith('Bearer ')) {
        proxyReq.setHeader('x-access-token', originalAuth.substring(7));
      }
    }

    // 2. Handle Refresh Token Flow (Body -> Header mapping)
    // Auth Service expects Authorization: Bearer <refreshToken>
    // But Client sends { refreshToken: "..." } in body
    if (req.body && req.body.refreshToken) {
      proxyReq.setHeader('Authorization', `Bearer ${req.body.refreshToken}`);
    }

    // 3. Forward Request Body
    // bodyParser consumes the stream, so we must write it back
    if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onError: (err, req, res) => {
    console.error('[Auth Proxy Error]', err);
    res.status(500).json({ success: false, message: 'Auth service unavailable' });
  }
});

router.post('/register', publicAuthProxy);
router.post('/login', publicAuthProxy);
router.post('/refresh', publicAuthProxy); 
router.post('/logout', publicAuthProxy);

// 2. PROTECTED ROUTES (Require Valid Access Token)
// /me, /logout-all
router.use(verifyToken);

const protectedAuthProxy = createProxyMiddleware({
  target: services.auth.url,
  changeOrigin: true,
  pathRewrite: {
     '^/api/auth': '/auth',
  },
  onProxyReq: (proxyReq, req, res) => {
    // verifyToken middleware already sets x-user-id and x-user-role
    // http-proxy-middleware forwards these headers automatically
    
    // Also forward body if present
    if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  }
});

router.get('/me', protectedAuthProxy);
router.post('/logout-all', protectedAuthProxy);

module.exports = router;
