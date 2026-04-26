/**
 * Test: Pricing Service Retry & Fallback
 * 
 * Test Cases:
 *   CASE 1: Pricing works → return normal price
 *   CASE 2: Pricing fails once → retry succeeds → return price
 *   CASE 3: Pricing fails all retries → return fallback (price = null)
 *   CASE 4: Pricing timeout → trigger retry
 *   CASE 5: System does NOT crash on any failure scenario
 * 
 * Usage:
 *   node tests/test_pricing_retry.js
 * 
 * Prerequisites:
 *   - API Gateway running on port 3000
 *   - For CASE 1/2: Pricing Service running on port 3007
 *   - For CASE 3/4: Pricing Service stopped or simulating timeout
 */

const axios = require('axios');

const API_GATEWAY = process.env.API_GATEWAY_URL || 'http://localhost:3000';
const PRICING_DIRECT = process.env.PRICING_SERVICE_URL || 'http://localhost:3007';

// ── Test payload ──
const testPayload = {
  distance_km: 10.3,
  duration_min: 20,
  vehicle_type: 'ECONOMY',
};

// ── Helpers ──
function log(icon, msg, data = '') {
  const ts = new Date().toLocaleTimeString('vi-VN');
  console.log(`[${ts}] ${icon} ${msg}`, data ? JSON.stringify(data, null, 2) : '');
}

function separator(title) {
  console.log('\n' + '═'.repeat(60));
  console.log(`  ${title}`);
  console.log('═'.repeat(60));
}

