/**
 * TEST: Payment failed event must rollback booking to FAILED (no dangling booking)
 *
 * Run:
 *   node tests/test_payment_failure_rollback.js
 */

const axios = require('axios');

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: BASE,
  timeout: 25000,
  validateStatus: () => true,
});

function auth(token) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function registerAndLoginPassenger() {
  const ts = Date.now();
  const payload = {
    email: `payment_rollback_${ts}@test.com`,
    password: '123456',
    fullName: 'Payment Rollback User',
    phone: `09${ts.toString().slice(-8)}`,
    role: 'PASSENGER',
  };

  const reg = await api.post('/api/auth/register', payload);
  if (reg.data?.accessToken) {
    return {
      token: reg.data.accessToken,
      userId: reg.data.data?.id || reg.data.data?.userId,
    };
  }

  const login = await api.post('/api/auth/login', {
    email: payload.email,
    password: payload.password,
  });

  return {
    token: login.data?.accessToken,
    userId: login.data?.data?.id || login.data?.data?.userId,
  };
}

async function createRideForBooking(token, userId, booking) {
  const createRideResp = await api.post(
    '/api/rides',
    {
      bookingId: booking._id,
      passengerId: userId,
      pickup: booking.pickup,
      dropoff: booking.dropoff,
      route: booking.route,
      paymentMethod: 'CARD',
    },
    auth(token)
  );

  if (createRideResp.status !== 201) {
    throw new Error(`Create ride failed. HTTP ${createRideResp.status}`);
  }

  const ride = createRideResp.data?.data;
  const rideId = ride?._id || ride?.id;
  if (!rideId) {
    throw new Error('Create ride succeeded but rideId missing');
  }

  return { rideId, ride };
}

async function triggerSimulatedWalletFailure(token, rideId) {
  const resp = await api.patch(
    `/api/rides/${rideId}/simulate-wallet`,
    { fail_simulation: true },
    auth(token)
  );

  if (resp.status !== 402) {
    throw new Error(`Simulate wallet failure expected HTTP 402, got ${resp.status}`);
  }
}

async function waitUntilBookingFailed(token, bookingId, maxRetries = 40, delayMs = 500) {
  for (let i = 0; i < maxRetries; i++) {
    const resp = await api.get(`/api/bookings/${bookingId}`, auth(token));
    const booking = resp.data?.data;
    if (resp.status === 200 && booking?.status === 'FAILED') {
      return booking;
    }
    await sleep(delayMs);
  }
  return null;
}

(async () => {
  try {
    console.log('\n=== TEST: payment.failed -> booking FAILED compensation ===');
    console.log(`BASE URL: ${BASE}`);

    const user = await registerAndLoginPassenger();
    if (!user.token) {
      throw new Error('Cannot obtain passenger token');
    }

    const createBookingResp = await api.post(
      '/api/bookings',
      {
        pickup: { lat: 10.762, lng: 106.660, address: `PaymentFail Pickup ${Date.now()}` },
        dropoff: { lat: 10.823, lng: 106.629, address: `PaymentFail Dropoff ${Date.now()}` },
        vehicleType: 'ECONOMY',
        estimatedPrice: 42000,
        paymentMethod: 'CARD',
      },
      auth(user.token)
    );

    if (createBookingResp.status !== 201 || !createBookingResp.data?.data?._id) {
      throw new Error(`Create booking failed. HTTP ${createBookingResp.status}`);
    }

    const bookingId = createBookingResp.data.data._id;
    console.log(`Created booking: ${bookingId}`);

    const { rideId } = await createRideForBooking(user.token, user.userId, createBookingResp.data.data);
    console.log(`Created ride: ${rideId}`);

    await triggerSimulatedWalletFailure(user.token, rideId);
    console.log('Triggered simulated wallet payment failure');

    const booking = await waitUntilBookingFailed(user.token, bookingId);
    if (!booking) {
      throw new Error('Booking did not transition to FAILED after payment.failed');
    }

    console.log('✅ Booking transitioned to FAILED');
    console.log(`failureReason: ${booking.failureReason || 'N/A'}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    process.exit(1);
  }
})();
