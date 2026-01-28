const UserModel = require('../models/User');
const ProfileModel = require('../models/Profile');

class UserService {
  // Register new user with auto-create profile
  static async registerUser(userData) {
    try {
      // Create user
      const user = await UserModel.createUser({
        name: userData.name,
        phone: userData.phone,
        avatar: userData.avatar
      });

      // Auto-create profile
      const profile = await ProfileModel.createProfile(user.id, {
        bio: userData.bio || null,
        dateOfBirth: userData.dateOfBirth || null,
        gender: userData.gender || null,
        homeAddress: userData.homeAddress || null,
        workAddress: userData.workAddress || null,
        emergencyContact: userData.emergencyContact || null,
        emergencyContactPhone: userData.emergencyContactPhone || null
      });

      return {
        success: true,
        message: 'User registered successfully',
        data: { user, profile }
      };
    } catch (error) {
      throw new Error(`Failed to register user: ${error.message}`);
    }
  }

  // Get user profile (basic user info)
  static async getUserProfile(userId) {
    try {
      const user = await UserModel.findUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      return {
        success: true,
        data: user
      };
    } catch (error) {
      throw new Error(`Failed to fetch user profile: ${error.message}`);
    }
  }

  // Get user with full profile details
  static async getUserProfileDetails(userId) {
    try {
      const user = await UserModel.findUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      const profile = await ProfileModel.findProfileByUserId(userId);
      
      return {
        success: true,
        data: {
          user,
          profile: profile || null
        }
      };
    } catch (error) {
      throw new Error(`Failed to fetch user profile details: ${error.message}`);
    }
  }

  // Get user by phone
  static async getUserByPhone(phone) {
    try {
      const user = await UserModel.findUserByPhone(phone);
      if (!user) {
        throw new Error('User not found');
      }
      return {
        success: true,
        data: user
      };
    } catch (error) {
      throw new Error(`Failed to fetch user: ${error.message}`);
    }
  }

  // Get all users
  static async getAllUsers(skip = 0, take = 10) {
    try {
      const users = await UserModel.findAllUsers(skip, take);
      const total = await UserModel.countUsers();
      return {
        success: true,
        data: users,
        pagination: { skip, take, total }
      };
    } catch (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
  }

  // Update user
  static async updateUser(userId, updateData) {
    try {
      const user = await UserModel.updateUser(userId, {
        name: updateData.name,
        avatar: updateData.avatar
      });
      return {
        success: true,
        message: 'User updated successfully',
        data: user
      };
    } catch (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  // Delete user
  static async deleteUser(userId) {
    try {
      await UserModel.deleteUser(userId);
      return {
        success: true,
        message: 'User deleted successfully'
      };
    } catch (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  // Record ride completion
  static async recordRideCompletion(userId, fare, rating = null) {
    try {
      const profile = await ProfileModel.updateRideStats(userId, fare, rating);
      return {
        success: true,
        message: 'Ride recorded successfully',
        data: profile
      };
    } catch (error) {
      throw new Error(`Failed to record ride: ${error.message}`);
    }
  }
}

module.exports = UserService;
