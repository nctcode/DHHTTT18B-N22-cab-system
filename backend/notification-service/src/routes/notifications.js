const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notificationController');

// READ-ONLY endpoints
router.get('/user/:userId', ctrl.getByUser);
router.get('/:id', ctrl.getById);
router.get('/', ctrl.getByStatus);

module.exports = router;