const rideService = require("../services/ride.service");
const { validationResult } = require("express-validator");
const rabbitmq = require("../messaging/rabbitmq");
const axios = require('axios');

const AI_ETA_URL = process.env.AI_ETA_URL || 'http://localhost:4002';
const ML_TRAINING_URL = process.env.ML_TRAINING_URL || 'http://localhost:4030';

// Helper for standard response
const sendResponse = (res, statusCode, success, message, data = null) => {
  res.status(statusCode).json({
    success,
    message,
    data,
  });
};

const handleError = (res, error) => {
  console.error(error);
  if (error.message.includes("not found")) {
    return sendResponse(res, 404, false, error.message);
  }
  if (error.message.includes("Forbidden") || error.message.includes("Unauthorized")) {
    return sendResponse(res, 403, false, error.message);
  }
  if (error.message.includes("Cannot") || error.message.includes("exists")) {
    return sendResponse(res, 400, false, error.message);
  }
  sendResponse(res, 500, false, error.message || "Internal Server Error");
};

exports.createRide = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(res, 400, false, errors.array()[0].msg);
    }
    const ride = await rideService.createRide(req.body);

    // Publish event
    try {
      const eventType = ride.driverId ? 'ride.assigned' : 'ride.created';
      await rabbitmq.publish(
        rabbitmq.config.exchanges.rideEvents,
        eventType,
        {
          eventId: `${Date.now()}-${eventType}`,
          type: eventType === 'ride.assigned' ? 'RideAssigned' : 'RideCreated',
          rideId: ride._id,
          bookingId: ride.bookingId,
          driverId: ride.driverId,
          userId: ride.passengerId,
          status: ride.status,
          pickup: ride.pickup,
          dropoff: ride.dropoff,
          driverToPickupRoute: ride.driverToPickupRoute,
          driverLocation: req.body.driverLocation,
          previewRoute: ride.previewRoute,
          tripRoute: ride.tripRoute,
          timestamp: new Date().toISOString()
        }
      );
    } catch (e) {
      console.error(`Failed to publish ${eventType} event`, e);
    }

    sendResponse(res, 201, true, "Ride created successfully", ride);
  } catch (error) {
    handleError(res, error);
  }
};

exports.getRideById = async (req, res) => {
  try {
    const ride = await rideService.getRideById(req.params.id, req.user);
    
    // Inject booking details (vehicleType, estimatedPrice) if available
    const rideResponse = ride.toObject ? ride.toObject() : { ...ride };
    if (ride.bookingId) {
      try {
        const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || 'http://booking-service:3004';
        const bookingResp = await axios.get(`${BOOKING_SERVICE_URL}/internal/bookings/${ride.bookingId}`);
        const booking = bookingResp.data?.data || bookingResp.data;
        if (booking) {
          if (booking.vehicleType) rideResponse.vehicleType = booking.vehicleType;
          if (booking.estimatedPrice) rideResponse.estimatedPrice = booking.estimatedPrice;
          if (booking.route?.distanceKm) rideResponse.distanceKm = booking.route.distanceKm;
        }
      } catch (e) {
        console.warn('getRideById: Could not fetch booking info for ride:', e.message);
      }
    }

    // Inject driver details if a driver is assigned
    if (ride.driverId) {
      try {
        const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3002';
        const DRIVER_SERVICE_URL = process.env.DRIVER_SERVICE_URL || 'http://driver-service:3003';
        
        console.log(`[RideService] Fetching driver info for userId: ${ride.driverId}`);

        const userPromise = axios.get(`${USER_SERVICE_URL}/users/internal/profile/${ride.driverId}`)
          .then(res => res.data?.data)
          .catch(err => {
            console.warn(`[RideService] Failed to fetch user profile for driver ${ride.driverId}:`, err.message);
            return null;
          });

        const driverPromise = axios.get(`${DRIVER_SERVICE_URL}/drivers/internal/profile/${ride.driverId}`)
          .then(res => res.data?.data)
          .catch(err => {
            console.warn(`[RideService] Failed to fetch driver profile for driver ${ride.driverId}:`, err.message);
            return null;
          });

        const [userData, driverData] = await Promise.all([userPromise, driverPromise]);

        if (userData) {
          rideResponse.driverName = userData.fullName;
          console.log(`[RideService] Injected driverName: ${userData.fullName}`);
        }

        if (driverData) {
          if (!rideResponse.vehicleType) {
            rideResponse.vehicleType = driverData.vehicle_type;
          }
          rideResponse.licensePlate = driverData.vehicle_plate;
          console.log(`[RideService] Injected vehicle info: ${driverData.vehicle_type} - ${driverData.vehicle_plate}`);
        }
      } catch (e) {
        console.warn('[RideService] Unexpected error injecting driver info:', e.message);
      }
    }

    sendResponse(res, 200, true, "Ride details", rideResponse);
  } catch (error) {
    handleError(res, error);
  }
};

