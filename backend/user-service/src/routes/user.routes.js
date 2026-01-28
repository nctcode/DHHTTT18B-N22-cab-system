const express = require('express');
const { body, param, query } = require('express-validator');
const UserController = require('../controllers/user.controller');
const ProfileController = require('../controllers/profile.controller');

const router = express.Router();

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     tags:
 *       - Users
 *     summary: Register a new user
 *     description: Create a new user account and auto-generate profile
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               phone:
 *                 type: string
 *                 example: +84912345678
 *               avatar:
 *                 type: string
 *                 nullable: true
 *               bio:
 *                 type: string
 *                 nullable: true
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: 1990-05-15
 *               gender:
 *                 type: string
 *                 enum: [MALE, FEMALE, OTHER]
 *               homeAddress:
 *                 type: string
 *               workAddress:
 *                 type: string
 *               emergencyContact:
 *                 type: string
 *               emergencyContactPhone:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Validation error
 */
// User Routes
// Register new user
router.post(
  '/register',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('phone').isMobilePhone().withMessage('Valid phone number is required'),
    body('avatar').optional().isString(),
    body('bio').optional().isString(),
    body('dateOfBirth').optional().isString(),
    body('gender').optional().isIn(['MALE', 'FEMALE', 'OTHER']),
    body('homeAddress').optional().isString(),
    body('workAddress').optional().isString(),
    body('emergencyContact').optional().isString(),
    body('emergencyContactPhone').optional().isMobilePhone()
  ],
  UserController.registerUser
);

/**
 * @swagger
 * /api/users/{userId}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user by ID
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 */
// Get user profile by ID
router.get(
  '/:userId',
  [param('userId').notEmpty().withMessage('User ID is required')],
  UserController.getUserProfile
);

/**
 * @swagger
 * /api/users/{userId}/profile:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user with full profile details
 *     description: Retrieve user information along with complete profile data including ride statistics
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User and profile found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         phone:
 *                           type: string
 *                         avatar:
 *                           type: string
 *                     profile:
 *                       type: object
 *       404:
 *         description: User not found
 */
// Get user with full profile details
router.get(
  '/:userId/profile',
  [param('userId').notEmpty().withMessage('User ID is required')],
  UserController.getUserProfileDetails
);

// Get user by phone
router.get(
  '/phone/:phone',
  [param('phone').isMobilePhone().withMessage('Valid phone number is required')],
  UserController.getUserByPhone
);

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get all users with pagination
 *     description: Retrieve a paginated list of all users in the system
 *     parameters:
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *         description: Number of records to skip (pagination offset)
 *       - in: query
 *         name: take
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Number of records to return (pagination limit)
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       avatar:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     skip:
 *                       type: integer
 *                     take:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                       description: Total number of users in database
 *       400:
 *         description: Invalid query parameters
 */
// Get all users
router.get(
  '/',
  [
    query('skip').optional().isInt({ min: 0 }).toInt(),
    query('take').optional().isInt({ min: 1, max: 100 }).toInt()
  ],
  UserController.getAllUsers
);

// Update user
router.put(
  '/:userId',
  [
    param('userId').notEmpty().withMessage('User ID is required'),
    body('name').optional().isString(),
    body('avatar').optional().isString()
  ],
  UserController.updateUser
);

// Delete user
router.delete(
  '/:userId',
  [param('userId').notEmpty().withMessage('User ID is required')],
  UserController.deleteUser
);

// Record ride completion
router.post(
  '/:userId/ride-completion',
  [
    param('userId').notEmpty().withMessage('User ID is required'),
    body('fare')
      .notEmpty()
      .withMessage('Fare is required')
      .isFloat({ min: 0 })
      .withMessage('Fare must be a positive number'),
    body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5')
  ],
  UserController.recordRideCompletion
);

// Profile Routes

/**
 * @swagger
 * /api/users/profile/{userId}:
 *   get:
 *     tags:
 *       - Profiles
 *     summary: Get user profile
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Profile found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Profile'
 *       404:
 *         description: Profile not found
 *   put:
 *     tags:
 *       - Profiles
 *     summary: Update user profile
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bio:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: [MALE, FEMALE, OTHER]
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               homeAddress:
 *                 type: string
 *               workAddress:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
// Get user profile
router.get(
  '/profile/:userId',
  [param('userId').notEmpty().withMessage('User ID is required')],
  ProfileController.getUserProfile
);

// Update user profile
router.put(
  '/profile/:userId',
  [
    param('userId').notEmpty().withMessage('User ID is required'),
    body('bio').optional().isString(),
    body('dateOfBirth').optional().isString(),
    body('gender').optional().isIn(['MALE', 'FEMALE', 'OTHER']),
    body('address').optional().isString(),
    body('city').optional().isString(),
    body('state').optional().isString(),
    body('zipCode').optional().isString(),
    body('country').optional().isString(),
    body('homeAddress').optional().isString(),
    body('workAddress').optional().isString(),
    body('emergencyContact').optional().isString(),
    body('emergencyContactPhone').optional().isMobilePhone()
  ],
  ProfileController.updateUserProfile
);

// Update notification settings
router.put(
  '/profile/:userId/notifications',
  [param('userId').notEmpty().withMessage('User ID is required')],
  ProfileController.updateNotificationPreferences
);

// Verify phone
router.post(
  '/profile/:userId/verify-phone',
  [param('userId').notEmpty().withMessage('User ID is required')],
  ProfileController.verifyPhone
);

// Verify email
router.post(
  '/profile/:userId/verify-email',
  [param('userId').notEmpty().withMessage('User ID is required')],
  ProfileController.verifyEmail
);

// Update last active
router.post(
  '/profile/:userId/last-active',
  [param('userId').notEmpty().withMessage('User ID is required')],
  ProfileController.updateLastActive
);

// Get verification details
router.get(
  '/profile/:userId/verification',
  [param('userId').notEmpty().withMessage('User ID is required')],
  ProfileController.getVerificationDetails
);

// Update verification status
router.put(
  '/profile/:userId/verification-status',
  [
    param('userId').notEmpty().withMessage('User ID is required'),
    body('status').notEmpty().withMessage('Status is required')
  ],
  ProfileController.updateVerificationStatus
);

// Delete profile
router.delete(
  '/profile/:userId',
  [param('userId').notEmpty().withMessage('User ID is required')],
  ProfileController.deleteProfile
);

module.exports = router;
