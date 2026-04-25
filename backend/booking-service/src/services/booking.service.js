const Booking = require('../models/booking.model');
const axios = require('axios');
const rabbitmq = require('../messaging/rabbitmq');
const { 
  setOfferTimeout, 
  clearOfferTimeout, 
  setGlobalSearchTimeout, 
  clearGlobalSearchTimeout,
  clearAllBookingTimeouts 
} = require('./booking.timeout');

const DRIVER_SERVICE_URL = process.env.DRIVER_SERVICE_URL || 'http://localhost:3003';
const OFFER_TIMEOUT_MS = 10000; // 10 seconds per driver offer
const GLOBAL_SEARCH_TIMEOUT_MS = 15000; // 15 seconds total search time

/** Haversine distance in km between two {lat,lng} points */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

class BookingService {
  /**
   * Create a new booking + start sequential driver matching
   */
  async createBooking(passengerId, data) {
    console.log('[BOOKING SERVICE] createBooking input payload:', JSON.stringify(data));

    // ── IDEMPOTENCY CHECK ──
    // Time bucket: 60-second window to catch double-tap, but allow re-booking same route later
    const timeBucket = Math.floor(Date.now() / 60000);
    const idempotencyKey = data.idempotencyKey || 
      `${passengerId}_${data.pickup?.lat?.toFixed(4)}_${data.pickup?.lng?.toFixed(4)}_${data.dropoff?.lat?.toFixed(4)}_${data.dropoff?.lng?.toFixed(4)}_${timeBucket}`;

    // Check for any active booking from this passenger with same route (within last 60 seconds)
    const recentDuplicate = await Booking.findOne({
      passengerId,
      idempotencyKey,
      status: { $in: ['PENDING', 'SEARCHING', 'MATCHED', 'CONFIRMED', 'IN_PROGRESS'] },
      createdAt: { $gte: new Date(Date.now() - 60 * 1000) }  // within 60s
    });

    if (recentDuplicate) {
      console.log(`[IDEMPOTENCY] Duplicate booking detected for passenger ${passengerId}, returning existing booking ${recentDuplicate._id}`);
      return recentDuplicate;
    }

    const booking = new Booking({
      passengerId,
      idempotencyKey,
      pickup: data.pickup,
      dropoff: data.dropoff,
      vehicleType: data.vehicleType,
      estimatedPrice: data.estimatedPrice,
      paymentMethod: data.paymentMethod || 'CASH',
      status: 'PENDING',
      route: data.route
    });

    const savedBooking = await booking.save();

    // Publish booking.created event
    await rabbitmq.publish(
      rabbitmq.config.exchanges.bookingEvents,
      'booking.created',
      {
        bookingId: savedBooking._id.toString(),
        userId: passengerId,
        pickup: data.pickup,
        dropoff: data.dropoff,
        vehicleType: data.vehicleType,
        estimatedPrice: data.estimatedPrice,
        paymentMethod: data.paymentMethod || 'CASH',
        status: 'PENDING',
        route: data.route,
        timestamp: new Date().toISOString(),
      }
    );

    // ── Sequential Driver Matching ──
    try {
      // Normalize pickup location
      let pickupLocation = data.pickupCoords || data.pickup;
      if (Array.isArray(pickupLocation)) {
        pickupLocation = { lat: pickupLocation[0], lng: pickupLocation[1] };
      }
      console.log(`📍 Pickup location for matching:`, pickupLocation);

      if (pickupLocation?.lat && pickupLocation?.lng) {
        // Query nearby online drivers sorted by distance ASC, rating DESC
        const driversResp = await axios.get(`${DRIVER_SERVICE_URL}/drivers/nearby`, {
          params: {
            lat: pickupLocation.lat,
            lng: pickupLocation.lng,
            radius: 10,
            limit: 20,
          },
          timeout: 5000,
        });
        const nearbyDrivers = driversResp.data?.data || [];
        console.log(`📋 Nearby drivers: ${nearbyDrivers.length}`);

        if (nearbyDrivers.length > 0) {
          // Save candidate list to booking
          savedBooking.candidateDrivers = nearbyDrivers.map(d => ({
            driverId: d.id,
            userId: d.user_id,
            distance: d.distance_km,
            rating: d.rating_avg,
            vehicleType: d.vehicle_type,
            vehiclePlate: d.vehicle_plate,
            status: 'PENDING',
          }));
          savedBooking.currentOfferIndex = -1;
          savedBooking.status = 'SEARCHING';
          await savedBooking.save();

          // Start offering to drivers sequentially
          await this.offerToNextDriver(savedBooking._id.toString());
        } else {
          console.log('⚠️ No nearby drivers found initially');
          savedBooking.status = 'SEARCHING';
          await savedBooking.save();
        }

        // Set global search timeout for all cases
        setGlobalSearchTimeout(savedBooking._id.toString(), GLOBAL_SEARCH_TIMEOUT_MS, async (bId) => {
          await this.handleGlobalTimeout(bId);
        });
      }
    } catch (err) {
      console.warn('⚠️ Driver matching error:', err.message);
    }

    return savedBooking;
  }

