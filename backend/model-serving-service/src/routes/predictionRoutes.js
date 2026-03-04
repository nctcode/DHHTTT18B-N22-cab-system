const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/predictionController');

router.post('/predict/matching', ctrl.predictMatching);
router.post('/predict/eta', ctrl.predictETA);
router.post('/predict/surge', ctrl.predictSurge);
router.get('/models', ctrl.listModels);
router.post('/models/reload', ctrl.reloadModels);

module.exports = router;
