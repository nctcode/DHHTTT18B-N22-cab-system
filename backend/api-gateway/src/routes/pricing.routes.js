const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const services = require('../config/services.config');
const { verifyToken } = require('../middlewares/auth.middleware');
const { callPricingWithRetry } = require('../utils/pricingRetry');
const logger = require('../utils/logger');

// MAX_DISTANCE must match pricing-service ENV (default 50 km)
const MAX_DISTANCE_KM = parseFloat(process.env.MAX_DISTANCE) || 50;

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

    // ── GATEWAY FAIL-FAST: Distance validation (before hitting pricing service) ──
    const distance_km = parseFloat(payload.distance_km);
    if (isNaN(distance_km) || distance_km <= 0) {
      logger.warn('[Pricing Route] INVALID_DISTANCE: distance_km is <= 0 or NaN', { distance_km: payload.distance_km });
      return res.status(400).json({
        error: 'INVALID_DISTANCE',
        message: `Distance must be between 0 and ${MAX_DISTANCE_KM} km`,
      });
    }
    if (distance_km > MAX_DISTANCE_KM) {
      logger.warn('[Pricing Route] OUTLIER_DISTANCE: exceeds MAX_DISTANCE', { distance_km, MAX_DISTANCE_KM });
      return res.status(400).json({
        error: 'INVALID_DISTANCE',
        message: `Distance must be between 0 and ${MAX_DISTANCE_KM} km`,
      });
    }

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
