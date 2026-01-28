const UserService = require('../services/user.service');
const bcrypt = require('bcryptjs');
const prisma = require('../../prisma/client'); // Thêm dòng này
const JWTService = require('../services/jwt.service'); // Thêm dòng này

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
      
      // Remove fields that shouldn't be updated
      delete updateData.email;
      delete updateData.role;
      delete updateData.isVerified;
      delete updateData.isActive;
      delete updateData.password;
      
      // Validate phone number format
      if (updateData.phone && updateData.phone.length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Phone number must be at least 10 digits'
        });
      }
      
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
        message: error.message || 'Failed to update profile'
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
      const userId = req.user?.userId;
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Both current and new password are required'
        });
      }
      
      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 8 characters'
        });
      }
      
      // Find user - Đã có prisma
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
      
      // Update password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
      });
      
      // Blacklist all existing refresh tokens
      const userTokens = await prisma.refreshToken.findMany({
        where: { userId }
      });
      
      for (const token of userTokens) {
        await JWTService.blacklistToken(token.token, 7 * 24 * 60 * 60);
      }
      
      // Delete from database
      await prisma.refreshToken.deleteMany({
        where: { userId }
      });
      
      res.json({
        success: true,
        message: 'Password updated successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to change password'
      });
    }
  }
}

module.exports = UserController;