  /**
   * Offer ride to the next candidate driver
   */
  async offerToNextDriver(bookingId) {
    const booking = await Booking.findById(bookingId);
    if (!booking) return;

    // Don't proceed if booking is no longer PENDING/SEARCHING
    if (booking.status !== 'PENDING' && booking.status !== 'SEARCHING') {
      console.log(`⏭️ Booking ${bookingId} is ${booking.status}, skipping offers`);
      return;
    }

    // Find next PENDING candidate (skip rejected/timeout/cancelled drivers)
    let nextIndex = booking.currentOfferIndex + 1;
    while (nextIndex < booking.candidateDrivers.length) {
      if (booking.candidateDrivers[nextIndex].status === 'PENDING') break;
      nextIndex++;
    }

    // No more candidates
    if (nextIndex >= booking.candidateDrivers.length) {
      console.log(`😞 No more candidates for booking ${bookingId}`);
      booking.status = 'NO_DRIVER_FOUND';
      await booking.save();

      // Notify passenger: no driver found
      await rabbitmq.publish(
        rabbitmq.config.exchanges.bookingEvents,
        'booking.noDrivers',
        {
          bookingId: booking._id.toString(),
          userId: booking.passengerId,
          status: 'NO_DRIVER_FOUND',
          timestamp: new Date().toISOString(),
        }
      );
      return;
    }

    const candidate = booking.candidateDrivers[nextIndex];
    candidate.status = 'OFFERED';
    booking.currentOfferIndex = nextIndex;
    booking.offerExpiresAt = new Date(Date.now() + OFFER_TIMEOUT_MS);
    await booking.save();

    console.log(`📤 Offering booking ${bookingId} to driver ${candidate.userId} (${nextIndex + 1}/${booking.candidateDrivers.length})`);

    // Publish offer event → EventBridge → Driver's socket
    await rabbitmq.publish(
      rabbitmq.config.exchanges.bookingEvents,
      'booking.offer',
      {
        bookingId: booking._id.toString(),
        userId: booking.passengerId,
        driverId: candidate.userId,        // auth user_id for socket room
        driverPrismaId: candidate.driverId, // prisma ID
        pickup: booking.pickup,
        vehicleType: booking.vehicleType,
        estimatedPrice: booking.estimatedPrice,
        paymentMethod: booking.paymentMethod,
        approxDistanceToPickup: candidate.distance,
        timeoutMs: OFFER_TIMEOUT_MS,
        candidateIndex: nextIndex,
        totalCandidates: booking.candidateDrivers.length,
        timestamp: new Date().toISOString(),
      }
    );

    // Set timeout → auto-reject if no response
    setOfferTimeout(bookingId, OFFER_TIMEOUT_MS, async (bId) => {
      try {
        await this.handleDriverResponse(bId, candidate.userId, false, 'TIMEOUT');
      } catch (err) {
        console.error(`⏰ Timeout handler error for ${bId}:`, err.message);
      }
    });
  }

