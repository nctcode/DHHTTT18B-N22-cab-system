const locationService = require('../services/location.service');
const nearbyService = require('../services/nearby.service');
const { validationResult } = require('../middleware/validation');

class LocationController {
  // Cập nhật vị trí
  async updateLocation(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { driverId, lat, lng } = req.body;
      const location = await locationService.updateDriverLocation(driverId, lat, lng);
      
      res.status(200).json({
        success: true,
        data: location,
        message: 'Location updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Lấy vị trí hiện tại
  async getLocation(req, res) {
    try {
      const location = await locationService.getDriverLocation(req.params.driverId);
      res.status(200).json({
        success: true,
        data: location
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  // Tìm tài xế gần đây
  async getNearbyDrivers(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { lat, lng } = req.query;
      const radius = parseFloat(req.query.radius) || 5;
      const limit = parseInt(req.query.limit) || 10;
      
      const drivers = await nearbyService.findNearbyDrivers(lat, lng, radius, limit);
      
      res.status(200).json({
        success: true,
        data: drivers,
        count: drivers.length,
        search: { lat, lng, radius }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Lấy lịch sử vị trí
  async getLocationHistory(req, res) {
    try {
      const { driverId } = req.params;
      const hours = parseInt(req.query.hours) || 24;
      
      const locations = await locationService.getLocationHistory(driverId, hours);
      
      res.status(200).json({
        success: true,
        data: locations,
        count: locations.length
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new LocationController();