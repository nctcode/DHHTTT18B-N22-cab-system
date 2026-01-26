const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");
const axios = require("axios");

/**
 * Middleware to validate JWT token
 * In a real microservice architecture, this would call Auth Service
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Access token is required",
      });
    }

    // In a real implementation, this would call Auth Service
    // For simplicity, we'll decode the token locally
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Add user info to request
      req.user = {
        id: decoded.userId || decoded.sub,
        role: decoded.role || "USER",
        email: decoded.email,
      };

      // Also set headers for internal service communication
      req.headers["x-user-id"] = req.user.id;
      req.headers["x-user-role"] = req.user.role;

      logger.debug(
        `Authenticated user: ${req.user.id}, role: ${req.user.role}`,
      );
      next();
    } catch (error) {
      logger.error("Token verification failed:", error);
      return res.status(403).json({
        success: false,
        error: "Invalid or expired token",
      });
    }
  } catch (error) {
    logger.error("Authentication error:", error);
    res.status(500).json({
      success: false,
      error: "Internal authentication error",
    });
  }
};

/**
 * Middleware to check user roles
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(
        `Unauthorized access attempt by user: ${req.user.id}, role: ${req.user.role}`,
      );
      return res.status(403).json({
        success: false,
        error: "You do not have permission to perform this action",
      });
    }

    next();
  };
};

/**
 * Rate limiting middleware
 */
const rateLimiter = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
  const requests = new Map();

  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    for (const [key, timestamps] of requests.entries()) {
      const validTimestamps = timestamps.filter((time) => time > windowStart);
      if (validTimestamps.length === 0) {
        requests.delete(key);
      } else {
        requests.set(key, validTimestamps);
      }
    }

    // Check current IP
    const userRequests = requests.get(ip) || [];
    const recentRequests = userRequests.filter((time) => time > windowStart);

    if (recentRequests.length >= maxRequests) {
      logger.warn(`Rate limit exceeded for IP: ${ip}`);
      return res.status(429).json({
        success: false,
        error: "Too many requests, please try again later",
      });
    }

    // Add current request
    recentRequests.push(now);
    requests.set(ip, recentRequests);

    // Add headers
    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", maxRequests - recentRequests.length);
    res.setHeader(
      "X-RateLimit-Reset",
      new Date(windowStart + windowMs).toISOString(),
    );

    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  rateLimiter,
};
