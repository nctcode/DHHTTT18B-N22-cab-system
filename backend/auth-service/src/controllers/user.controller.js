const UserService = require('../services/user.service');

class UserController {
  static async getProfile(req, res) {
    try {
      const userId = req.user.userId;
      
      const profile = await UserService.getUserProfile(userId);

      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  static async updateProfile(req, res) {
    try {
      const userId = req.user.userId;
      const updateData = req.body;
      
      const updatedUser = await UserService.updateUserProfile(userId, updateData);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  static async updateProfileDetails(req, res) {
    try {
      const userId = req.user.userId;
      const profileData = req.body;
      
      const updatedProfile = await UserService.updateProfile(userId, profileData);

      res.json({
        success: true,
        message: 'Profile details updated successfully',
        data: updatedProfile
      });
    } catch (error) {
      console.error('Update profile details error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  static async deactivateAccount(req, res) {
    try {
      const userId = req.user.userId;
      
      await UserService.deactivateAccount(userId);

      res.json({
        success: true,
        message: 'Account deactivated successfully'
      });
    } catch (error) {
      console.error('Deactivate account error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  static async updateProfile(req, res) {
    try {
      const userId = req.user.userId;
      const updateData = req.body;
      
      // Remove fields that shouldn't be updated
      delete updateData.email;
      delete updateData.role;
      delete updateData.isVerified;
      delete updateData.isActive;
      
      const updatedUser = await UserService.updateUserProfile(userId, updateData);
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
  
  static async changePassword(req, res) {
    try {
      const userId = req.user.userId;
      const { currentPassword, newPassword } = req.body;
      
      const result = await AuthService.changePassword(userId, currentPassword, newPassword);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = UserController;