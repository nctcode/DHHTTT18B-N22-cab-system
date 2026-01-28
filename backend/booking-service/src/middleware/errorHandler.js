// src/middleware/errorHandler.js
const logger = require('../utils/logger');
const constants = require('../config/constants');

class ErrorHandler {
  static handleError(err, req, res, next) {
    logger.error('Error:', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    
    // Mongoose validation error
    if (err.name === 'ValidationError') {
      return res.status(constants.HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Validation Error',
        details: Object.values(err.errors).map(e => e.message)
      });
    }
    
    // Mongoose duplicate key error
    if (err.code === 11000) {
      return res.status(constants.HTTP_STATUS.CONFLICT).json({
        success: false,
        error: 'Duplicate Key Error',
        message: 'A record with this data already exists'
      });
    }
    
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
      return res.status(constants.HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Invalid Token'
      });
    }
    
    if (err.name === 'TokenExpiredError') {
      return res.status(constants.HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Token Expired'
      });
    }
    
    // Custom error with status code
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        error: err.message
      });
    }
    
    // Default error
    res.status(constants.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: process.env.NODE_ENV === 'production' 
        ? 'Internal Server Error' 
        : err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }
  
  static asyncWrapper(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
  
  static notFound(req, res, next) {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    error.statusCode = constants.HTTP_STATUS.NOT_FOUND;
    next(error);
  }
}

module.exports = ErrorHandler;