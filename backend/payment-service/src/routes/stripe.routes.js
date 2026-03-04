const express = require('express');
const router = express.Router();
const stripeCtrl = require('../controllers/stripe.controller');

router.post('/setup-intent', stripeCtrl.createSetupIntent);
router.post('/save-card', stripeCtrl.saveCard);
router.get('/saved-cards', stripeCtrl.getSavedCards);
router.delete('/saved-cards/:id', stripeCtrl.deleteSavedCard);

module.exports = router;
