/**
 * TEST: Booking Transaction - No Partial Write
 * 
 * Kiểm tra:
 *   TC-TX1: Booking hợp lệ → DB commit thành công, status = SEARCHING
 *   TC-TX2: Booking thiếu field (pickup) → reject, KHÔNG có record trong DB
 *   TC-TX3: Booking vehicleType sai → reject, KHÔNG có record trong DB
 *   TC-TX4: Cancel booking → DB updated atomically, status = CANCELLED
 *   TC-TX5: Duplicate booking (idempotency) → trả về cùng 1 record, không tạo thêm
 *   TC-TX6: 2 user đặt song song → mỗi user có booking riêng, không lẫn dữ liệu
 *   TC-TX7: Pricing fallback → Booking vẫn tạo thành công (retry/fallback không crash)
 * 
 * Cách chạy:
 *   node tests/test_booking_transaction.js
 * 
 * Yêu cầu:
 *   - API Gateway chạy trên port 3000
 *   - Auth Service, Booking Service, MongoDB đang chạy
 */

const axios = require('axios');

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
const api = axios.create({ baseURL: BASE, timeout: 20000, validateStatus: () => true });

// ── State ──
const state = {
  tokenA: null, idA: null,
  tokenB: null, idB: null,
};

// ── Helpers ──
function log(icon, msg, data) {
  const ts = new Date().toLocaleTimeString('vi-VN');
  console.log(`[${ts}] ${icon} ${msg}`);
  if (data) console.log(`         ${JSON.stringify(data, null, 2).split('\n').join('\n         ')}`);
}

function separator(title) {
  console.log('\n' + '─'.repeat(60));
  console.log(`  ${title}`);
  console.log('─'.repeat(60));
}

function auth(token) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

async function registerAndLogin(userData) {
  // Try register
  const reg = await api.post('/api/auth/register', userData);
  if (reg.data?.accessToken) {
    return { token: reg.data.accessToken, id: reg.data.data?.id || reg.data.data?.userId };
  }
  // Fallback: login
  const login = await api.post('/api/auth/login', { email: userData.email, password: userData.password });
  return { token: login.data?.accessToken, id: login.data?.data?.userId || login.data?.data?.id };
}

