const UserModel = require('../models/User');

class UserService {
  static async getUserProfile(userId) {
    const user = await UserModel.findUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Remove sensitive data
    const { password, refreshTokens, ...userProfile } = user;
    
    return userProfile;
  }

  static async updateUserProfile(userId, updateData) {
    // Remove fields that shouldn't be updated directly
    const { id, email, role, isVerified, isActive, ...allowedUpdates } = updateData;
    
    const updatedUser = await UserModel.updateUser(userId, allowedUpdates);
    return updatedUser;
  }

  static async updateProfile(userId, profileData) {
    const prisma = require('../../prisma/client');
    
    return await prisma.profile.upsert({
      where: { userId },
      update: profileData,
      create: {
        ...profileData,
        userId
      }
    });
  }

  static async deactivateAccount(userId) {
    return await UserModel.updateUser(userId, { isActive: false });
  }

  static async activateAccount(userId) {
    return await UserModel.updateUser(userId, { isActive: true });
  }
  
  static async updateUserProfile(userId, updateData) {
  const prisma = require('../../prisma/client');
  
  return await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      role: true,
      isVerified: true,
      isActive: true,
      updatedAt: true
    }
  });
}
}

module.exports = UserService;