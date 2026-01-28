const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/admin.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// All admin routes require ADMIN role
router.use(authMiddleware.authenticate, authMiddleware.authorize('ADMIN'));

// User management
router.get('/users', AdminController.getAllUsers);
router.get('/users/:userId', AdminController.getUserById);
router.put('/users/:userId', AdminController.updateUser);
router.put('/users/:userId/toggle-status', AdminController.toggleUserStatus);

// Dashboard
router.get('/dashboard/stats', AdminController.getDashboardStats);

// Driver management
router.get('/drivers', (req, res) => {
  req.query.role = 'DRIVER';
  return AdminController.getAllUsers(req, res);
});

router.get('/drivers/pending-verification', async (req, res) => {
  try {
    // Implement driver verification logic
    res.json({ success: true, data: [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Customer management
router.get('/customers', (req, res) => {
  req.query.role = 'CUSTOMER';
  return AdminController.getAllUsers(req, res);
});

module.exports = router;