const JWTService = require('../services/jwt.service');

const authMiddleware = {
  // Authenticate using JWT token
  authenticate: async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Access token is required'
        });
      }

      const token = authHeader.split(' ')[1];

      // Check if token is blacklisted
      const isBlacklisted = await JWTService.isTokenBlacklisted(token);
      if (isBlacklisted) {
        return res.status(401).json({
          success: false,
          message: 'Token has been revoked'
        });
      }

      // Verify token
      const decoded = JWTService.verifyAccessToken(token);
      if (!decoded) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }

      // Attach user info to request
      req.user = decoded;
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(401).json({
        success: false,
        message: 'Authentication failed'
      });
    }
  },

  // Role-based authorization
  authorize: (...roles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      next();
    };
  },

  // Optional authentication (for public endpoints)
  optionalAuth: async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        
        const isBlacklisted = await JWTService.isTokenBlacklisted(token);
        if (!isBlacklisted) {
          const decoded = JWTService.verifyAccessToken(token);
          if (decoded) {
            req.user = decoded;
          }
        }
      }
      
      next();
    } catch (error) {
      // Continue without authentication
      next();
    }
  }
};

module.exports = authMiddleware;