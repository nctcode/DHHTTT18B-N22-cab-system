const express = require('express');
const { body } = require('express-validator');
const adminRoutes = require('./admin.routes');
const router = express.Router();

const AuthController = require('../controllers/auth.controller');
const UserController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('phone').optional().isMobilePhone(),
  body('role').optional().isIn(['CUSTOMER', 'DRIVER', 'ADMIN'])
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

const passwordResetValidation = [
  body('email').isEmail().normalizeEmail()
];

const resetPasswordValidation = [
  body('token').notEmpty(),
  body('newPassword').isLength({ min: 8 })
];

const updateProfileValidation = [
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('phone').optional().isMobilePhone('any').withMessage('Invalid phone number'),
  body('licenseNumber').optional().trim(),
  body('vehicleType').optional().trim(),
  body('vehicleNumber').optional().trim()
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
];

// Public routes
router.post('/register', registerValidation, AuthController.register);
router.post('/login', loginValidation, AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);
// router.post('/request-password-reset', passwordResetValidation, AuthController.requestPasswordReset);
router.post('/reset-password', resetPasswordValidation, AuthController.resetPassword);
router.get('/verify-email', AuthController.verifyEmail);

router.post('/request-password-reset', 
  [body('email').isEmail().normalizeEmail()],
  AuthController.requestPasswordReset
);

router.post('/reset-password', 
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
  ],
  AuthController.resetPassword
);

// Protected routes (require authentication)
router.use(authMiddleware.authenticate);

router.post('/logout', AuthController.logout);
router.get('/profile', UserController.getProfile);
router.put('/profile', UserController.updateProfile);
router.put('/profile/details', UserController.updateProfileDetails);
router.put('/deactivate', UserController.deactivateAccount);

// Admin only routes
router.get('/admin/users', 
  authMiddleware.authorize('ADMIN'), 
  (req, res) => {
    // TODO: Implement user management for admin
    res.json({ message: 'Admin user list endpoint' });
  }
);

// Thêm sau các routes hiện có
router.put('/profile/update', 
  authMiddleware.authenticate,
  updateProfileValidation,
  UserController.updateProfile
);

router.post('/change-password',
  authMiddleware.authenticate,
  changePasswordValidation,
  UserController.changePassword
);

// Admin routes
router.use('/admin', adminRoutes);

module.exports = router;