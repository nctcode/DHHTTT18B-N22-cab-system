const UserProfileModel = require('../models/UserProfile');

class ProfileService {
  // Get user profile
  static async getUserProfile(userId) {
    try {
      const profile = await UserProfileModel.getFullProfile(userId);
      if (!profile) {
        throw new Error('Profile not found');
      }
      return {
        success: true,
        data: profile
      };
    } catch (error) {
      throw new Error(`Failed to fetch user profile: ${error.message}`);
    }
  }

  // Update user profile
  static async updateUserProfile(userId, updateData) {
    try {
      const profile = await UserProfileModel.updateProfile(userId, updateData);
      return {
        success: true,
        message: 'Profile updated successfully',
        data: profile
      };
    } catch (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }

  // Update notification preferences
  static async updateNotificationPreferences(userId, preferences) {
    try {
      const profile = await UserProfileModel.updateNotificationPreferences(
        userId,
        preferences
      );
      return {
        success: true,
        message: 'Notification preferences updated',
        data: profile
      };
    } catch (error) {
      throw new Error(
        `Failed to update notification preferences: ${error.message}`
      );
    }
  }

  // Verify phone number
  static async verifyPhone(userId) {
    try {
      const profile = await UserProfileModel.updatePhoneVerification(
        userId,
        true
      );
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
      const profile = await UserProfileModel.updateEmailVerification(
        userId,
        true
      );
      return {
        success: true,
        message: 'Email verified successfully',
        data: profile
      };
    } catch (error) {
      throw new Error(`Failed to verify email: ${error.message}`);
    }
  }

  // Update user last active time
  static async updateLastActive(userId) {
    try {
      await UserProfileModel.updateLastActive(userId);
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
      const profile = await UserProfileModel.updateVerificationStatus(
        userId,
        status
      );
      return {
        success: true,
        message: 'Verification status updated',
        data: profile
      };
    } catch (error) {
      throw new Error(
        `Failed to update verification status: ${error.message}`
      );
    }
  }

  // Get verification details
  static async getVerificationDetails(userId) {
    try {
      const profile = await UserProfileModel.findProfileByUserId(userId);
      if (!profile) {
        throw new Error('Profile not found');
      }
      return {
        success: true,
        data: {
          verificationStatus: profile.verificationStatus,
          isPhoneVerified: profile.isPhoneVerified,
          isEmailVerified: profile.isEmailVerified
        }
      };
    } catch (error) {
      throw new Error(
        `Failed to fetch verification details: ${error.message}`
      );
    }
  }

  // Get user preferences
  static async getUserPreferences(userId) {
    try {
      const profile = await UserProfileModel.findProfileByUserId(userId);
      if (!profile) {
        throw new Error('Profile not found');
      }
      return {
        success: true,
        data: {
          preferences: profile.preferences,
          notificationPreferences: profile.notificationPreferences,
          socialLinks: profile.socialLinks
        }
      };
    } catch (error) {
      throw new Error(`Failed to fetch user preferences: ${error.message}`);
    }
  }

  // Delete profile
  static async deleteProfile(userId) {
    try {
      await UserProfileModel.deleteProfile(userId);
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
