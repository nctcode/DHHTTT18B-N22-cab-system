const jwt = require('jsonwebtoken');
const axios = require('axios');
const logger = require('../utils/logger');

class AuthMiddleware {
  async verifyToken(req, res, next) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'No token provided'
        });
      }
      
      // Verify JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Validate with auth service (optional - for distributed validation)
      if (process.env.AUTH_SERVICE_URL) {
        try {
          await axios.get(`${process.env.AUTH_SERVICE_URL}/api/v1/auth/validate`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (error) {
          logger.warn('Auth service validation failed, using local validation');
        }
      }
      
      req.user = {
        id: decoded.userId,
        type: decoded.userType,
        role: decoded.role,
        permissions: decoded.permissions
      };
      
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired'
        });
      }
    
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
  }

  verifyDriverToken(req, res, next) {
    this.verifyToken(req, res, (err) => {
      if (err) return next(err);
      
      if (req.user.type !== 'driver') {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Driver role required'
        });
      }
      
      next();
    });
  }

  verifyPassengerToken(req, res, next) {
    this.verifyToken(req, res, (err) => {
      if (err) return next(err);
      
      if (req.user.type !== 'passenger') {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Passenger role required'
        });
      }
      
      next();
    });
  }

  verifyAdminToken(req, res, next) {
    this.verifyToken(req, res, (err) => {
      if (err) return next(err);
      
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Admin role required'
        });
      }
      
      next();
    });
  }

  verifyServiceToken(req, res, next) {
    const serviceToken = req.headers['x-service-token'];
    
    if (!serviceToken || serviceToken !== process.env.SERVICE_SECRET) {
      return res.status(403).json({
        success: false,
        error: 'Invalid service token'
      });
    }
    
    next();
  }

  // Rate limiting middleware (enhanced)
  rateLimitByUser(req, res, next) {
    const userId = req.user?.id || req.ip;
    const key = `rate_limit:${userId}`;
    
    // Implement Redis-based rate limiting
    // This is a simplified version
    req.rateLimit = {
      key,
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100
    };
    
    next();
  }
}

module.exports = new AuthMiddleware();