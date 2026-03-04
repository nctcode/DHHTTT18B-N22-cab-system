const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/featureController');

router.get('/driver/:driverId', ctrl.getDriverFeatures);
router.put('/driver/:driverId', ctrl.updateDriverFeatures);
router.get('/zone/:zoneId', ctrl.getZoneFeatures);
router.put('/zone/:zoneId', ctrl.updateZoneFeatures);
router.post('/zone/:zoneId/demand', ctrl.incrementDemand);
router.post('/zone/:zoneId/supply', ctrl.incrementSupply);
router.get('/trip-context', ctrl.getTripContext);
router.get('/vehicle-config', ctrl.getVehicleConfig);

module.exports = router;
