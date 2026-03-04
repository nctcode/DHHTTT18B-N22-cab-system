const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/matchingController');

router.post('/best-driver', ctrl.findBestDriver);

module.exports = router;
