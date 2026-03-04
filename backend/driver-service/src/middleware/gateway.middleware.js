/**
 * Gateway Authentication Middleware
 *Trusts headers injected by API Gateway
 */
exports.gatewayAuth = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Missing identity headers'
    });
  }

  req.user = {
    id: userId,
    role: userRole || 'PASSENGER'
  };

  next();
};
