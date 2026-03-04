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

exports.allowDriverOnly = (req, res, next) => {
  if (req.user.role !== 'DRIVER') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Driver access required'
    });
  }
  next();
};

exports.allowSelfDriverOrAdmin = async (req, res, next) => {
  // If Admin, allow
  if (req.user.role === 'ADMIN') {
    return next();
  }

  // If Driver, must be the owner of the resource
  // The resource ID in URL is usually the DRIVER ID (UUID), not USER ID.
  // We need to fetch the driver to check ownership, OR the controller handles it.
  // BUT, best practice for middleware: check if the requester claims to be the owner.
  // However, mapping DriverID -> UserID requires DB call.
  // Simpler approach:
  // If the route uses /drivers/:id, and :id is DRIVER_ID, we need to check if that driver belongs to req.user.id.
  
  // Since we want to avoid DB calls in middleware for performance if possible, 
  // but for security it's better.
  // Let's defer strict ownership check to the Service/Controller if it involves DB,
  // OR do it here.
  // The User requirement says: "Controller không được chứa logic role check trực tiếp."
  // So we should do it here or in a service method called by middleware?
  // Let's implement a simple check:
  // IF the URL param is `id` (driverId), we need to look it up.
  // IF the URL param is not present (e.g. create), we just check role.
  
  // Wait, if /drivers/:id, we need to know if req.user.id owns driver :id.
  // We'll import the Prisma client here to check.
  
  const driverId = req.params.id;
  if (!driverId) return next(); // Should not happen for :id routes

  if (req.user.role === 'DRIVER') {
     // We need to verify ownership.
     // But wait, to avoid circular dep or complex logic, 
     // maybe we just pass control and let Service check?
     // The requirement: "Không cho user khác update driver của người khác."
     // Let's do it in Service for atomic operation?
     // OR, we can just allow DRIVER role here, and Service checks `user_id`.
     // User request: "Controller không được chứa logic role check trực tiếp."
     // This implies MIDDLEWARE should handle "Is this user allowed to do X?"
     
     // Let's try to verify ownership here.
     try {
       const { PrismaClient } = require('@prisma/client');
       const prisma = new PrismaClient();
       const driver = await prisma.driver.findUnique({
         where: { id: driverId },
         select: { user_id: true }
       });
       
       if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
       
       if (driver.user_id !== req.user.id) {
         return res.status(403).json({ success: false, message: 'Forbidden: You can only access your own profile' });
       }
       
       return next();
     } catch (err) {
       console.error(err);
       return res.status(500).json({ success: false, message: 'Internal Server Error' });
     }
  }

  // If not Admin and not Driver (and didn't match above), reject
  return res.status(403).json({
    success: false,
    message: 'Forbidden'
  });
};
