const rateLimit = require('express-rate-limit');
const config = require('../config/app.config');

/**
 * General rate limiter
 */
const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: config.rateLimit.message,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for auth endpoints
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
});

/**
 * Rate limiter for payment endpoints
 */
const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each IP to 20 payment requests per hour
  message: 'Too many payment requests, please try again later.',
});

/**
 * Rate limiter for ride requests
 */
const rideLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit each IP to 10 ride requests per 5 minutes
  message: 'Too many ride requests, please try again later.',
});

/**
 * Custom rate limiter based on user ID
 */
const userBasedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise use IP
    return req.user?.id || req.ip;
  },
  message: 'Rate limit exceeded for your account.',
});

module.exports = {
  generalLimiter,
  authLimiter,
  paymentLimiter,
  rideLimiter,
  userBasedLimiter,
};
