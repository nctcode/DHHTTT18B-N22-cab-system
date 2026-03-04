const roleMiddleware = (req, res, next) => {
  const userId = req.headers["x-user-id"];
  const userRole = req.headers["x-user-role"];

  if (!userId || !userRole) {
    // Treat as anonymous/internal or handle as null
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