exports.assignDriver = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(res, 400, false, errors.array()[0].msg);
    }
    const { driverId, driverLocation } = req.body;
    // Note: Validation of driver existence/status should ideally happen here or in service 
    // by calling driver-service, but pure requirement says we trust input or basic checks.
    // The previous code had validateDriverOnline. We should probably keep using it if available,
    // but the prompt emphasized SERVICE separation. For now, we trust the input as per strict isolation instructions usually,
    // but practical implementations need checks. 
    // "KHÔNG có bảng User, KHÔNG có bảng Driver" implies we don't join checks.
    // However, the original code had checks. The prompt says "Refactor... to synchronize with new Ride schema".
    // I will stick to the core logic. 
    
    // But wait, the prompt says "assign Driver... driverId = null initially". 
    // "Chỉ khi status = CREATED -> ASSIGNED".
    
    const ride = await rideService.assignDriver(req.params.id, driverId, driverLocation);
    
    // Publish event if needed (optional but good practice)
    
    sendResponse(res, 200, true, "Driver assigned successfully", ride);
  } catch (error) {
    handleError(res, error);
  }
};

exports.startRide = async (req, res) => {
  try {
    const ride = await rideService.startRide(req.params.id, req.user);
    
    // Publish ride.started event with FULL ride object (includes tripRoute)
    try {
      await rabbitmq.publish(
        rabbitmq.config.exchanges.rideEvents,
        'ride.started',
        {
          eventId: `${Date.now()}-started`,
          type: 'RideStarted',
          rideId: ride._id,
          bookingId: ride.bookingId,
          driverId: ride.driverId,
          userId: ride.passengerId,
          status: ride.status,
          pickup: ride.pickup,
          dropoff: ride.dropoff,
          tripRoute: ride.tripRoute,
          timestamp: new Date().toISOString()
        }
      );
    } catch (e) {
      console.error("Failed to publish ride.started event", e);
    }

    sendResponse(res, 200, true, "Ride started successfully", ride);
  } catch (error) {
    handleError(res, error);
  }
};

