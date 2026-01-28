const driverService = require('../services/driver.service');
const { validationResult } = require('../middleware/validation');

class DriverController {
  // Tạo tài xế mới
  async createDriver(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const driver = await driverService.createDriver(req.body);
      res.status(201).json({
        success: true,
        data: driver,
        message: 'Driver created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Lấy thông tin tài xế
  async getDriver(req, res) {
    try {
      const driver = await driverService.getDriverById(req.params.id);
      res.status(200).json({
        success: true,
        data: driver
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  // Cập nhật tài xế
  async updateDriver(req, res) {
    try {
      const driver = await driverService.updateDriver(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: driver,
        message: 'Driver updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Cập nhật trạng thái
  async updateDriverStatus(req, res) {
    try {
      const { status } = req.body;
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const driver = await driverService.updateDriverStatus(req.params.id, status);
      res.status(200).json({
        success: true,
        data: driver,
        message: 'Driver status updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Xóa tài xế
  async deleteDriver(req, res) {
    try {
      const result = await driverService.deleteDriver(req.params.id);
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Lấy danh sách tài xế
  async getAllDrivers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      
      const result = await driverService.getAllDrivers(page, limit);
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new DriverController();