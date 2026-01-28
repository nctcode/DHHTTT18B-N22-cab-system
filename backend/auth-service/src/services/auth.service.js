const UserModel = require('../models/User');
const JWTService = require('./jwt.service');
const EmailService = require('./email.service');
const prisma = require('../../prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { redis } = require('../utils/redis');

class AuthService {
  static async register(userData) {
    // Check if user already exists
    const existingUser = await UserModel.findUserByEmail(userData.email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    if (userData.phone) {
      const existingPhone = await UserModel.findUserByPhone(userData.phone);
      if (existingPhone) {
        throw new Error('Phone number already registered');
      }
    }

    // Validate role
    const validRoles = ['CUSTOMER', 'DRIVER', 'ADMIN'];
    if (!validRoles.includes(userData.role)) {
      throw new Error('Invalid role');
    }

    // Admin registration restriction (only by existing admins)
    if (userData.role === 'ADMIN') {
      throw new Error('Admin registration is restricted');
    }

    // Driver-specific validation
    if (userData.role === 'DRIVER') {
      if (!userData.licenseNumber) {
        throw new Error('License number is required for drivers');
      }
      if (!userData.vehicleType) {
        throw new Error('Vehicle type is required for drivers');
      }
      if (!userData.vehicleNumber) {
        throw new Error('Vehicle number is required for drivers');
      }
    }

    // Create new user
    const user = await UserModel.createUser(userData);

    // Generate tokens
    const accessToken = JWTService.generateAccessToken(user);
    const refreshToken = JWTService.generateRefreshToken(user);

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt
      }
    });

    await JWTService.storeRefreshToken(refreshToken, user.id, expiresAt);

    return {
      user,
      tokens: {
        accessToken,
        refreshToken,
        accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m'
      }
    };
  }

  static async login(email, password) {
    // Find user
    const user = await UserModel.findUserByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isValidPassword = await UserModel.comparePassword(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const accessToken = JWTService.generateAccessToken(user);
    const refreshToken = JWTService.generateRefreshToken(user);

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt
      }
    });

    await JWTService.storeRefreshToken(refreshToken, user.id, expiresAt);

    // Remove sensitive data
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      tokens: {
        accessToken,
        refreshToken,
        accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m'
      }
    };
  }

  static async refreshAccessToken(refreshToken) {
    // Verify refresh token
    const decoded = JWTService.verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new Error('Invalid refresh token');
    }

    // Check if token is blacklisted
    const isBlacklisted = await JWTService.isTokenBlacklisted(refreshToken);
    if (isBlacklisted) {
      throw new Error('Token has been revoked');
    }

    // Check if token exists in Redis
    const isValid = await JWTService.isValidRefreshToken(refreshToken, decoded.userId);
    if (!isValid) {
      throw new Error('Invalid refresh token');
    }

    // Find user
    const user = await UserModel.findUserById(decoded.userId);
    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    // Generate new access token
    const accessToken = JWTService.generateAccessToken(user);

    // Optional: Token rotation - generate new refresh token
    const newRefreshToken = JWTService.generateRefreshToken(user);
    
    // Revoke old refresh token
    await JWTService.revokeRefreshToken(refreshToken, user.id);
    await JWTService.blacklistToken(refreshToken, 7 * 24 * 60 * 60); // 7 days

    // Store new refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: user.id,
        expiresAt
      }
    });

    await JWTService.storeRefreshToken(newRefreshToken, user.id, expiresAt);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m'
    };
  }

  static async logout(accessToken, refreshToken, userId) {
    // Blacklist tokens
    const accessTokenExpiry = 15 * 60; // 15 minutes
    await JWTService.blacklistToken(accessToken, accessTokenExpiry);
    
    if (refreshToken) {
      await JWTService.revokeRefreshToken(refreshToken, userId);
      await JWTService.blacklistToken(refreshToken, 7 * 24 * 60 * 60);
    }

    return { message: 'Logged out successfully' };
  }

  static async verifyEmail(token) {
    // Implement email verification logic
    // This is a placeholder - you'd need to implement based on your email service
    return { message: 'Email verified successfully' };
  }

  static async requestPasswordReset(email) {
  const user = await UserModel.findUserByEmail(email);
  if (!user) {
    // For security, don't reveal that user doesn't exist
    return { 
      success: true, 
      message: 'If an account exists with this email, you will receive a reset link shortly.' 
    };
  }

  // Generate reset token
  const resetToken = uuidv4();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

  // Store reset token in Redis
  await redis.set(`reset:${resetToken}`, user.id, 'EX', 3600);

  try {
    // Send reset email using EmailService
    await EmailService.sendPasswordResetEmail(
      user.email,
      resetToken,
      `${user.firstName} ${user.lastName}`
    );
    
    return { 
      success: true, 
      message: 'Password reset link has been sent to your email.',
      // For development only - remove in production
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    };
  } catch (emailError) {
    console.error('Email sending failed:', emailError);
    // Still return success but log the error
    return { 
      success: true, 
      message: 'Reset token generated. Please check your email.',
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    };
  }
}

  static async resetPassword(token, newPassword) {
    // Verify reset token
    const userId = await redis.get(`reset:${token}`);
    if (!userId) {
      throw new Error('Invalid or expired reset token');
    }

    // Validate password strength
    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Update password - Sửa ở đây
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Sử dụng UserModel thay vì prisma trực tiếp
    await UserModel.updateUser(userId, { password: hashedPassword });

    // Delete used token
    await redis.del(`reset:${token}`);

    // Sử dụng prisma đã được import ở đầu file
    const userTokens = await prisma.refreshToken.findMany({
      where: { userId }
    });

    for (const token of userTokens) {
      await JWTService.blacklistToken(token.token, 7 * 24 * 60 * 60);
    }

    // Also delete from database
    await prisma.refreshToken.deleteMany({
      where: { userId }
    });

    return { 
      success: true, 
      message: 'Password has been reset successfully. You can now login with your new password.' 
    };
  }

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
    // Remove fields that shouldn't be updated
    const { email, password, role, isVerified, isActive, ...allowedUpdates } = updateData;
    
    return await UserModel.updateUser(userId, allowedUpdates);
  }

  static async changePassword(userId, currentPassword, newPassword) {
    const user = await UserModel.findUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValidPassword = await UserModel.comparePassword(currentPassword, user.password);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await UserModel.updateUser(userId, { password: hashedPassword });

    return { message: 'Password updated successfully' };
  }
  // Thêm phương thức update profile đầy đủ
  static async updateUserProfile(userId, updateData) {
    const prisma = require('../../prisma/client');
    
    // Validate phone number if provided
    if (updateData.phone) {
      if (updateData.phone.length < 10) {
        throw new Error('Phone number must be at least 10 digits');
      }
      
      // Check if phone is already used by another user
      const existingUser = await prisma.user.findFirst({
        where: {
          phone: updateData.phone,
          NOT: { id: userId }
        }
      });
      
      if (existingUser) {
        throw new Error('Phone number is already registered');
      }
    }

    // Remove fields that shouldn't be updated
    const { email, password, role, isVerified, isActive, ...allowedUpdates } = updateData;
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: allowedUpdates,
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
        isActive: true,
        updatedAt: true,
        // Include driver fields if they exist
        licenseNumber: true,
        vehicleType: true,
        vehicleNumber: true,
        rating: true,
        totalTrips: true,
        isAvailable: true
      }
    });

    return updatedUser;
  }
}

module.exports = AuthService;