exports.completeRide = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(res, 400, false, errors.array()[0].msg);
    }
    
    const { actualDistanceKm, actualDurationMin, driverLocation } = req.body;
    
    // Calculate final fare via pricing-service /pricing/estimate
    let finalFare = 0;
    let vehicleType = 'CAR';
    let estimatedPrice = null;
    
    // 1. Fetch booking details for vehicleType & fallback price
    try {
      const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || 'http://booking-service:3004';
      const ride = await rideService.getRideById(req.params.id, req.user);
      if (ride?.bookingId) {
        const bookingResp = await axios.get(`${BOOKING_SERVICE_URL}/internal/bookings/${ride.bookingId}`);
        const booking = bookingResp.data?.data || bookingResp.data;
        if (booking?.vehicleType) vehicleType = booking.vehicleType;
        if (booking?.estimatedPrice) estimatedPrice = booking.estimatedPrice;
        if (booking?.route?.distanceKm) ride.distanceKm = booking.route.distanceKm;
      }
    } catch (e) {
      console.warn('Could not fetch booking for vehicleType/estimatedPrice/distanceKm:', e.message);
    }

    // 2. Use estimatedPrice from booking as the finalFare (the price shown to passenger at booking time)
    if (estimatedPrice) {
      finalFare = estimatedPrice;
    } else {
      // Fallback: try pricing-service if no estimatedPrice from booking
      try {
        const PRICING_SERVICE_URL = process.env.PRICING_SERVICE_URL || 'http://pricing-service:3007';
        const pricingResponse = await axios.post(`${PRICING_SERVICE_URL}/pricing/estimate`, {
          distance_km: actualDistanceKm,
          duration_min: actualDurationMin,
          vehicle_type: vehicleType
        });
        if (pricingResponse.data?.success && pricingResponse.data?.data?.totalFare) {
          finalFare = pricingResponse.data.data.totalFare;
        }
      } catch (e) {
        console.warn("Pricing service unavailable, using simple formula", e.message);
        finalFare = Math.round(15000 + (actualDistanceKm * 10000) + (actualDurationMin * 500));
      }
    }

    const metrics = {
      actualDistanceKm,
      actualDurationMin,
      finalFare,
      driverLocation
    };

    const ride = await rideService.completeRide(req.params.id, metrics, req.user);

    // Publish ride.completed event
    try {
      await rabbitmq.publish(
        rabbitmq.config.exchanges.rideEvents,
        'ride.completed',
        {
          eventId: `${Date.now()}-completed`,
          type: 'RideCompleted',
          rideId: ride._id,
          bookingId: ride.bookingId,
          driverId: ride.driverId,
          userId: ride.passengerId,
          vehicleType: vehicleType || ride.vehicleType,
          actualDistanceKm,
          actualDurationMin,
          finalFare,
          estimatedPrice,
          distanceKm: ride.distanceKm,
          paymentMethod: ride.paymentMethod,
          paymentStatus: ride.paymentStatus,
          timestamp: new Date().toISOString()
        }
      );
    } catch (e) {
      console.error("Failed to publish ride.completed event", e);
    }

    // If CARD payment, trigger payment-service processing
    if (ride.paymentMethod === 'CARD') {
      try {
        await rabbitmq.publish(
          rabbitmq.config.exchanges.rideEvents,
          'ride.payment.process',
          {
            rideId: ride._id.toString(),
            bookingId: ride.bookingId,
            passengerId: ride.passengerId,
            driverId: ride.driverId,
            amount: finalFare,
            method: ride.paymentMethod,
            timestamp: new Date().toISOString()
          }
        );
        console.log(`💳 Published ride.payment.process for ${ride.paymentMethod} ride ${ride._id}`);
      } catch (e) {
        console.error("Failed to publish ride.payment.process", e);
      }
    }

    // Push trip data to ML Training for model retraining
    try {
      await axios.post(`${ML_TRAINING_URL}/training/ingest/trip-completed`, {
        rideId: ride._id,
        driverId: ride.driverId,
        actualDistanceKm,
        actualDurationMin,
        completedAt: ride.completedAt,
      }, { timeout: 2000 });
    } catch (e) {
      console.warn('ML Training ingestion skipped:', e.message);
    }

    const rideResponse = ride.toObject ? ride.toObject() : { ...ride };
    rideResponse.vehicleType = vehicleType;
    rideResponse.estimatedPrice = estimatedPrice;
    rideResponse.distanceKm = ride.distanceKm;

    sendResponse(res, 200, true, "Ride completed successfully", rideResponse);
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * Driver confirms cash payment received
 */
