// src/middlewares/tokenRevocation.middleware.js
const tokenService = require('../services/token.service');

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

    // Check if token is blacklisted
    const isBlacklisted = await tokenService.isTokenBlacklisted(token, 'access');
    
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: 'Token has been revoked. Please login again.',
        code: 'TOKEN_REVOKED'
      });
    }

    next();
  } catch (error) {
    console.error('Token revocation check error:', error);
    // Don't block request if Redis is down
    next();
  }
};

module.exports = {
  checkTokenRevocation
};
