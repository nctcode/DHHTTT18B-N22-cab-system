// src/controllers/refreshToken.controller.js
const tokenService = require('../services/token.service');

/**
 * Refresh access token using refresh token
 */
exports.refresh = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    const refreshToken = authHeader.substring(7);

    // Rotate refresh token (invalidate old, create new pair)
    // This internally verifies the token against the DB
    const tokens = await tokenService.rotateRefreshToken(refreshToken);

    return res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: tokens
    });

  } catch (error) {
    console.error('Refresh token error:', error.message);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token expired. Please login again.'
      });
    }

    if (error.name === 'JsonWebTokenError' || error.message.includes('not found') || error.message.includes('expired')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to refresh token',
      error: error.message
    });
  }
};

/**
 * Revoke a specific token
 */
exports.revoke = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    // We only support revoking refresh tokens by deleting them
    await tokenService.revokeToken(token);

    return res.json({
      success: true,
      message: 'Token revoked successfully'
    });

  } catch (error) {
    console.error('Revoke token error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to revoke token',
      error: error.message
    });
  }
};

/**
 * Logout - revoke current refresh token and blacklist access token
 */
exports.logout = async (req, res) => {
  try {
    // Access token: forwarded by API Gateway as x-access-token header
    // (because the proxy overwrites Authorization with the refresh token)
    const accessToken = req.headers['x-access-token'] || null;
    
    // Refresh token: from body or from Authorization header (set by proxy)
    const authHeader = req.headers.authorization;
    const refreshToken = req.body?.refreshToken || 
      (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null);

    // 1. Revoke the refresh token
    if (refreshToken) {
      try {
        await tokenService.revokeToken(refreshToken);
      } catch (err) {
        // Ignore errors if refresh token already revoked or not found
        console.warn('Refresh token revocation skipped:', err.message);
      }
    }

    // 2. Blacklist the access token
    if (accessToken) {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(accessToken);
      if (decoded && (decoded.userId || decoded.sub)) {
        const userId = decoded.userId || decoded.sub;
        await tokenService.blacklistToken(accessToken, userId, 'access');
        console.log(`🚫 Access token blacklisted for user ${userId}`);
      }
    }

    return res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  }
};

/**
 * Logout from all devices - revoke all user tokens
 */
exports.logoutAll = async (req, res) => {
  try {
    // Get user ID from verified token (middleware sets req.user.id mapped from sub)
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const revokedCount = await tokenService.revokeAllUserTokens(userId);

    return res.json({
      success: true,
      message: `Logged out from ${revokedCount} device(s) successfully`
    });

  } catch (error) {
    console.error('Logout all error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to logout from all devices',
      error: error.message
    });
  }
};

module.exports = exports;
