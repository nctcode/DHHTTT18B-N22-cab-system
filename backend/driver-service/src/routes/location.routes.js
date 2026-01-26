const express = require('express');
const router = express.Router();
const locationController = require('../controllers/location.controller');
const { validateLocation, validateCoordinates } = require('../middleware/validation');

// POST /locations/update - Cập nhật vị trí tài xế
router.post('/update', validateLocation, locationController.updateLocation);

// GET /locations/nearby - Tìm tài xế gần vị trí
router.get('/nearby', validateCoordinates, locationController.getNearbyDrivers);

// GET /locations/:driverId - Lấy vị trí hiện tại của tài xế
router.get('/:driverId', locationController.getLocation);

// GET /locations/:driverId/history - Lấy lịch sử vị trí
router.get('/:driverId/history', locationController.getLocationHistory);

module.exports = router;