  /**
   * Handle driver response (accept / reject / timeout)
   * @param {String} bookingId
   * @param {String} driverUserId - auth user_id
   * @param {Boolean} accepted
   * @param {String} reason - 'ACCEPT', 'REJECT', 'TIMEOUT'
   */
  async handleDriverResponse(bookingId, driverUserId, accepted, reason = 'REJECT') {
    clearOfferTimeout(bookingId);

    // Atomic: only update if still SEARCHING and the right driver
    const booking = await Booking.findOneAndUpdate(
      {
        _id: bookingId,
        status: 'SEARCHING',
        'candidateDrivers': {
          $elemMatch: { userId: driverUserId, status: 'OFFERED' }
        }
      },
      accepted
        ? {
            $set: {
              status: 'MATCHED',
              assignedDriverId: null,  // will be set below
              driverUserId: driverUserId,
              'candidateDrivers.$.status': 'ACCEPTED',
            }
          }
        : {
            $set: {
              'candidateDrivers.$.status': reason === 'TIMEOUT' ? 'TIMEOUT' : 'REJECTED',
            }
          },
      { new: true }
    );

    if (!booking) {
      console.log(`⚠️ handleDriverResponse: booking ${bookingId} not found or already processed`);
      return null;
    }

    if (accepted) {
      clearGlobalSearchTimeout(bookingId);
      // Find the accepted candidate to get prisma driverId
      const acceptedCandidate = booking.candidateDrivers.find(
        c => c.userId === driverUserId && c.status === 'ACCEPTED'
      );
      if (acceptedCandidate) {
        booking.assignedDriverId = acceptedCandidate.driverId;
        await booking.save();
      }

      console.log(`✅ Driver ${driverUserId} ACCEPTED booking ${bookingId}`);

      // Publish booking.matched → passenger gets notified
      await rabbitmq.publish(
        rabbitmq.config.exchanges.bookingEvents,
        'booking.matched',
        {
          bookingId: booking._id.toString(),
          userId: booking.passengerId,
          passengerId: booking.passengerId,
          driverId: driverUserId,
          driver: {
            id: acceptedCandidate?.driverId,
            vehicleType: acceptedCandidate?.vehicleType || 'CAR',
            vehiclePlate: acceptedCandidate?.vehiclePlate || '',
            rating: acceptedCandidate?.rating || 5.0,
          },
          pickup: booking.pickup,
          vehicleType: booking.vehicleType,
          estimatedPrice: booking.estimatedPrice,
          paymentMethod: booking.paymentMethod,
          approxDistanceToPickup: acceptedCandidate?.distance,
          status: 'MATCHED',
          timestamp: new Date().toISOString(),
        }
      );

      // Publish confirmation to driver
      await rabbitmq.publish(
        rabbitmq.config.exchanges.bookingEvents,
        'booking.offer.confirmed',
        {
          bookingId: booking._id.toString(),
          driverId: driverUserId,
          pickup: booking.pickup,
          dropoff: booking.dropoff,
          vehicleType: booking.vehicleType,
          estimatedPrice: booking.estimatedPrice,
          paymentMethod: booking.paymentMethod,
          passengerId: booking.passengerId,
          timestamp: new Date().toISOString(),
        }
      );

      return booking;
    }

    // Rejected/Timeout → offer to next driver
    console.log(`❌ Driver ${driverUserId} ${reason} booking ${bookingId}, trying next...`);
    await this.offerToNextDriver(bookingId);
    return booking;
  }

  /**
   * Handle global search timeout for a booking.
   */
  async handleGlobalTimeout(bookingId) {
    const booking = await Booking.findById(bookingId);
    if (!booking) return;

    // Only timeout if still in a searching state
    if (!['PENDING', 'SEARCHING'].includes(booking.status)) {
        console.log(`🕒 Global timeout ignored for booking ${bookingId} (status: ${booking.status})`);
        return;
    }

    console.log(`🕒 Global search timeout reached for booking ${bookingId}. Setting to NO_DRIVER_FOUND`);
    
    // Clear any pending offer timeout
    clearOfferTimeout(bookingId);

    booking.status = 'NO_DRIVER_FOUND';
    await booking.save();

    // Notify passenger
    await rabbitmq.publish(
      rabbitmq.config.exchanges.bookingEvents,
      'booking.noDrivers',
      {
        bookingId: booking._id.toString(),
        userId: booking.passengerId,
        status: 'NO_DRIVER_FOUND',
        timestamp: new Date().toISOString(),
      }
    );
  }

