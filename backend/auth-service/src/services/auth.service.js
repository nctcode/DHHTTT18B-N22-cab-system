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

    // Create new user
    const user = await UserModel.createUser(userData);

    // Generate tokens
    const accessToken = JWTService.generateAccessToken(user);
    const refreshToken = JWTService.generateRefreshToken(user);

    // Store refresh token in database and Redis
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

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
      // Don't reveal that user doesn't exist
      return { message: 'If an account exists, a reset link will be sent' };
    }

    // Generate reset token
    const resetToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    // Store reset token in Redis
    await redis.set(`reset:${resetToken}`, user.id, 'EX', 3600);

    // TODO: Send email with reset link
    // This would integrate with your email service

    return { message: 'Password reset link sent' };
  }

  static async resetPassword(token, newPassword) {
    // Verify reset token
    const userId = await redis.get(`reset:${token}`);
    if (!userId) {
      throw new Error('Invalid or expired reset token');
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await UserModel.updateUser(userId, { password: hashedPassword });

    // Delete used token
    await redis.del(`reset:${token}`);

    // Blacklist all user's refresh tokens
    const userTokens = await prisma.refreshToken.findMany({
      where: { userId }
    });

    for (const token of userTokens) {
      await JWTService.blacklistToken(token.token, 7 * 24 * 60 * 60);
    }

    return { message: 'Password reset successfully' };
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
}

module.exports = AuthService;