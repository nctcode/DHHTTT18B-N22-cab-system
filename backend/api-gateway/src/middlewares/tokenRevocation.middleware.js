// src/middlewares/tokenRevocation.middleware.js
/**
 * Token Revocation Middleware for API Gateway
 * Checks if token is blacklisted before allowing access
 */

const { createClient } = require('redis');

let redisClient = null;

// Initialize Redis client
const initRedis = async () => {
  if (!redisClient) {
    redisClient = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'redis',
        port: process.env.REDIS_PORT || 6379
      }
    });

    redisClient.on('error', (err) => console.error('Redis Token Revocation Error:', err));
    
    await redisClient.connect();
    console.log('✅ API Gateway Token Revocation Redis connected');
  }
  return redisClient;
};

/**
 * Check if access token is blacklisted
 */
const checkTokenRevocation = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    // Initialize Redis if not already connected
    if (!redisClient) {
      await initRedis();
    }

    // Decode token to get user ID (without verification, just for blacklist check)
    const jwt = require('jsonwebtoken');
    let userId;
    
    try {
      const decoded = jwt.decode(token);
      userId = decoded?.id;
    } catch (error) {
      // If token can't be decoded, let auth middleware handle it
      return next();
    }

    if (!userId) {
      return next();
    }

    // Check blacklist pattern
    const blacklistKey = `blacklist:access:${userId}:${token.substring(0, 20)}`;
    const isBlacklisted = await redisClient.exists(blacklistKey);
    
    if (isBlacklisted) {
      console.warn(`🚫 [TOKEN REVOKED] User ${userId} attempted to use revoked token`);
      
      return res.status(401).json({
        success: false,
        message: 'Token has been revoked. Please login again.',
        code: 'TOKEN_REVOKED'
      });
    }

    next();
  } catch (error) {
    console.error('[TOKEN REVOCATION] Check error:', error);
    // Don't block request if Redis is down - fail open for availability
    // In production, you might want to fail closed instead
    next();
  }
};

module.exports = {
  checkTokenRevocation,
  initRedis
};
