const prisma = require('../../prisma/client');

class UserModel {
  // Create a new user
  static async createUser(userData) {
    return await prisma.user.create({
      data: {
        name: userData.name,
        phone: userData.phone,
        avatar: userData.avatar || null
      },
      include: { profile: true }
    });
  }

  // Find user by ID
  static async findUserById(userId) {
    return await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });
  }

  // Find user by phone
  static async findUserByPhone(phone) {
    return await prisma.user.findUnique({
      where: { phone },
      include: { profile: true }
    });
  }

  // Find all users (with pagination)
  static async findAllUsers(skip = 0, take = 10) {
    return await prisma.user.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { profile: true }
    });
  }

  // Update user
  static async updateUser(userId, updateData) {
    const data = {};
    if (updateData.name !== undefined) data.name = updateData.name;
    if (updateData.avatar !== undefined) data.avatar = updateData.avatar;

    return await prisma.user.update({
      where: { id: userId },
      data,
      include: { profile: true }
    });
  }

  // Delete user (cascades to profile)
  static async deleteUser(userId) {
    return await prisma.user.delete({
      where: { id: userId }
    });
  }

  // Count total users
  static async countUsers() {
    return await prisma.user.count();
  }
}

module.exports = UserModel;