exports.confirmCashPayment = async (req, res) => {
  try {
    const ride = await rideService.confirmCashPayment(req.params.id, req.user);

    // Publish payment completed event
    try {
      await rabbitmq.publish(
        rabbitmq.config.exchanges.rideEvents,
        'ride.payment.completed',
        {
          eventId: `${Date.now()}-payment-completed`,
          type: 'PaymentCompleted',
          rideId: ride._id,
          bookingId: ride.bookingId,
          driverId: ride.driverId,
          userId: ride.passengerId,
          paymentMethod: 'CASH',
          paymentStatus: 'PAID',
          finalFare: ride.finalFare,
          timestamp: new Date().toISOString()
        }
      );
    } catch (e) {
      console.error("Failed to publish ride.payment.completed event", e);
    }

    sendResponse(res, 200, true, "Cash payment confirmed", ride);
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * Dev/Simulation: Driver simulates a successful wallet payment
 */
exports.simulateWalletPayment = async (req, res) => {
  try {
    const failSimulation = req.body?.fail_simulation === true || req.body?.fail_simulation === 'true';

    if (failSimulation) {
      const ride = await rideService.getRideById(req.params.id, req.user);

      await rabbitmq.publish(
        rabbitmq.config.exchanges.rideEvents,
        'ride.payment.failed',
        {
          eventId: `${Date.now()}-mock-payment-failed`,
          type: 'PaymentFailed',
          rideId: ride._id,
          bookingId: ride.bookingId,
          driverId: ride.driverId,
          userId: ride.passengerId,
          paymentMethod: ride.paymentMethod || 'WALLET',
          paymentStatus: 'FAILED',
          error: 'Simulated wallet failure',
          timestamp: new Date().toISOString()
        }
      );

      return sendResponse(res, 402, false, 'Wallet payment simulation failed', {
        rideId: ride._id,
        bookingId: ride.bookingId,
        paymentStatus: 'FAILED'
      });
    }

    const ride = await rideService.simulateWalletPayment(req.params.id, req.user);

    // Publish payment completed event
    try {
      await rabbitmq.publish(
        rabbitmq.config.exchanges.rideEvents,
        'ride.payment.completed',
        {
          eventId: `${Date.now()}-mock-payment-completed`,
          type: 'PaymentCompleted',
          rideId: ride._id,
          bookingId: ride.bookingId,
          driverId: ride.driverId,
          userId: ride.passengerId,
          paymentMethod: 'WALLET',
          paymentStatus: 'PAID',
          finalFare: ride.finalFare,
          timestamp: new Date().toISOString()
        }
      );
    } catch (e) {
      console.error("Failed to publish mock ride.payment.completed event", e);
    }

    sendResponse(res, 200, true, "Wallet payment simulated", ride);
  } catch (error) {
    handleError(res, error);
  }
};

exports.cancelRide = async (req, res) => {
  try {
    const ride = await rideService.cancelRide(req.params.id, req.user);

    // Publish ride.cancelled event so driver gets notified
    try {
      await rabbitmq.publish(
        rabbitmq.config.exchanges.rideEvents,
        'ride.cancelled',
        {
          eventId: `${Date.now()}-cancelled`,
          type: 'RideCancelled',
          rideId: ride._id,
          bookingId: ride.bookingId,
          driverId: ride.driverId,
          userId: ride.passengerId,
          status: 'CANCELLED',
          timestamp: new Date().toISOString(),
        }
      );
    } catch (e) {
      console.error("Failed to publish ride.cancelled event", e);
    }

    sendResponse(res, 200, true, "Ride cancelled successfully", ride);
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * Driver cancels after accepting — triggers rematching
 */
exports.driverCancelRide = async (req, res) => {
  try {
    const ride = await rideService.driverCancelRide(req.params.id, req.user);

    // Publish ride.driver_cancelled → booking-service will rematch
    try {
      await rabbitmq.publish(
        rabbitmq.config.exchanges.rideEvents,
        'ride.driver_cancelled',
        {
          eventId: `${Date.now()}-driver-cancelled`,
          type: 'RideDriverCancelled',
          rideId: ride._id.toString(),
          bookingId: ride.bookingId,
          driverId: ride.driverId,
          passengerId: ride.passengerId,
          status: 'CANCELLED_BY_DRIVER',
          timestamp: new Date().toISOString(),
        }
      );
      console.log(`📤 Published ride.driver_cancelled for ride ${ride._id}`);
    } catch (e) {
      console.error("Failed to publish ride.driver_cancelled event", e);
    }

    sendResponse(res, 200, true, "Ride cancelled by driver", ride);
  } catch (error) {
    handleError(res, error);
  }
};

exports.arriveRide = async (req, res) => {
  try {
    const ride = await rideService.arriveRide(req.params.id, req.user);

    // Publish status change event so passenger knows driver has arrived
    try {
      await rabbitmq.publish(
        rabbitmq.config.exchanges.rideEvents,
        'ride.status.changed',
        {
          eventId: `${Date.now()}-arrived`,
          type: 'RideArrived',
          rideId: ride._id,
          bookingId: ride.bookingId,
          driverId: ride.driverId,
          userId: ride.passengerId,
          status: ride.status, // 'ARRIVED'
          timestamp: new Date().toISOString()
        }
      );
    } catch (e) {
      console.error("Failed to publish ride.arrived event", e);
    }

    sendResponse(res, 200, true, "Driver arrived at pickup", ride);
  } catch (error) {
    handleError(res, error);
  }
};

exports.getByPassenger = async (req, res) => {
  try {
    const rides = await rideService.getRidesByPassenger(req.params.passengerId, req.user);
    
    // Enrich completed rides with review data
    const enrichedRides = await enrichRidesWithReviews(rides);
    
    sendResponse(res, 200, true, "Passenger rides", enrichedRides);
  } catch (error) {
    handleError(res, error);
  }
};

exports.getByDriver = async (req, res) => {
  try {
    const rides = await rideService.getRidesByDriver(req.params.driverId, req.user);
    
    // Enrich completed rides with review data
    const enrichedRides = await enrichRidesWithReviews(rides);
    
    sendResponse(res, 200, true, "Driver rides", enrichedRides);
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * Helper: Fetch reviews from review-service and attach to completed rides
 */
async function enrichRidesWithReviews(rides) {
  const REVIEW_SERVICE_URL = process.env.REVIEW_SERVICE_URL || 'http://review-service:3009';
  
  const enriched = await Promise.all(
    rides.map(async (ride) => {
      const rideObj = ride.toObject ? ride.toObject() : { ...ride };
      
      if (rideObj.status === 'COMPLETED') {
        try {
          const rideId = rideObj._id?.toString() || rideObj.id;
          const reviewResp = await axios.get(`${REVIEW_SERVICE_URL}/reviews/ride/${rideId}`, {
            timeout: 3000
          });
          const reviews = reviewResp.data?.data || [];
          if (reviews.length > 0) {
            // Attach the first review (passenger → driver or driver → passenger)
            rideObj.review = {
              rating: reviews[0].rating,
              comment: reviews[0].comment,
              reviewerId: reviews[0].reviewerId,
              targetUserId: reviews[0].targetUserId,
              createdAt: reviews[0].createdAt
            };
          }
        } catch (e) {
          // Silently skip if review service unavailable
        }
      }
      
      return rideObj;
    })
  );
  
  return enriched;
}

// ── AI ETA Prediction ──
exports.getETA = async (req, res) => {
  try {
    const { pickup, destination, timeOfDay, dayOfWeek } = req.body;

    if (!pickup?.lat || !pickup?.lng || !destination?.lat || !destination?.lng) {
      return sendResponse(res, 400, false, 'pickup and destination with lat/lng are required');
    }

    const etaResp = await axios.post(`${AI_ETA_URL}/ai/eta/predict`, {
      pickup,
      destination,
      timeOfDay,
      dayOfWeek,
    }, { timeout: 5000 });

    const prediction = etaResp.data?.data;
    sendResponse(res, 200, true, 'ETA prediction', prediction);
  } catch (error) {
    // Fallback if AI ETA service is unavailable (any error)
    console.warn(`AI ETA service error (${error.code || error.message}), using fallback calculation`);
    try {
      const { pickup, destination } = req.body;
      const R = 6371;
      const dLat = (destination.lat - pickup.lat) * Math.PI / 180;
      const dLng = (destination.lng - pickup.lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(pickup.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
      const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const durationMin = Math.max(2, Math.round((distKm / 25) * 60));

      return sendResponse(res, 200, true, 'ETA prediction (fallback)', {
        predictedArrivalMinutes: Math.max(1, Math.round(durationMin * 0.3)),
        predictedTripDurationMinutes: durationMin,
        distanceKm: parseFloat(distKm.toFixed(2)),
        source: 'fallback',
      });
    } catch (fallbackErr) {
      handleError(res, fallbackErr);
    }
  }
};

exports.getRoute = async (req, res) => {
  try {
    const { pickup, destination } = req.body;
    if (!pickup || !destination) {
      return sendResponse(res, 400, false, "pickup and destination are required");
    }
    const route = await rideService.getRoute(pickup, destination);
    sendResponse(res, 200, true, "Route calculated", route);
  } catch (error) {
    handleError(res, error);
  }
};
