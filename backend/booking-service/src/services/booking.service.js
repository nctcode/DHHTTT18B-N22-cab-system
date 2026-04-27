const mongoose = require('mongoose');
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
   * Transaction policy:
   * - ENABLE_TRANSACTION=true|false
   * - REQUIRE_TRANSACTIONS=true|false
   *
   * SAFE MODE  (default): ENABLE_TRANSACTION=true,  REQUIRE_TRANSACTIONS=false
   * STRICT MODE(test/stg): ENABLE_TRANSACTION=true, REQUIRE_TRANSACTIONS=true
   */
  _getTransactionPolicy() {
    return {
      enabled: process.env.ENABLE_TRANSACTION !== 'false',
      requireTransactions: process.env.REQUIRE_TRANSACTIONS === 'true',
    };
  }

  _isTransactionSupported() {
    try {
      const topology = mongoose.connection.client?.topology?.description?.type
                    || mongoose.connection.client?.topology?.s?.description?.type
                    || '';

      return topology.includes('ReplicaSet') || topology === 'Sharded';
    } catch (error) {
      return false;
    }
  }

  async _withTransaction(operationName, callback) {
    const policy = this._getTransactionPolicy();

    if (!policy.enabled) {
      console.warn(`[Transaction][SAFE] ${operationName}: ENABLE_TRANSACTION=false -> running without transaction.`);
      return await callback(null);
    }

    const canUseTransaction = this._isTransactionSupported();
    if (!canUseTransaction) {
      const reason = `[Transaction] ${operationName}: Mongo topology does not support transaction.`;

      if (policy.requireTransactions) {
        const error = new Error(`${reason} REQUIRE_TRANSACTIONS=true -> fail-fast.`);
        error.code = 'TRANSACTION_REQUIRED_BUT_UNAVAILABLE';
        throw error;
      }

      console.warn(`${reason} Fallback SAFE MODE (without session).`);
      return await callback(null);
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      console.log(`[Transaction] Started for ${operationName}`);
      const result = await callback(session);
      await session.commitTransaction();
      console.log(`[Transaction] ✅ COMMITTED ${operationName}`);
      return result;
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      console.error(`[Transaction] ❌ ABORTED ${operationName}: ${error.message}`);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Create a new booking + start sequential driver matching
   * 
   * TRANSACTION SAFETY:
   * Uses adaptive transaction. RabbitMQ events are only published AFTER successful commit.
   */
  async createBooking(passengerId, data, options = {}) {
    console.log('[BOOKING SERVICE] createBooking input payload:', JSON.stringify(data));

    // ── IDEMPOTENCY CHECK (read-only, no session needed) ──
    const timeBucket = Math.floor(Date.now() / 60000);
    const idempotencyKey = data.idempotencyKey || 
      `${passengerId}_${data.pickup?.lat?.toFixed(4)}_${data.pickup?.lng?.toFixed(4)}_${data.dropoff?.lat?.toFixed(4)}_${data.dropoff?.lng?.toFixed(4)}_${timeBucket}`;

    const recentDuplicate = await Booking.findOne({
      passengerId,
      idempotencyKey,
      status: { $in: ['PENDING', 'SEARCHING', 'MATCHED', 'CONFIRMED', 'IN_PROGRESS'] },
      createdAt: { $gte: new Date(Date.now() - 60 * 1000) }
    });

    if (recentDuplicate) {
      console.log(`[IDEMPOTENCY] Duplicate booking detected for passenger ${passengerId}, returning existing booking ${recentDuplicate._id}`);
      return recentDuplicate;
    }

    // Events to publish AFTER successful commit (Transactional Outbox pattern)
    const pendingEvents = [];
    let savedBooking = null;

    // ══════════════════════════════════════════════════════════
    //  TRANSACTION BLOCK (Adaptive)
    // ══════════════════════════════════════════════════════════
    try {
      savedBooking = await this._withTransaction('createBooking', async (session) => {
        // Option object for save/update operations
        const opts = session ? { session } : {};

        // ── Step 1: Create and save booking ──
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

        const saved = await booking.save(opts);
        console.log(`[Transaction] Booking ${saved._id} saved with status PENDING`);

        // Failure injection (test-only path from controller), right after insert and before commit.
        if (options.simulateFailAfterInsert) {
          if (session) {
            const injectedError = new Error('SIMULATED_FAIL_AFTER_INSERT');
            injectedError.code = 'SIMULATED_FAIL_AFTER_INSERT';
            throw injectedError;
          }

          console.warn('[Transaction][SAFE] simulateFailAfterInsert ignored because no active transaction session.');
        }

        // Queue the booking.created event (post-commit publish)
        pendingEvents.push({
          exchange: rabbitmq.config.exchanges.bookingEvents,
          routingKey: 'booking.created',
          data: {
            bookingId: saved._id.toString(),
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
        });

        // ── Step 2: Fetch nearby drivers (external API call, read-only) ──
        let nearbyDrivers = [];
        try {
          let pickupLocation = data.pickupCoords || data.pickup;
          if (Array.isArray(pickupLocation)) {
            pickupLocation = { lat: pickupLocation[0], lng: pickupLocation[1] };
          }
          if (pickupLocation?.lat && pickupLocation?.lng) {
            const driversResp = await axios.get(`${DRIVER_SERVICE_URL}/drivers/nearby`, {
              params: {
                lat: pickupLocation.lat,
                lng: pickupLocation.lng,
                radius: 10,
                limit: 20,
              },
              timeout: 5000,
            });
            nearbyDrivers = driversResp.data?.data || [];
            console.log(`📋 Nearby drivers: ${nearbyDrivers.length}`);
          }
        } catch (err) {
          console.warn('⚠️ Driver service call failed (non-critical):', err.message);
        }

        // ── Step 3: Update booking with driver candidates ──
        if (nearbyDrivers.length > 0) {
          saved.candidateDrivers = nearbyDrivers.map(d => ({
            driverId: d.id,
            userId: d.user_id,
            distance: d.distance_km,
            rating: d.rating_avg,
            vehicleType: d.vehicle_type,
            vehiclePlate: d.vehicle_plate,
            status: 'PENDING',
          }));
          saved.currentOfferIndex = -1;
        } else {
          console.log('⚠️ No nearby drivers found initially, status set to SEARCHING');
        }
        saved.status = 'SEARCHING';

        await saved.save(opts);
        console.log(`[Transaction] Booking ${saved._id} updated to status ${saved.status}`);

        return saved;
      });
    } catch (error) {
      console.error(`[BookingService] Failed to create booking: ${error.message}`);
      throw error;
    }

    // ══════════════════════════════════════════════════════════
    //  POST-COMMIT: Publish events and start async processes.
    // ══════════════════════════════════════════════════════════

    for (const event of pendingEvents) {
      try {
        await rabbitmq.publish(event.exchange, event.routingKey, event.data);
        console.log(`[Post-Commit] Published ${event.routingKey}`);
      } catch (err) {
        console.error(`[Post-Commit] ⚠️ Failed to publish ${event.routingKey}:`, err.message);
      }
    }

    // Start driver matching (async, non-transactional)
    if (savedBooking?.candidateDrivers?.length > 0) {
      try {
        await this.offerToNextDriver(savedBooking._id.toString());
      } catch (err) {
        console.warn('⚠️ Driver offer initiation failed (non-critical):', err.message);
      }
    }

    // Set global search timeout
    try {
      if (savedBooking) {
        setGlobalSearchTimeout(savedBooking._id.toString(), GLOBAL_SEARCH_TIMEOUT_MS, async (bId) => {
          await this.handleGlobalTimeout(bId);
        });
      }
    } catch (err) {
      console.warn('⚠️ Global search timeout setup failed:', err.message);
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

    // ── TRANSACTION BLOCK (Adaptive) ──
    let saved = null;
    try {
      saved = await this._withTransaction('cancelBooking', async (session) => {
        const opts = session ? { session } : {};
        
        // Clear all pending timeouts
        clearAllBookingTimeouts(id);

        booking.status = 'CANCELLED';
        const savedBooking = await booking.save(opts);
        return savedBooking;
      });
    } catch (error) {
      console.error(`[BookingService] Failed to cancel booking: ${error.message}`);
      throw error;
    }

    // POST-COMMIT: Publish cancellation event
    try {
      if (saved) {
        await rabbitmq.publish(
          rabbitmq.config.exchanges.bookingEvents,
          'booking.cancelled',
          {
            bookingId: saved._id.toString(),
            userId: passengerId,
            driverId: saved.driverUserId || null,
            currentOfferedDriverUserId: this._getCurrentOfferedDriverUserId(saved),
            status: 'CANCELLED',
            timestamp: new Date().toISOString(),
          }
        );
      }
    } catch (err) {
      console.error(`[Post-Commit] ⚠️ Failed to publish booking.cancelled:`, err.message);
    }

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