const Ride = require("../models/ride.model");

class RideService {
  /**
   * Check if user is authorized to view/act on the ride
   * @param {Object} ride
   * @param {Object} user { id, role }
   * @param {string} action 'VIEW' | 'CANCEL' | 'START' | 'COMPLETE'
   */
  async checkAccess(ride, user, action) {
    if (!user) throw new Error("Unauthorized");
    const { id, role } = user;

    if (role === "ADMIN") return true;

    const isPassenger = ride.passengerId === id;
    const isDriver = ride.driverId === id;

    if (action === "VIEW") {
      if (isPassenger || isDriver) return true;
    }

    if (action === "CANCEL") {
      // PASSENGER can cancel if CREATED or ASSIGNED (subject to policy, but here we just check access)
      // DRIVER can cancel? Usually no, they reject. But if assigned, maybe.
      // Requirement says: PASSENGER only when CREATED (actually business rule).
      // Let's stick to: Owner or Assigned Driver can try to cancel.
      if (isPassenger || isDriver) return true;
    }

    if (action === "START") {
      if (isDriver) return true;
    }

    if (action === "COMPLETE") {
      if (isDriver) return true;
    }

    throw new Error("Forbidden: You do not have permission to perform this action");
  }

  async createRide(data) {
    // No role check here, usually internal call or from booking service
    // But if exposed to gateway, anyone authenticated can try provided they have valid bookingId
    // For now, we trust the input.
    const exists = await Ride.findOne({ bookingId: data.bookingId });
    if (exists) {
      // Rematching: if previous ride was cancelled by driver, reassign to new driver
      if (exists.status === 'CANCELLED_BY_DRIVER') {
        console.log(`[Ride] Reassigning cancelled ride ${exists._id} to new driver ${data.driverId}`);
        exists.driverId = data.driverId || null;
        exists.status = data.driverId ? 'ASSIGNED' : 'CREATED';
        exists.assignedAt = data.driverId ? new Date() : null;
        exists.cancelledAt = null;
        exists.driverToPickupRoute = null;

        // Recalculate driver-to-pickup route for the new driver
        if (data.driverId && data.driverLocation && data.driverLocation.lat && data.driverLocation.lng) {
          try {
            // Check if we need to fetch booking details for locations if missing
            if (!exists.pickup || !exists.pickup.lat) {
               const axios = require('axios');
               const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || 'http://booking-service:3004';
               const bookingResp = await axios.get(`${BOOKING_SERVICE_URL}/internal/bookings/${data.bookingId}`);
               const booking = bookingResp.data?.data || bookingResp.data;
               if (booking && booking.pickup && booking.pickup.lat) exists.pickup = booking.pickup;
               if (booking && booking.dropoff && booking.dropoff.lat) exists.dropoff = booking.dropoff;
               if (booking && booking.paymentMethod) exists.paymentMethod = booking.paymentMethod;
            }

            if (exists.pickup && exists.pickup.lat) {
              const route = await this.getRoute(
                { lat: data.driverLocation.lat, lng: data.driverLocation.lng },
                { lat: exists.pickup.lat, lng: exists.pickup.lng }
              );
              exists.driverToPickupRoute = route;
            }
          } catch (err) {
            console.error('Failed to recalculate driverToPickupRoute during reassign:', err.message);
          }
        }

        return await exists.save();
      }
      throw new Error("Ride already exists for this booking");
    }

    const ride = new Ride({
      bookingId: data.bookingId,
      passengerId: data.passengerId,
      driverId: data.driverId || null,
      status: data.driverId ? "ASSIGNED" : "CREATED",
      previewRoute: data.route, // Stage 1: Preview Route from Booking
      
      // Store locations
      pickup: data.pickup,
      dropoff: data.dropoff,
      
      // Payment info from booking
      paymentMethod: data.paymentMethod || 'CASH',
      
      assignedAt: data.driverId ? new Date() : null,
      createdAt: new Date(),
    });

    // Stage 2: Calculate Driver to Pickup Route (if driver is accepting immediately)
    if (data.driverId && data.driverLocation && data.driverLocation.lat && data.driverLocation.lng) {
        try {
            const axios = require('axios');
            const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || 'http://booking-service:3004';
            const bookingResp = await axios.get(`${BOOKING_SERVICE_URL}/internal/bookings/${data.bookingId}`);
            const booking = bookingResp.data?.data || bookingResp.data;
            
            if (booking) {
                // Persist locations if missing
                if ((!ride.pickup || !ride.pickup.lat) && booking.pickup) {
                    ride.pickup = booking.pickup;
                }
                if ((!ride.dropoff || !ride.dropoff.lat) && booking.dropoff) {
                    ride.dropoff = booking.dropoff;
                }
                if (booking.paymentMethod) {
                    ride.paymentMethod = booking.paymentMethod;
                }

                if (ride.pickup && ride.pickup.lat) {
                    const route = await this.getRoute(
                        { lat: data.driverLocation.lat, lng: data.driverLocation.lng },
                        { lat: booking.pickup.lat, lng: booking.pickup.lng }
                    );
                    ride.driverToPickupRoute = route;
                }
            }
        } catch (err) {
             console.error('Failed to calculate driverToPickupRoute in createRide:', err.message);
        }
    }

    return await ride.save();
  }

