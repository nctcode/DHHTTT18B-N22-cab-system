const UserProfileModel = require('../models/UserProfile');
const CustomerModel = require('../models/Customer');

class ProfileService {
  // Get user profile by userId (through customer)
  static async getUserProfile(userId) {
    try {
      const profile = await UserProfileModel.findProfileByUserId(userId);
      if (!profile) {
        throw new Error('Profile not found for this user');
      }
      return {
        success: true,
        data: profile
      };
    } catch (error) {
      throw new Error(`Failed to fetch user profile: ${error.message}`);
    }
  }

  // Get profile by customerId
  static async getProfileByCustomerId(customerId) {
    try {
      const profile = await UserProfileModel.findProfileByCustomerId(customerId);
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

  // Update user profile by userId
  static async updateUserProfile(userId, updateData) {
    try {
      const customer = await CustomerModel.findCustomerByUserId(userId);
      if (!customer) {
        throw new Error('Customer not found');
      }
      
      const profile = await UserProfileModel.updateProfile(customer.id, updateData);
      return {
        success: true,
        message: 'Profile updated successfully',
        data: profile
      };
    } catch (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }

  // Update notification preferences by userId
  static async updateNotificationPreferences(userId, preferences) {
    try {
      const customer = await CustomerModel.findCustomerByUserId(userId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      const profile = await UserProfileModel.updateNotificationPreferences(
        customer.id,
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

  // Verify phone number by userId
  static async verifyPhone(userId) {
    try {
      const customer = await CustomerModel.findCustomerByUserId(userId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      const profile = await UserProfileModel.updatePhoneVerification(
        customer.id,
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

  // Verify email by userId
  static async verifyEmail(userId) {
    try {
      const customer = await CustomerModel.findCustomerByUserId(userId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      const profile = await UserProfileModel.updateEmailVerification(
        customer.id,
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

  // Update user last active time by userId
  static async updateLastActive(userId) {
    try {
      const customer = await CustomerModel.findCustomerByUserId(userId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      await UserProfileModel.updateLastActive(customer.id);
      return {
        success: true,
        message: 'Last active updated'
      };
    } catch (error) {
      throw new Error(`Failed to update last active: ${error.message}`);
    }
  }

  // Update verification status by userId
  static async updateVerificationStatus(userId, status) {
    try {
      const customer = await CustomerModel.findCustomerByUserId(userId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      const profile = await UserProfileModel.updateVerificationStatus(
        customer.id,
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

  // Get verification details by userId
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

  // Get user preferences by userId
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

  // Delete profile by userId
  static async deleteProfile(userId) {
    try {
      const customer = await CustomerModel.findCustomerByUserId(userId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      await UserProfileModel.deleteProfile(customer.id);
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
