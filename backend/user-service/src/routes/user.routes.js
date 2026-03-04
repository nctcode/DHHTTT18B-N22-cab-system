const express = require('express');
const { param, body, query } = require('express-validator');
const UserController = require('../controllers/user.controller');
const { gatewayAuth } = require('../middleware/gateway.middleware');
const { allowAdminOnly, allowSelfOrAdmin } = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');

const router = express.Router();

// Health check (Public)
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'User service is healthy',
    timestamp: new Date().toISOString()
  });
});

// Register user profile (Internal/Auth Service only)
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('fullName').notEmpty().trim().withMessage('Full name is required'),
    body('phone').isMobilePhone().withMessage('Invalid phone number'),
  ],
  validate,
  UserController.registerUser
);

// Internal get user by ID (Bypass Gateway Auth for service-to-service)
router.get(
  '/internal/profile/:id',
  UserController.getUser
);

// Apply Gateway Auth to all other routes
router.use(gatewayAuth);

// Get all users (Admin)
router.get(
  '/',
  allowAdminOnly,
  UserController.getAllUsers
);

// Get user by phone (Admin)
router.get(
  '/phone/:phone',
  allowAdminOnly,
  UserController.getUserByPhone
);

// Get user by ID (Self or Admin)
router.get(
  '/:id',
  allowSelfOrAdmin,
  UserController.getUser
);

// Update user (Self or Admin)
router.put(
  '/:id',
  allowSelfOrAdmin,
  [
    body('fullName').optional().trim().notEmpty(),
    body('phone').optional().isMobilePhone(),
  ],
  validate,
  UserController.updateUser
);

// Delete user (Admin - Soft Delete)
router.delete(
  '/:id',
  allowAdminOnly,
  UserController.deleteUser
);

// Addresses (Self)
router.get(
  '/:id/addresses',
  allowSelfOrAdmin,
  UserController.getUserAddresses
);

router.post(
  '/:id/addresses',
  allowSelfOrAdmin,
  [
    body('label').notEmpty(),
    body('address').notEmpty(),
    body('lat').isFloat(),
    body('lng').isFloat()
  ],
  validate,
  UserController.addUserAddress
);

module.exports = router;