  async getRideById(id, user) {
    const ride = await Ride.findById(id);
    if (!ride) throw new Error("Ride not found");

    await this.checkAccess(ride, user, "VIEW");
    return ride;
  }

  async getRidesByPassenger(passengerId, user) {
    // Access check: User must be the passenger or ADMIN
    if (user.role !== "ADMIN" && user.id !== passengerId) {
      throw new Error("Forbidden: Can only view your own rides");
    }
    return await Ride.find({ passengerId }).sort({ createdAt: -1 });
  }

  async getRidesByDriver(driverId, user) {
    // Access check: User must be the driver or ADMIN
    if (user.role !== "ADMIN" && user.id !== driverId) {
      throw new Error("Forbidden: Can only view your own rides");
    }
    return await Ride.find({ driverId }).sort({ createdAt: -1 });
  }

  async assignDriver(id, driverId, driverLocation) {
    const ride = await Ride.findById(id);
    if (!ride) throw new Error("Ride not found");

    if (ride.status !== "CREATED") {
      throw new Error(`Cannot assign driver. Ride is ${ride.status}`);
    }

    ride.driverId = driverId;
    ride.status = "ASSIGNED";
    ride.assignedAt = new Date();

    // Stage 2: Calculate Driver to Pickup Route
    if (driverLocation && driverLocation.lat && driverLocation.lng) {
        try {
            // Check if we need to fetch booking details for locations
            let pickup = ride.pickup;
            let dropoff = ride.dropoff;
            
            if (!pickup || !pickup.lat || !dropoff || !dropoff.lat) {
                 const axios = require('axios');
                 const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || 'http://booking-service:3004';
                 try {
                     const bookingResp = await axios.get(`${BOOKING_SERVICE_URL}/internal/bookings/${ride.bookingId}`);
                     const booking = bookingResp.data?.data || bookingResp.data;
                     
                     if (booking) {
                         if (!pickup) {
                            ride.pickup = booking.pickup;
                            pickup = booking.pickup;
                         }
                         if (!dropoff) {
                            ride.dropoff = booking.dropoff;
                            dropoff = booking.dropoff;
                         }
                     }
                 } catch (err) {
                     console.error('AssignDriver: Failed to fetch booking details:', err.message);
                 }
            }

            if (pickup && pickup.lat) {
                console.log('AssignDriver: Calculating Driver->Pickup Route...', { driver: driverLocation, pickup });
                const route = await this.getRoute(
                    { lat: driverLocation.lat, lng: driverLocation.lng },
                    { lat: pickup.lat, lng: pickup.lng }
                );
                ride.driverToPickupRoute = route;
            }
        } catch (err) {
            console.error('Failed to calculate driverToPickupRoute:', err);
        }
    }

    const savedRide = await ride.save();
    return savedRide;
  }

