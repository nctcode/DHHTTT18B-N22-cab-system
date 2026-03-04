const UserModel = require('../models/User');
const { ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../constants');

class UserService {
  /**
   * Register new user profile.
   */
  static async registerUser(userData) {
    // Check if phone number already exists
    const phoneExists = await UserModel.phoneExists(userData.phone);
    if (phoneExists) {
      const error = new Error(ERROR_MESSAGES.USER_ALREADY_EXISTS);
      error.statusCode = 409;
      throw error;
    }
    
    // Check if email already exists
    if (userData.email) {
      const emailUser = await UserModel.findUserByEmail(userData.email);
      if (emailUser) {
        const error = new Error('Email already in use');
        error.statusCode = 409;
        throw error;
      }
    }

    // Create new user
    const newUser = await UserModel.createUser(userData);
    newUser.addresses = [];

    return newUser;
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId) {
    const user = await UserModel.findUserById(userId);

    if (!user) {
      const error = new Error(ERROR_MESSAGES.USER_NOT_FOUND);
      error.statusCode = 404;
      throw error;
    }

    // Fetch addresses separately
    const addresses = await UserModel.getUserAddresses(userId);
    user.addresses = addresses;

    return user;
  }

  /**
   * Update user by ID
   */
  static async updateUser(userId, updateData) {
    // Check if user exists
    const existingUser = await UserModel.findUserById(userId);
    if (!existingUser) {
      const error = new Error(ERROR_MESSAGES.USER_NOT_FOUND);
      error.statusCode = 404;
      throw error;
    }

    // Check conflicts
    if (updateData.phone && updateData.phone !== existingUser.phone) {
      const phoneExists = await UserModel.phoneExists(updateData.phone, userId);
      if (phoneExists) {
         const error = new Error(ERROR_MESSAGES.USER_ALREADY_EXISTS);
         error.statusCode = 409;
         throw error;
      }
    }

    if (updateData.email && updateData.email !== existingUser.email) {
       const emailUser = await UserModel.findUserByEmail(updateData.email);
       if (emailUser && emailUser.id !== userId) {
         const error = new Error('Email already in use');
         error.statusCode = 409;
         throw error;
       }
    }

    const updatedUser = await UserModel.updateUser(userId, updateData);
    const addresses = await UserModel.getUserAddresses(userId);
    updatedUser.addresses = addresses;

    return updatedUser;
  }

  /**
   * Delete user by ID (Soft delete)
   */
  static async deleteUser(userId) {
    const existingUser = await UserModel.findUserById(userId);
    if (!existingUser) {
      const error = new Error(ERROR_MESSAGES.USER_NOT_FOUND);
      error.statusCode = 404;
      throw error;
    }

    return await UserModel.updateUser(userId, { status: 'INACTIVE' });
  }

  /**
   * Get all users
   */
  static async getAllUsers(skip = 0, take = 10) {
    return await UserModel.findAllUsers(skip, take);
  }

  /**
   * Add address
   */
  static async addUserAddress(userId, addressData) {
    const user = await UserModel.findUserById(userId);
    if (!user) {
      const error = new Error(ERROR_MESSAGES.USER_NOT_FOUND);
      error.statusCode = 404;
      throw error;
    }

    return await UserModel.createUserAddress(userId, addressData);
  }

  /**
   * Get addresses
   */
  static async getUserAddresses(userId) {
    const user = await UserModel.findUserById(userId);
    if (!user) {
      const error = new Error(ERROR_MESSAGES.USER_NOT_FOUND);
      error.statusCode = 404;
      throw error;
    }

    return await UserModel.getUserAddresses(userId);
  }
  
  static async getUserByPhone(phone) {
    const user = await UserModel.findUserByPhone(phone);
    if (!user) {
        const error = new Error(ERROR_MESSAGES.USER_NOT_FOUND);
        error.statusCode = 404;
        throw error;
    }
    const addresses = await UserModel.getUserAddresses(user.id);
    user.addresses = addresses;
    return user;
  }
}

module.exports = UserService;