  /**
   * Handle driver cancellation after accepting (MATCHED/ASSIGNED).
   * Marks the driver as CANCELLED, resets booking to SEARCHING, offers to next.
   * @param {String} bookingId
   * @param {String} cancelledDriverUserId - auth user_id of the driver who cancelled
   */
  async handleDriverCancellation(bookingId, cancelledDriverUserId) {
    // 1. Clear any pending timeout
    clearOfferTimeout(bookingId);

    // 2. Find booking and mark the cancelled driver
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      console.error(`[Rematching] Booking ${bookingId} not found`);
      return null;
    }

    // Only rematch if booking was MATCHED or CONFIRMED (driver had accepted)
    if (!['MATCHED', 'CONFIRMED', 'SEARCHING'].includes(booking.status)) {
      console.log(`[Rematching] Booking ${bookingId} is ${booking.status}, cannot rematch`);
      return null;
    }

    // 3. Mark the cancelled driver in candidateDrivers
    for (const candidate of booking.candidateDrivers) {
      if (candidate.userId === cancelledDriverUserId) {
        candidate.status = 'CANCELLED';
        console.log(`🚫 Marked driver ${cancelledDriverUserId} as CANCELLED in candidates`);
      }
    }

    // 4. Reset booking for rematching
    booking.assignedDriverId = null;
    booking.driverUserId = null;
    booking.status = 'SEARCHING';
    await booking.save();

    console.log(`🔄 Booking ${bookingId} reset to SEARCHING for rematching`);

    // 5. Notify passenger: rematching in progress
    await rabbitmq.publish(
      rabbitmq.config.exchanges.bookingEvents,
      'booking.rematching',
      {
        bookingId: booking._id.toString(),
        userId: booking.passengerId,
        status: 'REMATCHING',
        timestamp: new Date().toISOString(),
      }
    );

    // 6. Offer to next available (PENDING) candidate
    await this.offerToNextDriver(bookingId);

    return booking;
  }

  /**
   * Get booking by ID
   */
  async getBookingById(id) {
    const booking = await Booking.findById(id);
    if (!booking) {
      throw new Error('Booking not found');
    }
    return booking;
  }

  /**
   * Get bookings for a passenger
   */
  async getMyBookings(passengerId) {
    return await Booking.find({ passengerId }).sort({ createdAt: -1 });
  }

  /**
   * Cancel booking (Passenger only)
   */
  async cancelBooking(id, passengerId) {
    const booking = await Booking.findById(id);
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.passengerId !== passengerId) {
      const error = new Error('Access denied');
      error.statusCode = 403;
      throw error;
    }

    if (['CANCELLED', 'NO_DRIVER_FOUND', 'FAILED', 'PAYMENT_FAILED'].includes(booking.status)) {
      return booking;
    }

    if (!['PENDING', 'SEARCHING', 'MATCHED'].includes(booking.status)) {
       const error = new Error(`Cannot cancel booking in current status: ${booking.status}`);
       error.statusCode = 400;
       throw error;
    }

    // Clear all pending timeouts
    clearAllBookingTimeouts(id);

    booking.status = 'CANCELLED';
    const saved = await booking.save();

    // Publish booking.cancelled event — use driverUserId for socket room targeting
    await rabbitmq.publish(
      rabbitmq.config.exchanges.bookingEvents,
      'booking.cancelled',
      {
        bookingId: saved._id.toString(),
        userId: passengerId,
        driverId: saved.driverUserId || null,
        // Also notify currently offered driver (if any)
        currentOfferedDriverUserId: this._getCurrentOfferedDriverUserId(saved),
        status: 'CANCELLED',
        timestamp: new Date().toISOString(),
      }
    );

    return saved;
  }

  /** Helper: get the userId of the currently offered driver */
  _getCurrentOfferedDriverUserId(booking) {
    if (booking.currentOfferIndex >= 0 && booking.candidateDrivers?.length > booking.currentOfferIndex) {
      const candidate = booking.candidateDrivers[booking.currentOfferIndex];
      if (candidate.status === 'OFFERED') return candidate.userId;
    }
    return null;
  }

  /**
   * Update booking status (used by Saga consumers)
   */
  async updateBookingStatus(bookingId, status, meta = {}) {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new Error('Booking not found');
    booking.status = status;
    if (meta.reason) booking.failureReason = meta.reason;
    return await booking.save();
  }
}

module.exports = new BookingService();