  async startRide(id, user) {
    const ride = await Ride.findById(id);
    if (!ride) throw new Error("Ride not found");

    await this.checkAccess(ride, user, "START");

    if (ride.status !== "ASSIGNED" && ride.status !== "ARRIVED") {
      throw new Error(`Cannot start ride. Ride is ${ride.status}`);
    }

    ride.status = "STARTED";
    ride.startedAt = new Date();

    // Stage 3: Calculate Trip Route (Pickup -> Dropoff)
    try {
         // Always ensure we have the latest route or calculate it now
         if (ride.pickup && ride.dropoff) {
             const route = await this.getRoute(
                 { lat: ride.pickup.lat, lng: ride.pickup.lng },
                 { lat: ride.dropoff.lat, lng: ride.dropoff.lng }
             );
             ride.tripRoute = route;
         } else {
             // Try fetching from booking if missing
             const axios = require('axios');
             const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || 'http://booking-service:3004'; // Fixed port
             const bookingResp = await axios.get(`${BOOKING_SERVICE_URL}/internal/bookings/${ride.bookingId}`);
             const booking = bookingResp.data?.data || bookingResp.data;
             
             if (booking && booking.pickup && booking.dropoff) {
                 ride.pickup = booking.pickup;
                 ride.dropoff = booking.dropoff; // Sync back to ride

                 const route = await this.getRoute(
                     { lat: booking.pickup.lat, lng: booking.pickup.lng },
                     { lat: booking.dropoff.lat, lng: booking.dropoff.lng }
                 );
                 ride.tripRoute = route;
             }
         }
    } catch (err) {
        console.error('Failed to calculate tripRoute:', err.message);
        // Fallback to previewRoute if calculation fails
        if (ride.previewRoute) {
             ride.tripRoute = ride.previewRoute;
        }
    }

    return await ride.save();
  }

  async completeRide(id, metrics, user) {
  const ride = await Ride.findById(id);
  if (!ride) throw new Error("Ride not found");

  await this.checkAccess(ride, user, "COMPLETE");

  if (ride.status !== "STARTED") {
    throw new Error(`Cannot complete ride. Ride is ${ride.status}`);
  }

  // Check distance to dropoff (≤ 200m)
  if (metrics.driverLocation && ride.dropoff && ride.dropoff.lat) {
    const distToDropoff = this._haversineKm(
      metrics.driverLocation.lat, metrics.driverLocation.lng,
      ride.dropoff.lat, ride.dropoff.lng
    );
    if (distToDropoff > 0.2) { // 200m
      throw new Error(`Cannot complete ride. Driver is ${(distToDropoff * 1000).toFixed(0)}m from dropoff (max 200m)`);
    }
  }

  ride.status = "COMPLETED";
  ride.completedAt = new Date();
  ride.actualDistanceKm = metrics.actualDistanceKm;
  ride.actualDurationMin = metrics.actualDurationMin;
  ride.finalFare = metrics.finalFare;

  // Set payment status based on method
  if (ride.paymentMethod === 'CARD') {
    ride.paymentStatus = 'PENDING'; // will be processed by payment-service
  } else {
    ride.paymentStatus = 'UNPAID'; // CASH - driver must confirm
  }

  return await ride.save();
}

/**
 * Confirm cash payment received by driver
 */
async confirmCashPayment(id, user) {
  const ride = await Ride.findById(id);
  if (!ride) throw new Error("Ride not found");

  await this.checkAccess(ride, user, "COMPLETE"); // only driver

  if (ride.status !== "COMPLETED") {
    throw new Error("Ride is not completed yet");
  }
  if (ride.paymentMethod !== 'CASH') {
    throw new Error("This ride does not use cash payment");
  }
  if (ride.paymentStatus === 'PAID') {
    throw new Error("Payment already confirmed");
  }

  ride.paymentStatus = 'PAID';
  return await ride.save();
}

/**
 * Dev/Simulation: Simulate a successful wallet payment from Driver App
 */
async simulateWalletPayment(id, user) {
  const ride = await Ride.findById(id);
  if (!ride) throw new Error("Ride not found");

  await this.checkAccess(ride, user, "COMPLETE");

  if (ride.status !== "COMPLETED") {
    throw new Error("Ride is not completed yet");
  }

  // Override to WALLET PAID
  ride.paymentMethod = 'WALLET';
  ride.paymentStatus = 'PAID';
  
  return await ride.save();
}

/**
 * Haversine distance in km between two lat/lng points
 */
_haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
  /**
   * Stage 3: Driver arrived at pickup. Only updates status, no route calculation.
   */
  async arriveRide(id, user) {
    const ride = await Ride.findById(id);
    if (!ride) throw new Error("Ride not found");

    await this.checkAccess(ride, user, "START"); // Only driver can mark arrived

    if (ride.status !== "ASSIGNED") {
      throw new Error(`Cannot mark arrived. Ride is ${ride.status}`);
    }

    ride.status = "ARRIVED";
    ride.arrivedAt = new Date();
    return await ride.save();
  }

