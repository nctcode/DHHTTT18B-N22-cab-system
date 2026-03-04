const roleMiddleware = (req, res, next) => {
  const userId = req.headers["x-user-id"];
  const userRole = req.headers["x-user-role"];

  if (!userId || !userRole) {
    // We trust the gateway, but if headers are missing, we treat as anonymous/unauthorized for operations requiring auth
    // Or we can just proceed with nulls and let the service handle it
    req.user = null;
  } else {
    req.user = {
      id: userId,
      role: userRole.toUpperCase(),
    };
  }
  next();
};

module.exports = roleMiddleware;
