const express = require('express');
const { body, param, query } = require('express-validator');
const DriverController = require('../controllers/driver.controller');
const { gatewayAuth } = require('../middleware/gateway.middleware');
const { allowDriverOnly, allowAdminOnly, allowSelfDriverOrAdmin } = require('../middleware/role.middleware');

const router = express.Router();

// Health Check
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Driver service is healthy' });
});

/**
 * GET /drivers/available
 * List available drivers (Used by Booking Service internally - no gateway auth needed)
 */
router.get(
  '/available',
  DriverController.getAvailableDrivers
);

/**
 * GET /drivers/nearby?lat=X&lng=Y&radius=5&limit=10
 * Find nearby online drivers sorted by distance + rating (internal)
 */
router.get(
  '/nearby',
  DriverController.getNearbyDrivers
);

/**
 * GET /drivers/internal/profile/:userId
 * Internal endpoint to get driver by user_id
 */
router.get(
  '/internal/profile/:userId',
  param('userId').notEmpty(),
  DriverController.getDriverByUserId
);

// Apply Gateway Auth to all remaining API routes (these come from API Gateway)
router.use(gatewayAuth);

/**
 * GET /drivers
 * List all drivers (Admin only)
 */
router.get(
  '/',
  allowAdminOnly,
  [
    query('skip').optional().isInt({ min: 0 }),
    query('take').optional().isInt({ min: 1 })
  ],
  DriverController.getAllDrivers
);

/**
 * POST /drivers
 * Create driver profile (Driver only)
 */
router.post(
  '/',
  allowDriverOnly,
  [
    body('vehicle_type').notEmpty().withMessage('Vehicle type is required'),
    body('vehicle_plate').notEmpty().withMessage('Vehicle plate is required'),
    body('current_lat').isFloat().withMessage('Latitude must be a float'),
    body('current_lng').isFloat().withMessage('Longitude must be a float'),
  ],
  DriverController.createDriver
);

/**
 * GET /drivers/profile/me
 * Get current driver's profile by user_id from JWT (Driver only)
 */
router.get(
  '/profile/me',
  allowDriverOnly,
  DriverController.getMyProfile
);

/**
 * GET /drivers/:id
 * Get driver by ID (Self or Admin)
 */
router.get(
  '/:id',
  allowSelfDriverOrAdmin,
  param('id').notEmpty(),
  DriverController.getDriver
);

/**
 * PUT /drivers/:id
 * Update driver info (Self or Admin)
 */
router.put(
  '/:id',
  allowSelfDriverOrAdmin,
  [
    body('vehicle_type').optional().notEmpty(),
    body('vehicle_plate').optional().notEmpty()
  ],
  DriverController.updateDriver
);

/**
 * PATCH /drivers/:id/status
 * Update driver availability (Self or Admin)
 */
router.patch(
  '/:id/status',
  allowSelfDriverOrAdmin,
  [
    body('is_available').isBoolean().withMessage('is_available must be a boolean')
  ],
  DriverController.updateStatus
);

/**
 * PATCH /drivers/:id/location
 * Update driver location (Self or Admin)
 */
router.patch(
  '/:id/location',
  allowSelfDriverOrAdmin,
  [
      body('current_lat').isFloat().withMessage('Latitude must be a float'),
      body('current_lng').isFloat().withMessage('Longitude must be a float'),
  ],
  DriverController.updateLocation
);

/**
 * DELETE /drivers/:id
 * Delete driver (Admin only)
 */
router.delete(
  '/:id',
  allowAdminOnly,
  param('id').notEmpty(),
  DriverController.deleteDriver
);

module.exports = router;