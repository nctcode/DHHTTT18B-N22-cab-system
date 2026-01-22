const ProfileService = require('../services/profile.service');
const { validationResult } = require('express-validator');

class ProfileController {
  // Get user profile
  static async getUserProfile(req, res) {
    try {
      const { userId } = req.params;

      const result = await ProfileService.getUserProfile(userId);

      res.json(result);
    } catch (error) {
      console.error('Get user profile error:', error);
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update user profile
  static async updateUserProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId } = req.params;
      const updateData = req.body;

      const result = await ProfileService.updateUserProfile(
        userId,
        updateData
      );

      res.json(result);
    } catch (error) {
      console.error('Update user profile error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update notification preferences
  static async updateNotificationPreferences(req, res) {
    try {
      const { userId } = req.params;
      const preferences = req.body;

      const result =
        await ProfileService.updateNotificationPreferences(userId, preferences);

      res.json(result);
    } catch (error) {
      console.error('Update notification preferences error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Verify phone number
  static async verifyPhone(req, res) {
    try {
      const { userId } = req.params;

      const result = await ProfileService.verifyPhone(userId);

      res.json(result);
    } catch (error) {
      console.error('Verify phone error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Verify email
  static async verifyEmail(req, res) {
    try {
      const { userId } = req.params;

      const result = await ProfileService.verifyEmail(userId);

      res.json(result);
    } catch (error) {
      console.error('Verify email error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update last active
  static async updateLastActive(req, res) {
    try {
      const { userId } = req.params;

      const result = await ProfileService.updateLastActive(userId);

      res.json(result);
    } catch (error) {
      console.error('Update last active error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get verification details
  static async getVerificationDetails(req, res) {
    try {
      const { userId } = req.params;

      const result = await ProfileService.getVerificationDetails(userId);

      res.json(result);
    } catch (error) {
      console.error('Get verification details error:', error);
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get user preferences
  static async getUserPreferences(req, res) {
    try {
      const { userId } = req.params;

      const result = await ProfileService.getUserPreferences(userId);

      res.json(result);
    } catch (error) {
      console.error('Get user preferences error:', error);
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  // Delete profile
  static async deleteProfile(req, res) {
    try {
      const { userId } = req.params;

      const result = await ProfileService.deleteProfile(userId);

      res.json(result);
    } catch (error) {
      console.error('Delete profile error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update verification status
  static async updateVerificationStatus(req, res) {
    try {
      const { userId } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Verification status is required'
        });
      }

      const result = await ProfileService.updateVerificationStatus(
        userId,
        status
      );

      res.json(result);
    } catch (error) {
      console.error('Update verification status error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = ProfileController;
