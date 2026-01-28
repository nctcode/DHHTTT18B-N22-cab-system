const { validationResult } = require('express-validator');
const UserService = require('../services/user.service');

class UserController {
  // Helper function to convert date string to DateTime
  static convertToDateTime(dateString) {
    if (!dateString) return null;

    if (dateString instanceof Date) {
      return dateString;
    }

    if (typeof dateString === 'string') {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return null;
  }

  // Register new user
  static async registerUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      let userData = req.body;

      // Convert dateOfBirth if provided
      if (userData.dateOfBirth) {
        userData.dateOfBirth = UserController.convertToDateTime(userData.dateOfBirth);
        if (!userData.dateOfBirth) {
          return res.status(400).json({
            success: false,
            message: 'Invalid dateOfBirth format. Use YYYY-MM-DD or ISO-8601 format.'
          });
        }
      }

      const result = await UserService.registerUser(userData);

      res.status(201).json(result);
    } catch (error) {
      console.error('Register user error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get user with profile
  static async getUserProfile(req, res) {
    try {
      const { userId } = req.params;

      const result = await UserService.getUserProfile(userId);

      res.json(result);
    } catch (error) {
      console.error('Get user profile error:', error);
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get user profile details
  static async getUserProfileDetails(req, res) {
    try {
      const { userId } = req.params;

      const result = await UserService.getUserProfileDetails(userId);

      res.json(result);
    } catch (error) {
      console.error('Get user profile details error:', error);
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get user by phone
  static async getUserByPhone(req, res) {
    try {
      const { phone } = req.params;

      const result = await UserService.getUserByPhone(phone);

      res.json(result);
    } catch (error) {
      console.error('Get user by phone error:', error);
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get all users
  static async getAllUsers(req, res) {
    try {
      const skip = parseInt(req.query.skip) || 0;
      const take = parseInt(req.query.take) || 10;

      const result = await UserService.getAllUsers(skip, take);

      res.json(result);
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update user
  static async updateUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId } = req.params;
      const updateData = req.body;

      const result = await UserService.updateUser(userId, updateData);

      res.json(result);
    } catch (error) {
      console.error('Update user error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Delete user
  static async deleteUser(req, res) {
    try {
      const { userId } = req.params;

      const result = await UserService.deleteUser(userId);

      res.json(result);
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Record ride completion
  static async recordRideCompletion(req, res) {
    try {
      const { userId } = req.params;
      const { fare, rating } = req.body;

      if (!fare) {
        return res.status(400).json({
          success: false,
          message: 'Fare is required'
        });
      }

      const result = await UserService.recordRideCompletion(userId, fare, rating);

      res.json(result);
    } catch (error) {
      console.error('Record ride error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = UserController;
