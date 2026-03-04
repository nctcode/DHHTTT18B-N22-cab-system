/**
 * Role-based Authorization Middleware
 */

exports.allowAdminOnly = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Admin access required'
    });
  }
  next();
};

exports.allowSelfOrAdmin = (req, res, next) => {
  const requestUserId = req.params.id; // User ID from URL param
  const authenticatedUserId = req.user.id;
  const role = req.user.role;

  if (role === 'ADMIN' || requestUserId === authenticatedUserId) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Forbidden: You can only access your own resources'
  });
};
