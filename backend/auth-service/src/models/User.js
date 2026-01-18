const prisma = require('../../prisma/client');
const bcrypt = require('bcryptjs');

class UserModel {
  static async createUser(userData) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    return await prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
        profile: {
          create: {}
        }
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
        isActive: true,
        createdAt: true
      }
    });
  }

  static async findUserByEmail(email) {
    return await prisma.user.findUnique({
      where: { email },
      include: {
        profile: true
      }
    });
  }

  static async findUserByPhone(phone) {
    return await prisma.user.findUnique({
      where: { phone },
      include: {
        profile: true
      }
    });
  }

  static async findUserById(id) {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        profile: true
      }
    });
  }

  static async updateUser(id, updateData) {
    return await prisma.user.update({
      where: { id },
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

  static async comparePassword(inputPassword, hashedPassword) {
    return await bcrypt.compare(inputPassword, hashedPassword);
  }
}

module.exports = UserModel;