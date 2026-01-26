const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driver.controller');
const { validateDriver, validateStatus } = require('../middleware/validation');

// POST /drivers - Tạo tài xế mới
router.post('/', validateDriver, driverController.createDriver);

// GET /drivers - Lấy danh sách tài xế
router.get('/', driverController.getAllDrivers);

// GET /drivers/:id - Lấy thông tin tài xế
router.get('/:id', driverController.getDriver);

// PUT /drivers/:id - Cập nhật thông tin tài xế
router.put('/:id', validateDriver, driverController.updateDriver);

// PUT /drivers/:id/status - Cập nhật trạng thái
router.put('/:id/status', validateStatus, driverController.updateDriverStatus);

// DELETE /drivers/:id - Xóa tài xế
router.delete('/:id', driverController.deleteDriver);

module.exports = router;