  async cancelRide(id, user) {
    const ride = await Ride.findById(id);
    if (!ride) throw new Error("Ride not found");

    await this.checkAccess(ride, user, "CANCEL");

    if (ride.status === "COMPLETED") {
      throw new Error("Cannot cancel a completed ride");
    }

    // Specific rule: PASSENGER can only cancel if CREATED
    if (user.role === "PASSENGER" && ride.passengerId === user.id) {
       if (ride.status !== "CREATED") {
         throw new Error("Passenger can only cancel when ride is CREATED");
       }
    }

    ride.status = "CANCELLED";
    ride.cancelledAt = new Date();
    return await ride.save();
  }

  /**
   * Driver cancels an accepted ride (ASSIGNED or ARRIVED).
   * Sets status to CANCELLED_BY_DRIVER atomically.
   */
  async driverCancelRide(id, user) {
    const ride = await Ride.findById(id);
    if (!ride) throw new Error("Ride not found");

    // Only the assigned driver can cancel
    if (ride.driverId !== user.id) {
      throw new Error("Forbidden: Only the assigned driver can cancel this ride");
    }

    // Only cancel from ASSIGNED or ARRIVED
    if (!["ASSIGNED", "ARRIVED"].includes(ride.status)) {
      throw new Error(`Cannot driver-cancel a ride in ${ride.status} status`);
    }

    ride.status = "CANCELLED_BY_DRIVER";
    ride.cancelledAt = new Date();
    return await ride.save();
  }

  async getRoute(pickup, destination) {
    const ROUTING_SERVICE_URL = process.env.ROUTING_SERVICE_URL || 'http://routing-service:4040';
    const axios = require('axios');
    try {
      const response = await axios.post(`${ROUTING_SERVICE_URL}/route`, {
        pickup,
        destination
      }, { timeout: 8000 });

      // Routing service returns { success: true, data: { polyline, distance, duration } }
      // We need the inner 'data' object, not the wrapper
      const routeData = response.data?.data || response.data;
      if (!routeData || !routeData.polyline) {
        console.warn('⚠️ Routing service returned unexpected shape:', JSON.stringify(response.data));
        throw new Error('Route data missing polyline');
      }
      console.log(`✅ Route calculated: ${routeData.polyline?.length} points, ${routeData.distance}km, ${routeData.duration}min`);
      
      // Map keys to match RideSchema exactly
      return {
        polyline: routeData.polyline,
        distanceKm: routeData.distance,
        durationMin: routeData.duration
      };
    } catch (error) {
      console.error('Failed to get route from routing-service:', error.message);
      throw new Error('Failed to calculate route');
    }
  }
}

module.exports = new RideService();
