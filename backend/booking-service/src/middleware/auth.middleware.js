// src/middleware/auth.middleware.js

/**
 * Middleware to trust and extract headers injected by API Gateway.
 * JWT verification is handled by the Gateway.
 * This service expects 'x-user-id' and 'x-user-role' headers.
 */
const authenticateToken = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];

  if (!userId) {
    // If not in production, allow a fallback for local testing without Gateway (optional)
    if (process.env.NODE_ENV === 'development') {
       console.warn('⚠️ Missing x-user-id header. Using dev fallback.');
       req.user = { id: 'dev-user-id', role: 'PASSENGER' };
       return next();
    }

    return res.status(401).json({
      success: false,
      message: 'Authentication required (Gateway headers missing)'
    });
  }

  req.user = {
    id: userId,
    role: userRole || 'PASSENGER'
  };

  next();
};

module.exports = {
  authenticateToken
};