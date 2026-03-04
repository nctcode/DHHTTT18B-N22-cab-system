const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const refreshCtrl = require('../controllers/refreshToken.controller');
const auth = require('../middlewares/auth.middleware');
const { checkTokenRevocation } = require('../middlewares/tokenRevocation.middleware');

// Auth Routes
router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.get('/me', checkTokenRevocation, auth, ctrl.me);

// Token Management Routes
router.post('/refresh', refreshCtrl.refresh);
router.post('/logout', refreshCtrl.logout);
router.post('/logout-all', checkTokenRevocation, auth, refreshCtrl.logoutAll);
router.post('/revoke', checkTokenRevocation, auth, refreshCtrl.revoke);
router.patch('/account/:userId/deactivate', ctrl.deactivateAccount); // Internal/Admin use

module.exports = router;
