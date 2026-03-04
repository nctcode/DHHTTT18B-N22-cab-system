// src/middlewares/abac.middleware.js
/**
 * Attribute-Based Access Control (ABAC) Middleware
 * Evaluates access based on user attributes, resource attributes, and environmental context
 */

/**
 * ABAC Policy evaluation
 * Checks if user has permission based on context
 */
const checkPermission = (policy) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required for this action'
        });
      }

      // Evaluate policy based on type
      const { type, evaluate } = policy;

      // Custom evaluation function
      if (evaluate) {
        const result = await evaluate(req, user);
        
        if (!result.allowed) {
          return res.status(403).json({
            success: false,
            message: result.reason || 'Access denied',
            code: 'ABAC_DENIED'
          });
        }
        
        // Store evaluation result in request
        req.abac = result;
        return next();
      }

      // Default: allow if no specific policy
      next();
      
    } catch (error) {
      console.error('[ABAC] Policy evaluation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Access control evaluation failed'
      });
    }
  };
};

/**
 * Policy: Driver can only update GPS location during active ride
 */
const driverLocationUpdatePolicy = {
  type: 'DRIVER_LOCATION_UPDATE',
  evaluate: async (req, user) => {
    // Check if user is a driver
    if (user.role !== 'DRIVER') {
      return {
        allowed: false,
        reason: 'Only drivers can update GPS location'
      };
    }

    // Check if driver has an active ride
    // This would typically call a service to check ride status
    const hasActiveRide = req.user.currentRideId || req.body.rideId;

    if (!hasActiveRide) {
      return {
        allowed: false,
        reason: 'Driver can only update location during an active ride'
      };
    }

    // Check business hours (optional)
    const currentHour = new Date().getHours();
    if (currentHour < 5 || currentHour > 23) {
      // Still allow but log suspicious activity
      console.warn(`[ABAC] Location update outside business hours: ${user.id}`);
    }

    return {
      allowed: true,
      context: {
        rideId: hasActiveRide,
        timestamp: new Date().toISOString()
      }
    };
  }
};

/**
 * Policy: Only ride participants can access ride details
 */
const rideAccessPolicy = {
  type: 'RIDE_ACCESS',
  evaluate: async (req, user) => {
    const rideId = req.params.rideId || req.body.rideId;
    
    if (!rideId) {
      return { allowed: false, reason: 'Ride ID required' };
    }

    // In production, fetch ride from database to check participants
    // For now, simplified check
    
    // Admin can access all rides
    if (user.role === 'ADMIN') {
      return { allowed: true, context: { adminAccess: true } };
    }

    // Check if user is customer or driver of this ride
    // This would typically call ride service
    // Simplified: assume req contains ride info
    const ride = req.ride; // Should be populated by previous middleware

    if (!ride) {
      return { allowed: false, reason: 'Ride not found' };
    }

    const isParticipant = 
      ride.customerId === user.id || 
      ride.driverId === user.id;

    if (!isParticipant) {
      return { 
        allowed: false, 
        reason: 'You are not a participant of this ride' 
      };
    }

    return { allowed: true };
  }
};

/**
 * Policy: Payment operations only allowed for ride owner
 */
const paymentOperationPolicy = {
  type: 'PAYMENT_OPERATION',
  evaluate: async (req, user) => {
    const { rideId } = req.body;

    if (!rideId) {
      return { allowed: false, reason: 'Ride ID required for payment' };
    }

    // Admins can process any payment
    if (user.role === 'ADMIN') {
      return { allowed: true, context: { adminAccess: true } };
    }

    // Payment can only be made by customer
    if (user.role !== 'CUSTOMER') {
      return { 
        allowed: false, 
        reason: 'Only customers can make payments' 
      };
    }

    // Check if user owns the ride (should fetch from ride service)
    // Simplified check
    const ride = req.ride;
    
    if (!ride || ride.customerId !== user.id) {
      return {
        allowed: false,
        reason: 'You can only pay for your own rides'
      };
    }

    // Check if payment is within time limit (e.g., within 24 hours of ride completion)
    if (ride.status === 'COMPLETED') {
      const rideEndTime = new Date(ride.completedAt);
      const now = new Date();
      const hoursSinceCompletion = (now - rideEndTime) / (1000 * 60 * 60);

      if (hoursSinceCompletion > 24) {
        return {
          allowed: false,
          reason: 'Payment period expired (24 hours after ride completion)'
        };
      }
    }

    return { allowed: true };
  }
};

/**
 * Policy: Review can only be created after ride completion
 */
const reviewCreationPolicy = {
  type: 'REVIEW_CREATION',
  evaluate: async (req, user) => {
    const { rideId } = req.body;

    if (!rideId) {
      return { allowed: false, reason: 'Ride ID required' };
    }

    const ride = req.ride;

    if (!ride) {
      return { allowed: false, reason: 'Ride not found' };
    }

    // Only customers can review
    if (user.role !== 'CUSTOMER') {
      return {
        allowed: false,
        reason: 'Only customers can create reviews'
      };
    }

    // Check if user is the customer of this ride
    if (ride.customerId !== user.id) {
      return {
        allowed: false,
        reason: 'You can only review your own rides'
      };
    }

    // Ride must be completed
    if (ride.status !== 'COMPLETED') {
      return {
        allowed: false,
        reason: 'Reviews can only be created for completed rides'
      };
    }

    // Check if review already exists
    if (ride.hasReview) {
      return {
        allowed: false,
        reason: 'Review already exists for this ride'
      };
    }

    return { allowed: true };
  }
};

/**
 * Time-based access control
 */
const timeBasedPolicy = (allowedHours) => {
  return {
    type: 'TIME_BASED',
    evaluate: async (req, user) => {
      const currentHour = new Date().getHours();
      
      if (currentHour < allowedHours.start || currentHour >= allowedHours.end) {
        return {
          allowed: false,
          reason: `This operation is only allowed between ${allowedHours.start}:00 and ${allowedHours.end}:00`
        };
      }

      return { allowed: true };
    }
  };
};

/**
 * Location-based access control
 */
const locationBasedPolicy = (allowedLocations) => {
  return {
    type: 'LOCATION_BASED',
    evaluate: async (req, user) => {
      const userLocation = req.body.location || req.query.location;

      if (!userLocation) {
        return { allowed: true }; // If no location provided, allow
      }

      // Check if user location is within allowed areas
      // This is a simplified example
      const isInAllowedLocation = allowedLocations.some(loc => 
        Math.abs(userLocation.lat - loc.lat) < 0.1 && 
        Math.abs(userLocation.lng - loc.lng) < 0.1
      );

      if (!isInAllowedLocation) {
        return {
          allowed: false,
          reason: 'This operation is not allowed in your current location'
        };
      }

      return { allowed: true };
    }
  };
};

module.exports = {
  checkPermission,
  driverLocationUpdatePolicy,
  rideAccessPolicy,
  paymentOperationPolicy,
  reviewCreationPolicy,
  timeBasedPolicy,
  locationBasedPolicy
};
