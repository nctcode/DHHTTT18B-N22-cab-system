const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const services = require('../config/services.config');
const { verifyToken } = require('../middlewares/auth.middleware');
const { callPricingWithRetry } = require('../utils/pricingRetry');
const logger = require('../utils/logger');

const router = express.Router();
router.use(verifyToken);

/**
 * POST /api/pricing/estimate
 * Pricing estimate with retry + fallback support
 * 
 * If Pricing Service is down:
 *   - Retries up to 3 times with exponential backoff
 *   - Returns fallback response (price: null, isFallback: true)
 *   - Never crashes the gateway
 */
router.post('/estimate', async (req, res) => {
  try {
    const payload = req.body;
    logger.info('[Pricing Route] POST /estimate called', { payload });

    const result = await callPricingWithRetry(
      payload,
      services.pricing.url
    );

    if (result.isFallback) {
      // Return 200 with fallback data — not an error, just degraded
      return res.status(200).json({
        success: true,
        data: {
          price: null,
          isFallback: true,
          currency: 'VND',
          message: result.data.message,
        },
      });
    }

    // Normal success
    return res.status(200).json({
      success: true,
      data: {
        ...result.data,
        isFallback: false,
      },
    });

  } catch (error) {
    // This should never happen because callPricingWithRetry always returns fallback
    // But guard against unexpected errors
    logger.error('[Pricing Route] Unexpected error in /estimate', { error: error.message });
    return res.status(200).json({
      success: true,
      data: {
        price: null,
        isFallback: true,
        currency: 'VND',
        message: 'Pricing service unavailable, using fallback',
      },
    });
  }
});

// All other pricing routes still go through proxy
const pricingProxy = createProxyMiddleware({
  target: services.pricing.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/pricing': '/pricing',
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

router.use('/', pricingProxy);
module.exports = router;