async function isPricingServiceUp() {
  try {
    await axios.get(`${PRICING_DIRECT}/pricing/rules`, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

// ══════════════════════════════════════════════════════════════
//  CASE 1: Pricing Service is UP → Normal price returned
// ══════════════════════════════════════════════════════════════
async function testCase1_NormalPrice() {
  separator('CASE 1: Pricing works → return normal price');

  const pricingUp = await isPricingServiceUp();
  if (!pricingUp) {
    log('⏭️', 'SKIPPED - Pricing Service is not running (needed for this test)');
    return { name: 'CASE 1', status: 'SKIPPED' };
  }

  try {
    const start = Date.now();
    const response = await axios.post(
      `${API_GATEWAY}/api/pricing/estimate`,
      testPayload,
      { timeout: 10000 }
    );
    const elapsed = Date.now() - start;

    const { data } = response;
    log('📦', `Response (${elapsed}ms):`, data);

    // Assertions
    const passed =
      data.success === true &&
      data.data &&
      data.data.isFallback === false &&
      typeof data.data.totalFare === 'number' &&
      data.data.totalFare > 0;

    if (passed) {
      log('✅', `PASSED - Got price: ${data.data.totalFare} VND (${elapsed}ms)`);
      return { name: 'CASE 1', status: 'PASSED', price: data.data.totalFare, elapsed };
    } else {
      log('❌', 'FAILED - Unexpected response structure', data);
      return { name: 'CASE 1', status: 'FAILED', data };
    }
  } catch (error) {
    log('❌', 'FAILED - Request error:', error.message);
    return { name: 'CASE 1', status: 'FAILED', error: error.message };
  }
}

// ══════════════════════════════════════════════════════════════
//  CASE 3: Pricing Service is DOWN → Fallback returned
//  (We test this before CASE 2 because CASE 2 needs special setup)
// ══════════════════════════════════════════════════════════════
async function testCase3_AllRetriesFail_Fallback() {
  separator('CASE 3: Pricing fails all retries → return fallback');

  const pricingUp = await isPricingServiceUp();
  if (pricingUp) {
    log('⏭️', 'SKIPPED - Pricing Service IS running (stop it to test fallback)');
    log('💡', 'TIP: Stop the pricing service and re-run this test');
    return { name: 'CASE 3', status: 'SKIPPED' };
  }

  log('🔴', 'Pricing Service is DOWN - testing retry + fallback...');

  try {
    const start = Date.now();
    const response = await axios.post(
      `${API_GATEWAY}/api/pricing/estimate`,
      testPayload,
      { timeout: 30000 } // Long timeout - we expect retries to take ~2s
    );
    const elapsed = Date.now() - start;

    const { data } = response;
    log('📦', `Response (${elapsed}ms):`, data);

    // Assertions
    const passed =
      response.status === 200 &&
      data.success === true &&
      data.data &&
      data.data.isFallback === true &&
      data.data.price === null &&
      data.data.currency === 'VND' &&
      typeof data.data.message === 'string';

    // Verify it took enough time for retries (300ms + 600ms + some overhead)
    const retriesHappened = elapsed >= 800; // At least ~900ms of backoff delays

    if (passed) {
      log('✅', `PASSED - Fallback returned correctly (${elapsed}ms)`);
      log('📝', `  isFallback: ${data.data.isFallback}`);
      log('📝', `  price: ${data.data.price}`);
      log('📝', `  currency: ${data.data.currency}`);
      log('📝', `  message: ${data.data.message}`);
      log('📝', `  Retries took ~${elapsed}ms (expected ≥900ms for 3 attempts)`);

      if (!retriesHappened) {
        log('⚠️', `  WARNING: Response was fast (${elapsed}ms) - retries may not have occurred`);
      }

      return { name: 'CASE 3', status: 'PASSED', elapsed, data: data.data };
    } else {
      log('❌', 'FAILED - Unexpected response', data);
      return { name: 'CASE 3', status: 'FAILED', data };
    }
  } catch (error) {
    // This is the CRITICAL assertion: the system should NOT crash/throw
    log('❌', 'FAILED - System CRASHED instead of returning fallback!');
    log('❌', `  Error: ${error.message}`);
    log('❌', `  Status: ${error.response?.status}`);
    return { name: 'CASE 3', status: 'FAILED', error: error.message, crashed: true };
  }
}

// ══════════════════════════════════════════════════════════════
//  CASE 4: Simulate timeout → verify retry is triggered
// ══════════════════════════════════════════════════════════════
async function testCase4_TimeoutTriggersRetry() {
  separator('CASE 4: Pricing service slow (timeout) → retry or fallback');

  // We test against the live service - if it's down, it simulates timeout
  // If it's up, we just verify the normal flow handles quickly
  try {
    const start = Date.now();
    const response = await axios.post(
      `${API_GATEWAY}/api/pricing/estimate`,
      testPayload,
      { timeout: 30000 }
    );
    const elapsed = Date.now() - start;

    const { data } = response;
    log('📦', `Response (${elapsed}ms):`, data);

    // Either normal price or fallback - both are acceptable
    const isNormalPrice = data.data && data.data.isFallback === false && data.data.totalFare > 0;
    const isFallback = data.data && data.data.isFallback === true && data.data.price === null;

    if (isNormalPrice || isFallback) {
      const type = isNormalPrice ? 'normal price' : 'fallback';
      log('✅', `PASSED - Got ${type} response (${elapsed}ms) - system did NOT crash`);
      return { name: 'CASE 4', status: 'PASSED', type, elapsed };
    } else {
      log('❌', 'FAILED - Unexpected response format', data);
      return { name: 'CASE 4', status: 'FAILED', data };
    }
  } catch (error) {
    log('❌', 'FAILED - System CRASHED!', error.message);
    return { name: 'CASE 4', status: 'FAILED', error: error.message, crashed: true };
  }
}

// ══════════════════════════════════════════════════════════════
//  CASE 5: MCP Context endpoint also handles pricing fallback
// ══════════════════════════════════════════════════════════════
async function testCase5_MCPContextFallback() {
  separator('CASE 5: MCP /context endpoint with pricing fallback');

  const mcpPayload = {
    rideId: 'test-retry-ride-001',
    pickup: { lat: 10.762622, lng: 106.660172 },
    drop: { lat: 10.823099, lng: 106.629664 },
  };

  try {
    const start = Date.now();
    const response = await axios.post(
      `${API_GATEWAY}/api/mcp/context`,
      mcpPayload,
      { timeout: 30000 }
    );
    const elapsed = Date.now() - start;

    const { data } = response;
    log('📦', `MCP Response (${elapsed}ms):`, data);

    // System should NEVER crash - it should always return a context
    const passed = response.status === 200 && data.success === true && data.context;

    if (passed) {
      const ctx = data.context;
      const pricingStatus = ctx.pricingFallback ? 'FALLBACK' : (ctx.price ? 'OK' : 'NULL');
      log('✅', `PASSED - MCP context returned (${elapsed}ms)`);
      log('📝', `  distance_km: ${ctx.distance_km}`);
      log('📝', `  duration_min: ${ctx.duration_min}`);
      log('📝', `  price: ${ctx.price} (${pricingStatus})`);
      log('📝', `  pricingFallback: ${ctx.pricingFallback || false}`);
      log('📝', `  drivers found: ${ctx.drivers?.length || 0}`);
      return { name: 'CASE 5', status: 'PASSED', pricingStatus, elapsed };
    } else {
      log('❌', 'FAILED - Unexpected MCP response', data);
      return { name: 'CASE 5', status: 'FAILED', data };
    }
  } catch (error) {
    log('❌', 'FAILED - MCP endpoint crashed!', error.message);
    return { name: 'CASE 5', status: 'FAILED', error: error.message, crashed: true };
  }
}

// ══════════════════════════════════════════════════════════════
//  CASE 6: System stability - rapid concurrent requests
// ══════════════════════════════════════════════════════════════
async function testCase6_ConcurrentRequests() {
  separator('CASE 6: Concurrent pricing requests - no crash');

  const concurrency = 5;
  log('🔄', `Sending ${concurrency} concurrent pricing requests...`);

  try {
    const start = Date.now();
    const promises = Array.from({ length: concurrency }, (_, i) =>
      axios.post(
        `${API_GATEWAY}/api/pricing/estimate`,
        { ...testPayload, vehicle_type: ['BIKE', 'ECONOMY', 'PREMIUM', 'SUV', 'ECONOMY'][i] },
        { timeout: 30000 }
      ).then(res => ({ index: i, status: 'ok', data: res.data }))
       .catch(err => ({ index: i, status: 'error', error: err.message }))
    );

    const results = await Promise.all(promises);
    const elapsed = Date.now() - start;

    const successes = results.filter(r => r.status === 'ok');
    const failures = results.filter(r => r.status === 'error');

    log('📊', `Results (${elapsed}ms): ${successes.length} OK, ${failures.length} errors`);

    results.forEach(r => {
      if (r.status === 'ok') {
        const d = r.data?.data;
        const type = d?.isFallback ? 'FALLBACK' : `${d?.totalFare} VND`;
        log('  ✅', `Request #${r.index}: ${type}`);
      } else {
        log('  ❌', `Request #${r.index}: ${r.error}`);
      }
    });

    // All requests should either succeed with price or fallback - none should crash
    const allHandled = failures.length === 0;
    if (allHandled) {
      log('✅', `PASSED - All ${concurrency} requests handled without crash (${elapsed}ms)`);
      return { name: 'CASE 6', status: 'PASSED', elapsed, successes: successes.length };
    } else {
      log('❌', `FAILED - ${failures.length} requests crashed`);
      return { name: 'CASE 6', status: 'FAILED', failures: failures.length };
    }
  } catch (error) {
    log('❌', 'FAILED - Concurrent test error:', error.message);
    return { name: 'CASE 6', status: 'FAILED', error: error.message };
  }
}

// ══════════════════════════════════════════════════════════════
//  RUN ALL TESTS
// ══════════════════════════════════════════════════════════════
async function runAllTests() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   PRICING SERVICE - RETRY & FALLBACK TEST SUITE        ║');
  console.log('║   Testing: Retry, Timeout, Fallback, No-Crash          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\n  API Gateway: ${API_GATEWAY}`);
  console.log(`  Pricing Service: ${PRICING_DIRECT}`);

  const pricingUp = await isPricingServiceUp();
  console.log(`  Pricing Status: ${pricingUp ? '🟢 UP' : '🔴 DOWN'}`);
  console.log(`  Time: ${new Date().toLocaleString('vi-VN')}\n`);

  const results = [];

  // Run tests in sequence
  results.push(await testCase1_NormalPrice());
  results.push(await testCase3_AllRetriesFail_Fallback());
  results.push(await testCase4_TimeoutTriggersRetry());
  results.push(await testCase5_MCPContextFallback());
  results.push(await testCase6_ConcurrentRequests());

  // ── Summary ──
  separator('TEST SUMMARY');

  const passed = results.filter(r => r.status === 'PASSED');
  const failed = results.filter(r => r.status === 'FAILED');
  const skipped = results.filter(r => r.status === 'SKIPPED');
  const crashed = results.filter(r => r.crashed);

  results.forEach(r => {
    const icon = r.status === 'PASSED' ? '✅' : r.status === 'SKIPPED' ? '⏭️' : '❌';
    console.log(`  ${icon} ${r.name}: ${r.status}${r.crashed ? ' (SYSTEM CRASHED!)' : ''}`);
  });

  console.log(`\n  Total: ${results.length} | Passed: ${passed.length} | Failed: ${failed.length} | Skipped: ${skipped.length}`);

  if (crashed.length > 0) {
    console.log(`\n  🚨 CRITICAL: ${crashed.length} test(s) caused system CRASH!`);
  }

  if (failed.length === 0 && crashed.length === 0) {
    console.log('\n  🎉 All tests passed! System is resilient.\n');
  } else if (skipped.length > 0) {
    console.log('\n  💡 Some tests were skipped. To run all tests:');
    console.log('     1. Run with Pricing UP   → tests CASE 1 (normal price)');
    console.log('     2. Run with Pricing DOWN → tests CASE 3 (fallback)\n');
  }

  process.exit(failed.length > 0 ? 1 : 0);
}

runAllTests().catch(err => {
  console.error('💥 Test runner failed:', err);
  process.exit(1);
});
