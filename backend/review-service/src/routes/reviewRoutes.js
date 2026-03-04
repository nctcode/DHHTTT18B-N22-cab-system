const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reviewController');

// Create review
router.post('/', ctrl.createReview);

// Check if review exists for a ride
router.get('/check', ctrl.checkReview);

// Get reviews for a ride
router.get('/ride/:rideId', ctrl.getByRide);

// Get reviews for a user (target)
router.get('/user/:userId', ctrl.getByUser);

module.exports = router;
