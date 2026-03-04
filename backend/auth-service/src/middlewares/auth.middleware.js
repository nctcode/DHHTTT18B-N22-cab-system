// Authentication middleware - Trusts API Gateway headers
module.exports = (req, res, next) => {
  // Gateway injects x-user-id and x-user-role
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
    userId: userId,
    role: userRole || 'PASSENGER'
  };

  next();
};
