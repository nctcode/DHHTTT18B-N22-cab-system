const express = require('express');
const { body, param, query } = require('express-validator');
const CustomerController = require('../controllers/customer.controller');
const ProfileController = require('../controllers/profile.controller');

const router = express.Router();

// Customer Routes
// Register customer profile
router.post(
  '/customers/register/:userId',
  [
    param('userId').notEmpty().withMessage('User ID is required'),
    body('phoneNumber').optional().isMobilePhone().withMessage('Valid phone number is required'),
    body('homeAddress').optional().isString(),
    body('workAddress').optional().isString(),
    body('emergencyContact').optional().isString()
  ],
  CustomerController.registerCustomer
);

// Get customer profile by customer ID
router.get(
  '/customers/:customerId',
  [param('customerId').notEmpty().withMessage('Customer ID is required')],
  CustomerController.getCustomerProfile
);

// Get customer profile by user ID (easier for testing)
router.get(
  '/customers/by-user/:userId',
  [param('userId').notEmpty().withMessage('User ID is required')],
  CustomerController.getCustomerByUserId
);

// Get all customers (admin)
router.get(
  '/customers',
  [
    query('skip').optional().isInt({ min: 0 }).toInt(),
    query('take')
      .optional()
      .isInt({ min: 1, max: 100 })
      .toInt()
  ],
  CustomerController.getAllCustomers
);

// Update customer profile
router.put(
  '/customers/:customerId',
  [param('customerId').notEmpty().withMessage('Customer ID is required')],
  CustomerController.updateCustomerProfile
);

// Record ride completion
router.post(
  '/customers/:customerId/ride-completion',
  [
    param('customerId').notEmpty().withMessage('Customer ID is required'),
    body('fare')
      .notEmpty()
      .withMessage('Fare is required')
      .isFloat({ min: 0 })
      .withMessage('Fare must be a positive number')
  ],
  CustomerController.recordRideCompletion
);

// Verify customer
router.post(
  '/customers/:customerId/verify',
  [param('customerId').notEmpty().withMessage('Customer ID is required')],
  CustomerController.verifyCustomer
);

// Deactivate customer
router.post(
  '/customers/:customerId/deactivate',
  [param('customerId').notEmpty().withMessage('Customer ID is required')],
  CustomerController.deactivateCustomer
);

// Activate customer
router.post(
  '/customers/:customerId/activate',
  [param('customerId').notEmpty().withMessage('Customer ID is required')],
  CustomerController.activateCustomer
);

// Delete customer
router.delete(
  '/customers/:customerId',
  [param('customerId').notEmpty().withMessage('Customer ID is required')],
  CustomerController.deleteCustomer
);

// Get customer statistics
router.get(
  '/customers/:customerId/stats',
  [param('customerId').notEmpty().withMessage('Customer ID is required')],
  CustomerController.getCustomerStats
);

// Profile Routes
// Get user profile
router.get(
  '/profiles/:userId',
  [param('userId').notEmpty().withMessage('User ID is required')],
  ProfileController.getUserProfile
);

// Update user profile
router.put(
  '/profiles/:userId',
  [param('userId').notEmpty().withMessage('User ID is required')],
  ProfileController.updateUserProfile
);

// Update notification preferences
router.put(
  '/profiles/:userId/notifications',
  [param('userId').notEmpty().withMessage('User ID is required')],
  ProfileController.updateNotificationPreferences
);

// Verify phone number
router.post(
  '/profiles/:userId/verify-phone',
  [param('userId').notEmpty().withMessage('User ID is required')],
  ProfileController.verifyPhone
);

// Verify email
router.post(
  '/profiles/:userId/verify-email',
  [param('userId').notEmpty().withMessage('User ID is required')],
  ProfileController.verifyEmail
);

// Update last active
router.post(
  '/profiles/:userId/last-active',
  [param('userId').notEmpty().withMessage('User ID is required')],
  ProfileController.updateLastActive
);

// Get verification details
router.get(
  '/profiles/:userId/verification',
  [param('userId').notEmpty().withMessage('User ID is required')],
  ProfileController.getVerificationDetails
);

// Get user preferences
router.get(
  '/profiles/:userId/preferences',
  [param('userId').notEmpty().withMessage('User ID is required')],
  ProfileController.getUserPreferences
);

// Update verification status
router.put(
  '/profiles/:userId/verification-status',
  [
    param('userId').notEmpty().withMessage('User ID is required'),
    body('status')
      .notEmpty()
      .withMessage('Verification status is required')
      .isIn(['PENDING', 'VERIFIED', 'REJECTED'])
      .withMessage('Invalid verification status')
  ],
  ProfileController.updateVerificationStatus
);

// Delete profile
router.delete(
  '/profiles/:userId',
  [param('userId').notEmpty().withMessage('User ID is required')],
  ProfileController.deleteProfile
);

module.exports = router;
