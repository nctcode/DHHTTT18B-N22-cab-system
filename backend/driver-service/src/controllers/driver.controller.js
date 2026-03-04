const DriverService = require('../services/driver.service');
const { validationResult } = require('express-validator');

class DriverController {

  /**
   * Create driver profile
   */
  async createDriver(req, res) {
    try {
      // Validation Check
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      // User ID from Gateway Header (via middleware)
      const userId = req.user.id;
      
      const driverData = {
        user_id: userId,
        vehicle_type: req.body.vehicle_type,
        vehicle_plate: req.body.vehicle_plate,
        current_lat: req.body.current_lat,
        current_lng: req.body.current_lng
      };

      const newDriver = await DriverService.createDriver(driverData);

      return res.status(201).json({
        success: true,
        message: 'Driver profile created successfully',
        data: newDriver
      });
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Internal Server Error'
      });
    }
  }

  /**
   * Get driver by ID
   */
  async getDriver(req, res) {
    try {
      const driver = await DriverService.getDriverById(req.params.id);
      return res.json({
        success: true,
        data: driver
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get driver profile for current authenticated user (by user_id)
   */
  async getMyProfile(req, res) {
    try {
      const userId = req.user.id;
      const driver = await DriverService.getDriverByUserId(userId);
      return res.json({
        success: true,
        data: driver
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get driver profile by user_id (Internal)
   */
  async getDriverByUserId(req, res) {
    try {
      const driver = await DriverService.getDriverByUserId(req.params.userId);
      return res.json({
        success: true,
        data: driver
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Update driver info
   */
  async updateDriver(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const updatedDriver = await DriverService.updateDriver(req.params.id, req.body);
      return res.json({
        success: true,
        message: 'Driver updated successfully',
        data: updatedDriver
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Update driver availability status
   */
  async updateStatus(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { is_available } = req.body;
      const updatedDriver = await DriverService.updateStatus(req.params.id, is_available);
      
      return res.json({
        success: true,
        message: 'Driver status updated',
        data: updatedDriver
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Update driver location
   */
  async updateLocation(req, res) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { current_lat, current_lng } = req.body;
        const updatedDriver = await DriverService.updateLocation(req.params.id, current_lat, current_lng);

        return res.json({
            success: true,
            message: 'Location updated',
            data: updatedDriver
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
  }

  /**
   * List all drivers (Admin)
   */
  async getAllDrivers(req, res) {
    try {
      const { skip, take } = req.query;
      const result = await DriverService.getAllDrivers(Number(skip) || 0, Number(take) || 10);
      return res.json({
        success: true,
        data: result.data,
        pagination: {
          skip: result.skip,
          take: result.take,
          total: result.total
        }
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * List available drivers
   */
  async getAvailableDrivers(req, res) {
    try {
      const drivers = await DriverService.getAvailableDrivers();
      return res.json({
        success: true,
        data: drivers
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get nearby online drivers (internal — used by booking-service)
   */
  async getNearbyDrivers(req, res) {
    try {
      const { lat, lng, radius, limit } = req.query;
      if (!lat || !lng) {
        return res.status(400).json({ success: false, message: 'lat and lng are required' });
      }
      const drivers = await DriverService.getNearbyOnlineDrivers(
        parseFloat(lat), parseFloat(lng),
        parseFloat(radius) || 10,
        parseInt(limit) || 20
      );
      return res.json({ success: true, data: drivers });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Delete driver (Admin)
   */
  async deleteDriver(req, res) {
    try {
      await DriverService.deleteDriver(req.params.id);
      return res.json({
        success: true,
        message: 'Driver deleted successfully'
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new DriverController();