/**
 * TEST: Concurrency and Race Condition handling in Booking Creation
 * 
 * Scenario: 
 * A passenger clicks the "Book" button 5 times simultaneously (or network retries).
 * All 5 requests have the same payload and Idempotency-Key.
 * 
 * Expected:
 * - No Race Condition: Only ONE booking should be inserted into MongoDB.
 * - No Conflict: The system handles unique constraint errors gracefully.
 * - The other 4 requests should return the same replayed booking (200 OK) 
 *   or be safely ignored without crashing the server.
 * 
 * Run with: node tests/test_concurrency_race_condition.js
 */

const axios = require('axios');

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
const api = axios.create({ baseURL: BASE, timeout: 20000, validateStatus: () => true });

async function registerAndLogin() {
  const ts = Date.now();
  const userData = {
    email: `concurrency_${ts}@test.com`, 
    password: 'password123',
    fullName: 'Concurrency Test User', 
    phone: `09${ts.toString().slice(-8)}`, 
    role: 'PASSENGER',
  };
  const reg = await api.post('/api/auth/register', userData);
  if (reg.data?.accessToken) {
    return reg.data.accessToken;
  }
  const login = await api.post('/api/auth/login', { email: userData.email, password: userData.password });
  return login.data?.accessToken;
}

async function runConcurrencyTest() {
  console.log('===============================================================');
  console.log('🚀 TEST: CONCURRENT REQUESTS (RACE CONDITION PREVENTION)');
  console.log('===============================================================\n');

  console.log('⏳ Registering test user...');
  const token = await registerAndLogin();
  if (!token) {
    console.error('❌ Failed to get auth token. Ensure Auth service is running.');
    return;
  }
  console.log('✅ User registered successfully.\n');

  const idempotencyKey = `concurrency-test-${Date.now()}`;
  const payload = {
    pickup: { lat: 10.762, lng: 106.660, address: 'Test Pickup' },
    dropoff: { lat: 10.823, lng: 106.629, address: 'Test Dropoff' },
    vehicleType: 'ECONOMY',
    estimatedPrice: 35000,
    paymentMethod: 'CASH'
  };

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
  const requestConfig = {
    ...authHeaders,
    headers: {
      ...authHeaders.headers,
      'Idempotency-Key': idempotencyKey,
    },
  };

  console.log('🔥 Bắn 5 request tạo booking CÙNG LÚC (Promise.all)...');
  console.log(`🔑 Idempotency-Key: ${idempotencyKey}`);

  // Fire 5 concurrent requests
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(api.post('/api/bookings', payload, requestConfig));
  }

  const results = await Promise.all(promises);

  console.log('\n📥 Kết quả 5 requests:');
  let createdCount = 0;
  let replayedCount = 0;
  let errorCount = 0;
  const bookingIds = new Set();

  results.forEach((res, idx) => {
    const isReplayed = res.status === 200; // API returns 200 for replayed, 201 for created
    const isCreated = res.status === 201;
    
    if (isCreated) createdCount++;
    else if (isReplayed) replayedCount++;
    else errorCount++;

    const bookingId = res.data?.data?._id || res.data?.data?.id || 'N/A';
    if (bookingId !== 'N/A') bookingIds.add(bookingId);

    console.log(`   -> Request #${idx + 1}: HTTP ${res.status} | Replayed: ${isReplayed} | Booking ID: ${bookingId}`);
  });

  console.log('\n───────────────────────────────────────────────────────────────');
  console.log('📊 TỔNG KẾT KẾT QUẢ TEST:');
  console.log(`   - Số request tạo mới thành công (HTTP 201): ${createdCount}`);
  console.log(`   - Số request được replayed (HTTP 200):      ${replayedCount}`);
  console.log(`   - Số request lỗi (HTTP 4xx/5xx):            ${errorCount}`);
  console.log(`   - Số Booking ID duy nhất tạo ra:            ${bookingIds.size}`);
  
  if (createdCount === 1 && bookingIds.size === 1 && errorCount === 0) {
    console.log('\n🎉 KẾT LUẬN: PASSED ✅');
    console.log('   Hệ thống xử lý race condition hoàn hảo!');
    console.log('   Mặc dù có 5 requests gửi đến cùng mili-giây, cơ chế Unique Index');
    console.log('   kết hợp Try/Catch (11000) đã bắt được duplicate, đảm bảo CHỈ CÓ 1');
    console.log('   booking được tạo ra và các request khác nhận lại cùng 1 kết quả.');
  } else {
    console.log('\n❌ KẾT LUẬN: FAILED');
    console.log('   Hệ thống có thể đã bị lọt dữ liệu hoặc xử lý chưa an toàn!');
  }
  console.log('───────────────────────────────────────────────────────────────\n');
}

runConcurrencyTest().catch(console.error);
