const jwt = require('jsonwebtoken');
const { redis } = require('../utils/redis');

class JWTService {
  static generateAccessToken(user) {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_ACCESS_SECRET || 'your_access_secret',
      { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
    );
  }

  static generateRefreshToken(user) {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email
      },
      process.env.JWT_REFRESH_SECRET || 'your_refresh_secret',
      { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
    );
  }

  static verifyAccessToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'your_access_secret');
    } catch (error) {
      return null;
    }
  }

  static verifyRefreshToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'your_refresh_secret');
    } catch (error) {
      return null;
    }
  }

  static async blacklistToken(token, expiry) {
    try {
      await redis.set(`blacklist:${token}`, '1', 'EX', expiry);
    } catch (error) {
      console.error('Redis blacklist error:', error);
    }
  }

  static async isTokenBlacklisted(token) {
    try {
      return await redis.exists(`blacklist:${token}`);
    } catch (error) {
      console.error('Redis check error:', error);
      return false;
    }
  }

  static async storeRefreshToken(token, userId, expiresAt) {
    try {
      const key = `refresh:${userId}:${token}`;
      const ttl = Math.floor((new Date(expiresAt) - new Date()) / 1000);
      await redis.set(key, '1', 'EX', ttl);
    } catch (error) {
      console.error('Redis store refresh token error:', error);
    }
  }

  static async revokeRefreshToken(token, userId) {
    try {
      await redis.del(`refresh:${userId}:${token}`);
    } catch (error) {
      console.error('Redis revoke error:', error);
    }
  }

  static async isValidRefreshToken(token, userId) {
    try {
      return await redis.exists(`refresh:${userId}:${token}`);
    } catch (error) {
      console.error('Redis check refresh error:', error);
      return false;
    }
  }
}

module.exports = JWTService;