const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/pricingController');

// Fare estimate (GET with query params or POST with body)
router.get('/estimate', ctrl.estimate);
router.post('/estimate', ctrl.estimate);

// Surge zones
router.get('/surge', ctrl.getSurgeZones);
router.get('/surge/snapshot/:zoneId', ctrl.getSurgeSnapshot);

// Pricing rules
router.get('/rules', ctrl.getRules);

// Metrics ingestion (from Ride Service, etc.)
router.post('/metrics/demand', ctrl.pushDemand);
router.post('/metrics/supply', ctrl.pushSupply);

module.exports = router;