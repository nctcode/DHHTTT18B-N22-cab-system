const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');

router.post('/', routeController.getRoute);
router.get('/geocode/reverse', routeController.reverseGeocode);
router.get('/geocode/search', routeController.searchPlaces);

module.exports = router;
