const express = require('express');
const { body } = require('express-validator');
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

// Public routes
router.post('/register', registerValidation, AuthController.register);
router.post('/login', loginValidation, AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/request-password-reset', passwordResetValidation, AuthController.requestPasswordReset);
router.post('/reset-password', resetPasswordValidation, AuthController.resetPassword);
router.get('/verify-email', AuthController.verifyEmail);

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
  [
    body('firstName').optional().trim(),
    body('lastName').optional().trim(),
    body('phone').optional().isMobilePhone()
  ],
  UserController.updateProfile
);

router.post('/change-password',
  authMiddleware.authenticate,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 })
  ],
  UserController.changePassword
);

module.exports = router;