const jwt = require('jsonwebtoken');
const axios = require('axios');
const config = require('../config/app.config');
const services = require('../config/services.config');

/**
 * Verify JWT token middleware
 */
const verifyToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Attach user info to request
    req.user = {
        id: decoded.sub || decoded.userId, // Support both sub and userId
        userId: decoded.sub || decoded.userId,
        email: decoded.email,
        role: decoded.role || 'PASSENGER'
    };

    // Inject headers for downstream services
    req.headers['x-user-id'] = req.user.id;
    req.headers['x-user-role'] = req.user.role;

    // Remove Authorization header to prevent downstream services from verifying JWT
    delete req.headers['authorization'];
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.',
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Token verification failed.',
      error: error.message,
    });
  }
};

/**
 * Check if user has required role (case-insensitive)
 */
const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const userRole = (req.user.role || '').toLowerCase();
    const allowedRoles = roles.map(r => r.toLowerCase());
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
      });
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, config.jwt.secret);
      req.user = decoded;
    }
  } catch (error) {
    // Ignore errors in optional auth
  }
  
  next();
};

/**
 * Verify token with auth service
 */
const verifyWithAuthService = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    // Call auth service to verify token
    const response = await axios.post(
      `${services.auth.url}${services.auth.endpoints.verify}`,
      {},
      {
        headers: {
          Authorization: authHeader,
        },
      }
    );

    if (response.data.success) {
      req.user = response.data.user;
      next();
    } else {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
    }
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token verification failed.',
      error: error.response?.data?.message || error.message,
    });
  }
};

module.exports = {
  verifyToken,
  checkRole,
  optionalAuth,
  verifyWithAuthService,
};