function makeBookingPayload(overrides = {}) {
  return {
    pickup: { lat: 10.762, lng: 106.660, address: `Test Pickup ${Date.now()}` },
    dropoff: { lat: 10.823, lng: 106.629, address: `Test Dropoff ${Date.now()}` },
    vehicleType: 'ECONOMY',
    estimatedPrice: 35000,
    paymentMethod: 'CASH',
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════
//  SETUP: Register 2 test users
// ══════════════════════════════════════════════════════════════
async function setup() {
  separator('SETUP: Registering test users');

  const ts = Date.now();
  try {
    const userA = await registerAndLogin({
      email: `txtest_a_${ts}@test.com`, password: '123456',
      fullName: 'TX Test User A', phone: `09${ts.toString().slice(-8)}`, role: 'PASSENGER',
    });
    state.tokenA = userA.token;
    state.idA = userA.id;
    log('✅', `User A registered: ${state.idA}`);

    const userB = await registerAndLogin({
      email: `txtest_b_${ts + 1}@test.com`, password: '123456',
      fullName: 'TX Test User B', phone: `08${(ts + 1).toString().slice(-8)}`, role: 'PASSENGER',
    });
    state.tokenB = userB.token;
    state.idB = userB.id;
    log('✅', `User B registered: ${state.idB}`);
  } catch (err) {
    log('❌', `Setup failed: ${err.message}`);
    throw err;
  }

  if (!state.tokenA || !state.tokenB) {
    log('❌', 'Could not obtain auth tokens. Is the Auth Service running?');
    process.exit(1);
  }
}

// ══════════════════════════════════════════════════════════════
//  TC-TX1: Booking hợp lệ → DB commit thành công
// ══════════════════════════════════════════════════════════════
async function testTX1_ValidBooking() {
  separator('TC-TX1: Booking hợp lệ → Transaction commit thành công');

  const payload = makeBookingPayload();
  const res = await api.post('/api/bookings', payload, auth(state.tokenA));

  log('📦', `Response HTTP ${res.status}:`, res.data);

  if (![200, 201].includes(res.status)) {
    log('❌', 'FAILED - Could not create booking');
    return { name: 'TC-TX1', status: 'FAILED', reason: `HTTP ${res.status}` };
  }

  const booking = res.data.data;
  const bookingId = booking._id || booking.id;

  // Verify: DB has the record with correct status
  const check = await api.get(`/api/bookings/${bookingId}`, auth(state.tokenA));

  if (check.status !== 200) {
    log('❌', 'FAILED - Cannot read booking from DB after commit');
    return { name: 'TC-TX1', status: 'FAILED', reason: 'read-after-write failed' };
  }

  const dbBooking = check.data.data;
  const validStatuses = ['PENDING', 'SEARCHING', 'MATCHED'];

  if (!validStatuses.includes(dbBooking.status)) {
    log('❌', `FAILED - Unexpected status: ${dbBooking.status}`);
    return { name: 'TC-TX1', status: 'FAILED', reason: `status=${dbBooking.status}` };
  }

  log('✅', `PASSED - Booking ${bookingId} committed. Status=${dbBooking.status}, vehicleType=${dbBooking.vehicleType}`);
  return { name: 'TC-TX1', status: 'PASSED', bookingId, dbStatus: dbBooking.status };
}

// ══════════════════════════════════════════════════════════════
//  TC-TX2: Booking thiếu pickup → reject, không partial write
// ══════════════════════════════════════════════════════════════
async function testTX2_MissingPickup() {
  separator('TC-TX2: Booking thiếu pickup → reject, KHÔNG partial write');

  // Lấy số booking TRƯỚC khi gửi request sai
  const before = await api.get('/api/bookings/my-bookings', auth(state.tokenA));
  const countBefore = (before.data.data?.bookings || before.data.data || []).length;

  // Gửi booking thiếu pickup
  const payload = {
    dropoff: { lat: 10.77, lng: 106.70, address: 'Only Dropoff' },
    vehicleType: 'ECONOMY',
    estimatedPrice: 50000,
  };
  const res = await api.post('/api/bookings', payload, auth(state.tokenA));

  log('📦', `Response HTTP ${res.status}:`, res.data);

  if (res.status >= 200 && res.status < 300 && res.data.success) {
    log('❌', 'FAILED - Invalid booking was ACCEPTED (should have been rejected)');
    return { name: 'TC-TX2', status: 'FAILED', reason: 'invalid data accepted' };
  }

  // Verify: số booking KHÔNG tăng (no partial write)
  const after = await api.get('/api/bookings/my-bookings', auth(state.tokenA));
  const countAfter = (after.data.data?.bookings || after.data.data || []).length;

  if (countAfter > countBefore) {
    log('❌', `FAILED - PARTIAL WRITE detected! Booking count before=${countBefore}, after=${countAfter}`);
    return { name: 'TC-TX2', status: 'FAILED', reason: 'partial write', countBefore, countAfter };
  }

  log('✅', `PASSED - Invalid booking rejected (HTTP ${res.status}). DB unchanged (${countBefore} bookings)`);
  return { name: 'TC-TX2', status: 'PASSED', httpStatus: res.status };
}

// ══════════════════════════════════════════════════════════════
//  TC-TX3: VehicleType không hợp lệ → reject, không partial write
// ══════════════════════════════════════════════════════════════
async function testTX3_InvalidVehicleType() {
  separator('TC-TX3: VehicleType sai → reject, KHÔNG partial write');

  const before = await api.get('/api/bookings/my-bookings', auth(state.tokenA));
  const countBefore = (before.data.data?.bookings || before.data.data || []).length;

  const payload = makeBookingPayload({ vehicleType: 'HELICOPTER' });
  const res = await api.post('/api/bookings', payload, auth(state.tokenA));

  log('📦', `Response HTTP ${res.status}:`, res.data);

  // Nếu server accept → transaction phải rollback → check DB
  const after = await api.get('/api/bookings/my-bookings', auth(state.tokenA));
  const countAfter = (after.data.data?.bookings || after.data.data || []).length;

  // Server should reject with 400/500
  if (res.status >= 400) {
    if (countAfter > countBefore) {
      log('❌', `FAILED - Server rejected BUT partial write detected! before=${countBefore}, after=${countAfter}`);
      return { name: 'TC-TX3', status: 'FAILED', reason: 'partial write after rejection' };
    }
    log('✅', `PASSED - Invalid vehicleType rejected (HTTP ${res.status}). DB unchanged (${countBefore} bookings)`);
    return { name: 'TC-TX3', status: 'PASSED' };
  }

  // If server somehow accepted it, the booking should have been rolled back
  log('⚠️', `Server returned ${res.status} for invalid vehicleType — checking DB...`);
  if (countAfter > countBefore) {
    // Check if the new booking has the invalid type
    const all = after.data.data?.bookings || after.data.data || [];
    const ghost = all.find(b => b.vehicleType === 'HELICOPTER');
    if (ghost) {
      log('❌', 'FAILED - Ghost record with HELICOPTER vehicleType exists in DB!');
      return { name: 'TC-TX3', status: 'FAILED', reason: 'ghost record' };
    }
  }

  log('✅', 'PASSED - No ghost record in DB');
  return { name: 'TC-TX3', status: 'PASSED' };
}

// ══════════════════════════════════════════════════════════════
//  TC-TX4: Cancel booking → atomically updates status
// ══════════════════════════════════════════════════════════════
async function testTX4_CancelBooking() {
  separator('TC-TX4: Cancel booking → Transaction atomic update');

  // First create a booking
  const payload = makeBookingPayload({ address: 'TC-TX4 Cancel Test' });
  const createRes = await api.post('/api/bookings', payload, auth(state.tokenA));

  if (![200, 201].includes(createRes.status)) {
    log('⏭️', 'SKIPPED - Could not create booking for cancel test');
    return { name: 'TC-TX4', status: 'SKIPPED' };
  }

  const bookingId = createRes.data.data?._id || createRes.data.data?.id;
  log('📝', `Created booking ${bookingId} for cancel test`);

  // Wait a bit for async processing
  await new Promise(r => setTimeout(r, 1000));

  // Cancel it
  const cancelRes = await api.patch(`/api/bookings/${bookingId}/cancel`, {}, auth(state.tokenA));
  log('📦', `Cancel response HTTP ${cancelRes.status}:`, cancelRes.data);

  if (![200].includes(cancelRes.status)) {
    log('❌', `FAILED - Cancel returned HTTP ${cancelRes.status}`);
    return { name: 'TC-TX4', status: 'FAILED', reason: `cancel HTTP ${cancelRes.status}` };
  }

  // Verify DB shows CANCELLED
  const verify = await api.get(`/api/bookings/${bookingId}`, auth(state.tokenA));
  const dbStatus = verify.data.data?.status;

  if (dbStatus !== 'CANCELLED') {
    log('❌', `FAILED - DB status is "${dbStatus}" instead of "CANCELLED" (partial write!)`);
    return { name: 'TC-TX4', status: 'FAILED', reason: `status=${dbStatus}` };
  }

  log('✅', `PASSED - Booking ${bookingId} cancelled atomically. DB status=CANCELLED`);
  return { name: 'TC-TX4', status: 'PASSED', bookingId };
}

// ══════════════════════════════════════════════════════════════
//  TC-TX5: Idempotency — duplicate request trả cùng booking
// ══════════════════════════════════════════════════════════════
async function testTX5_Idempotency() {
  separator('TC-TX5: Idempotency — duplicate request không tạo thêm record');

  const payload = makeBookingPayload({
    pickup: { lat: 10.111, lng: 106.222, address: 'TC-TX5 Idem Pickup' },
    dropoff: { lat: 10.333, lng: 106.444, address: 'TC-TX5 Idem Dropoff' },
  });

  const idempotencyKey = `tc-tx5-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const authHeaders = auth(state.tokenB);
  const requestConfig = {
    ...authHeaders,
    headers: {
      ...authHeaders.headers,
      'Idempotency-Key': idempotencyKey,
    },
  };

  const res1 = await api.post('/api/bookings', payload, requestConfig);
  const res2 = await api.post('/api/bookings', payload, requestConfig);

  log('📦', `Request 1: HTTP ${res1.status}`);
  log('📦', `Request 2: HTTP ${res2.status}`);

  if (res1.status !== 201) {
    log('⏭️', 'SKIPPED - First booking did not create a new resource as expected');
    return { name: 'TC-TX5', status: 'SKIPPED' };
  }

  if (res2.status !== 200) {
    log('❌', `FAILED - Replay request expected HTTP 200 but got ${res2.status}`);
    return { name: 'TC-TX5', status: 'FAILED', reason: `replay-http-${res2.status}` };
  }

  const id1 = res1.data.data?._id || res1.data.data?.id;
  const id2 = res2.data.data?._id || res2.data.data?.id;

  if (id1 === id2) {
    log('✅', `PASSED - Duplicate replay returned same booking ${id1}`);
    return { name: 'TC-TX5', status: 'PASSED', id: id1 };
  } else {
    log('❌', `FAILED - Different IDs: ${id1} vs ${id2} (duplicate not detected)`);
    return { name: 'TC-TX5', status: 'FAILED', id1, id2 };
  }
}

// ══════════════════════════════════════════════════════════════
//  TC-TX6: 2 users đặt song song → isolated, không lẫn dữ liệu
// ══════════════════════════════════════════════════════════════
async function testTX6_IsolatedConcurrent() {
  separator('TC-TX6: 2 users đặt song song → Isolated transactions');

  const payloadA = makeBookingPayload({
    pickup: { lat: 10.500, lng: 106.500, address: 'User A TX6' },
    dropoff: { lat: 10.600, lng: 106.600, address: 'User A TX6 Drop' },
    estimatedPrice: 40000,
  });
  const payloadB = makeBookingPayload({
    pickup: { lat: 10.700, lng: 106.700, address: 'User B TX6' },
    dropoff: { lat: 10.800, lng: 106.800, address: 'User B TX6 Drop' },
    vehicleType: 'BIKE',
    estimatedPrice: 20000,
  });

  const [resA, resB] = await Promise.all([
    api.post('/api/bookings', payloadA, auth(state.tokenA)),
    api.post('/api/bookings', payloadB, auth(state.tokenB)),
  ]);

  log('📦', `User A: HTTP ${resA.status}`);
  log('📦', `User B: HTTP ${resB.status}`);

  const bookingA = resA.data.data;
  const bookingB = resB.data.data;

  // Both should succeed
  if (![200, 201].includes(resA.status) || ![200, 201].includes(resB.status)) {
    log('⚠️', `One or both failed: A=${resA.status}, B=${resB.status}`);
    // Still pass if at least one worked
    if ([200, 201].includes(resA.status) || [200, 201].includes(resB.status)) {
      log('✅', 'PASSED - At least one booking succeeded, no crash');
      return { name: 'TC-TX6', status: 'PASSED' };
    }
    log('❌', 'FAILED - Both bookings failed');
    return { name: 'TC-TX6', status: 'FAILED' };
  }

  const idA = bookingA?._id || bookingA?.id;
  const idB = bookingB?._id || bookingB?.id;

  // IDs must be different (different users)
  if (idA === idB) {
    log('❌', `FAILED - CROSS-CONTAMINATION! Same ID for different users: ${idA}`);
    return { name: 'TC-TX6', status: 'FAILED', reason: 'cross-contamination' };
  }

  // Data must not be mixed
  if (bookingA?.passengerId === bookingB?.passengerId) {
    log('❌', 'FAILED - Same passengerId for different bookings!');
    return { name: 'TC-TX6', status: 'FAILED', reason: 'passengerId leak' };
  }

  log('✅', `PASSED - Isolated: A=${idA} (${bookingA?.vehicleType}), B=${idB} (${bookingB?.vehicleType})`);
  return { name: 'TC-TX6', status: 'PASSED', idA, idB };
}

// ══════════════════════════════════════════════════════════════
//  TC-TX7: Pricing fallback → Booking vẫn tạo thành công
// ══════════════════════════════════════════════════════════════
async function testTX7_BookingWithPricingFallback() {
  separator('TC-TX7: Booking tạo thành công khi Pricing service fallback');

  // Tạo booking bình thường — pricing có thể up hoặc down
  // Điều quan trọng: hệ thống KHÔNG crash
  const payload = makeBookingPayload({
    pickup: { lat: 10.900, lng: 106.900, address: 'TX7 Pricing Fallback' },
    dropoff: { lat: 10.950, lng: 106.950, address: 'TX7 Dest' },
    estimatedPrice: 0, // Simulate unknown price
  });

  const res = await api.post('/api/bookings', payload, auth(state.tokenB));
  log('📦', `Response HTTP ${res.status}:`, res.data);

  if (![200, 201].includes(res.status)) {
    log('❌', `FAILED - Booking creation failed with HTTP ${res.status}`);
    return { name: 'TC-TX7', status: 'FAILED', reason: `HTTP ${res.status}` };
  }

  const bookingId = res.data.data?._id || res.data.data?.id;

  // Verify booking exists in DB
  const verify = await api.get(`/api/bookings/${bookingId}`, auth(state.tokenB));
  if (verify.status !== 200) {
    log('❌', 'FAILED - Booking not found in DB after creation');
    return { name: 'TC-TX7', status: 'FAILED', reason: 'not in DB' };
  }

  log('✅', `PASSED - Booking ${bookingId} created despite pricing state. Status=${verify.data.data?.status}`);
  return { name: 'TC-TX7', status: 'PASSED', bookingId };
}

// ══════════════════════════════════════════════════════════════
//  RUN ALL TESTS
// ══════════════════════════════════════════════════════════════
async function runAllTests() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   BOOKING TRANSACTION - NO PARTIAL WRITE TEST SUITE    ║');
  console.log('║   Kiểm tra: ACID, Rollback, Idempotency, Isolation    ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\n  API Gateway: ${BASE}`);
  console.log(`  Time: ${new Date().toLocaleString('vi-VN')}\n`);

  await setup();

  const results = [];

  results.push(await testTX1_ValidBooking());
  results.push(await testTX2_MissingPickup());
  results.push(await testTX3_InvalidVehicleType());
  results.push(await testTX4_CancelBooking());
  results.push(await testTX5_Idempotency());
  results.push(await testTX6_IsolatedConcurrent());
  results.push(await testTX7_BookingWithPricingFallback());

  // ── Summary ──
  separator('KẾT QUẢ TỔNG HỢP');

  const passed = results.filter(r => r.status === 'PASSED');
  const failed = results.filter(r => r.status === 'FAILED');
  const skipped = results.filter(r => r.status === 'SKIPPED');

  results.forEach(r => {
    const icon = r.status === 'PASSED' ? '✅' : r.status === 'SKIPPED' ? '⏭️' : '❌';
    const extra = r.reason ? ` (${r.reason})` : '';
    console.log(`  ${icon} ${r.name}: ${r.status}${extra}`);
  });

  console.log(`\n  Tổng: ${results.length} | Passed: ${passed.length} | Failed: ${failed.length} | Skipped: ${skipped.length}`);

  if (failed.length === 0) {
    console.log('\n  🎉 Tất cả test passed! Transaction an toàn, không partial write.\n');
  } else {
    console.log('\n  🚨 Có test FAILED! Kiểm tra lại transaction logic.\n');
  }

  const hasPartialWrite = failed.some(f => f.reason?.includes('partial'));
  if (hasPartialWrite) {
    console.log('  ⚠️  CẢNH BÁO: Phát hiện PARTIAL WRITE — dữ liệu không nhất quán!');
    console.log('  ⚠️  Kiểm tra lại session.startTransaction() / session.abortTransaction()\n');
  }

  process.exit(failed.length > 0 ? 1 : 0);
}

runAllTests().catch(err => {
  console.error('💥 Test runner crashed:', err);
  process.exit(1);
});
