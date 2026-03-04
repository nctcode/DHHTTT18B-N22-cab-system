const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const router = express.Router();

const AI_MATCHING_URL = process.env.AI_MATCHING_URL || 'http://localhost:4001';
const AI_ETA_URL = process.env.AI_ETA_URL || 'http://localhost:4002';
const AI_SURGE_URL = process.env.AI_SURGE_URL || 'http://localhost:4003';
const FEATURE_STORE_URL = process.env.FEATURE_STORE_URL || 'http://localhost:4020';
const MODEL_SERVING_URL = process.env.MODEL_SERVING_URL || 'http://localhost:4010';
const ML_TRAINING_URL = process.env.ML_TRAINING_URL || 'http://localhost:4030';

// AI Matching
router.use('/matching', createProxyMiddleware({
  target: AI_MATCHING_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/ai/matching': '/ai/matching' },
}));

// AI ETA
router.use('/eta', createProxyMiddleware({
  target: AI_ETA_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/ai/eta': '/ai/eta' },
}));

// AI Surge
router.use('/surge', createProxyMiddleware({
  target: AI_SURGE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/ai/surge': '/ai/surge' },
}));

// Feature Store
router.use('/features', createProxyMiddleware({
  target: FEATURE_STORE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/ai/features': '/features' },
}));

// Model Serving
router.use('/models', createProxyMiddleware({
  target: MODEL_SERVING_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/ai/models': '' },
}));

// ML Training
router.use('/training', createProxyMiddleware({
  target: ML_TRAINING_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/ai/training': '/training' },
}));

module.exports = router;
