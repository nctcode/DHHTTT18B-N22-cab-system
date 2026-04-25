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
    // Skip revocation check for auth endpoints that must always be accessible
    const exemptPaths = ['/api/auth/logout', '/api/auth/login', '/api/auth/register', '/api/auth/refresh'];
    if (exemptPaths.some(path => req.path === path || req.originalUrl === path)) {
      return next();
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    // Initialize Redis if not already connected
    if (!redisClient) {
      await initRedis();
    }

    // Use hash of the full token as the blacklist key
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const blacklistKey = `blacklist:access:${tokenHash}`;
    const isBlacklisted = await redisClient.exists(blacklistKey);
    
    if (isBlacklisted) {
      console.warn(`🚫 [TOKEN REVOKED] Attempted to use revoked token (hash: ${tokenHash.substring(0, 8)}...)`);
      
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
    next();
  }
};

module.exports = {
  checkTokenRevocation,
  initRedis
};
