const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const services = require('../config/services.config');
const { verifyToken } = require('../middlewares/auth.middleware');
const { rideLimiter } = require('../middlewares/rate-limit.middleware');

const router = express.Router();
router.use(verifyToken);
router.post('/request', rideLimiter);

const rideProxy = createProxyMiddleware({
  target: services.ride.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/rides': '/rides',
  },
  onProxyReq: (proxyReq, req, res) => {
    if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  }
});

router.use('/', rideProxy);
module.exports = router;
