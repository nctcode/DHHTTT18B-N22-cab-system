const ProfileModel = require('../models/Profile');

class ProfileService {
  // Get user profile
  static async getUserProfile(userId) {
    try {
      const profile = await ProfileModel.findProfileByUserId(userId);
      if (!profile) {
        throw new Error('Profile not found');
      }
      return {
        success: true,
        data: profile
      };
    } catch (error) {
      throw new Error(`Failed to fetch profile: ${error.message}`);
    }
  }

  // Update user profile
  static async updateUserProfile(userId, updateData) {
    try {
      // Convert dateOfBirth if provided
      if (updateData.dateOfBirth) {
        updateData.dateOfBirth = new Date(updateData.dateOfBirth);
      }

      const profile = await ProfileModel.updateProfile(userId, updateData);
      return {
        success: true,
        message: 'Profile updated successfully',
        data: profile
      };
    } catch (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }

  // Update notification settings
  static async updateNotificationSettings(userId, settings) {
    try {
      const profile = await ProfileModel.updateNotificationSettings(userId, settings);
      return {
        success: true,
        message: 'Notification settings updated',
        data: profile
      };
    } catch (error) {
      throw new Error(`Failed to update notification settings: ${error.message}`);
    }
  }

  // Verify phone
  static async verifyPhone(userId) {
    try {
      const profile = await ProfileModel.updatePhoneVerification(userId, true);
      return {
        success: true,
        message: 'Phone verified successfully',
        data: profile
      };
    } catch (error) {
      throw new Error(`Failed to verify phone: ${error.message}`);
    }
  }

  // Verify email
  static async verifyEmail(userId) {
    try {
      const profile = await ProfileModel.updateEmailVerification(userId, true);
      return {
        success: true,
        message: 'Email verified successfully',
        data: profile
      };
    } catch (error) {
      throw new Error(`Failed to verify email: ${error.message}`);
    }
  }

  // Update last active
  static async updateLastActive(userId) {
    try {
      await ProfileModel.updateLastActive(userId);
      return {
        success: true,
        message: 'Last active updated'
      };
    } catch (error) {
      throw new Error(`Failed to update last active: ${error.message}`);
    }
  }

  // Update verification status
  static async updateVerificationStatus(userId, status) {
    try {
      const profile = await ProfileModel.updateVerificationStatus(userId, status);
      return {
        success: true,
        message: 'Verification status updated',
        data: profile
      };
    } catch (error) {
      throw new Error(`Failed to update verification status: ${error.message}`);
    }
  }

  // Get verification details
  static async getVerificationDetails(userId) {
    try {
      const profile = await ProfileModel.findProfileByUserId(userId);
      if (!profile) {
        throw new Error('Profile not found');
      }
      return {
        success: true,
        data: {
          isVerified: profile.isVerified,
          isPhoneVerified: profile.isPhoneVerified,
          isEmailVerified: profile.isEmailVerified
        }
      };
    } catch (error) {
      throw new Error(`Failed to fetch verification details: ${error.message}`);
    }
  }

  // Delete profile
  static async deleteProfile(userId) {
    try {
      await ProfileModel.deleteProfile(userId);
      return {
        success: true,
        message: 'Profile deleted successfully'
      };
    } catch (error) {
      throw new Error(`Failed to delete profile: ${error.message}`);
    }
  }
}

module.exports = ProfileService;
