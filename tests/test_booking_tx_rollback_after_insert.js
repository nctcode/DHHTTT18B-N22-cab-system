/**
 * TEST: Rollback after insert booking (strict transaction mode)
 *
 * Required logs:
 * - simulate lỗi sau bước tạo booking
 * - Transaction rollback
 * - Không có booking trong DB
 * - System consistent
 *
 * Run (PowerShell):
 *   $env:ENABLE_TRANSACTION='true'
 *   $env:REQUIRE_TRANSACTIONS='true'
 *   node tests/test_booking_tx_rollback_after_insert.js
 */

const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../backend/booking-service/.env') });

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
const api = axios.create({ baseURL: BASE, timeout: 20000, validateStatus: () => true });

const state = {
  token: null,
  passengerId: null,
};

function auth(token) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

function log(icon, msg, data) {
  const ts = new Date().toLocaleTimeString('vi-VN');
  console.log(`[${ts}] ${icon} ${msg}`);
  if (data) console.log(`         ${JSON.stringify(data, null, 2).split('\n').join('\n         ')}`);
}

async function registerAndLogin(userData) {
  const reg = await api.post('/api/auth/register', userData);
  if (reg.data?.accessToken) {
    return { token: reg.data.accessToken, id: reg.data.data?.id || reg.data.data?.userId };
  }

  const login = await api.post('/api/auth/login', {
    email: userData.email,
    password: userData.password,
  });

  return { token: login.data?.accessToken, id: login.data?.data?.id || login.data?.data?.userId };
}

function bookingCountFromResponse(resp) {
  const payload = resp.data?.data;
  if (!payload) return 0;
  if (Array.isArray(payload)) return payload.length;
  if (Array.isArray(payload.bookings)) return payload.bookings.length;
  return 0;
}

async function setupUser() {
  const ts = Date.now();
  const user = await registerAndLogin({
    email: `tx_rollback_${ts}@test.com`,
    password: '123456',
    fullName: 'TX Rollback User',
    phone: `09${ts.toString().slice(-8)}`,
    role: 'PASSENGER',
  });

  state.token = user.token;
  state.passengerId = user.id;

  if (!state.token) {
    throw new Error('Không lấy được token đăng nhập test user');
  }

  log('✅', `Test user ready: ${state.passengerId}`);
}

async function runTest() {
  if (process.env.REQUIRE_TRANSACTIONS !== 'true') {
    throw new Error('REQUIRE_TRANSACTIONS must be true for rollback-after-insert strict test');
  }

  await setupUser();

  const before = await api.get('/api/bookings/my-bookings', auth(state.token));
  if (before.status !== 200) {
    throw new Error(`Không lấy được booking trước test. HTTP ${before.status}`);
  }

  const countBefore = bookingCountFromResponse(before);

  console.log('simulate lỗi sau bước tạo booking');

  const payload = {
    pickup: { lat: 10.762, lng: 106.660, address: `Rollback Pickup ${Date.now()}` },
    dropoff: { lat: 10.823, lng: 106.629, address: `Rollback Dropoff ${Date.now()}` },
    vehicleType: 'ECONOMY',
    estimatedPrice: 35000,
    paymentMethod: 'CASH',
  };

  const createRes = await api.post('/api/bookings', payload, {
    headers: {
      Authorization: `Bearer ${state.token}`,
      'x-simulate-fail-after-insert': '1',
    },
  });

  log('📦', `Create response HTTP ${createRes.status}`, createRes.data);

  if (createRes.status < 400) {
    throw new Error(`Expected create booking to fail due to simulated error, got HTTP ${createRes.status}`);
  }

  console.log('Transaction rollback');

  const after = await api.get('/api/bookings/my-bookings', auth(state.token));
  if (after.status !== 200) {
    throw new Error(`Không lấy được booking sau test. HTTP ${after.status}`);
  }

  const countAfter = bookingCountFromResponse(after);

  if (countAfter !== countBefore) {
    throw new Error(`Ghost booking detected. before=${countBefore}, after=${countAfter}`);
  }

  console.log('Không có booking trong DB');
  console.log('System consistent');
}

(async () => {
  try {
    console.log('\n=== TEST: Rollback after insert booking ===');
    console.log(`BASE URL: ${BASE}`);
    console.log(`Time: ${new Date().toLocaleString('vi-VN')}`);

    await runTest();

    log('✅', 'Rollback-after-insert test PASSED');
    process.exit(0);
  } catch (error) {
    log('❌', 'Rollback-after-insert test FAILED', { message: error.message });
    process.exit(1);
  }
})();
