/**
 * Distance Validation Unit Tests
 * =======================================================
 * Test cases:
 *   - distance = -1   → 400 INVALID_DISTANCE
 *   - distance = 0    → 400 INVALID_DISTANCE
 *   - distance = 1000 → 400 INVALID_DISTANCE (outlier)
 *   - distance valid  → 200 OK
 *
 * Run: npx jest tests/distance_validation.test.js
 * Or:  node tests/distance_validation.test.js (manual mode)
 */

const axios = require('axios');

// ── CONFIG ──────────────────────────────────────────────
const BASE_URL = process.env.PRICING_SERVICE_URL || 'http://localhost:3007';
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';
const MAX_DISTANCE_KM = parseFloat(process.env.MAX_DISTANCE) || 50;
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || null; // optional for gateway tests

// ── HELPERS ──────────────────────────────────────────────
async function callEstimate(distance_km, useGateway = false) {
  const url = useGateway
    ? `${GATEWAY_URL}/api/pricing/estimate`
    : `${BASE_URL}/pricing/estimate`;

  const headers = {
    'Content-Type': 'application/json',
    ...(useGateway && AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
  };

  try {
    const resp = await axios.post(
      url,
      { distance_km, duration_min: 10, vehicle_type: 'ECONOMY' },
      { headers, validateStatus: () => true, timeout: 5000 }
    );
    return resp;
  } catch (err) {
    throw new Error(`Request failed: ${err.message}`);
  }
}

// ── TEST RUNNER ──────────────────────────────────────────
let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     → ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// ── TEST SUITES ──────────────────────────────────────────
async function runPricingServiceTests() {
  console.log('\n📦 Pricing Service — Distance Validation Tests');
  console.log(`   Target: ${BASE_URL}  |  MAX_DISTANCE=${MAX_DISTANCE_KM} km\n`);

  await test('distance = -1 → 400 INVALID_DISTANCE', async () => {
    const resp = await callEstimate(-1);
    assert(resp.status === 400, `Expected 400, got ${resp.status}`);
    assert(resp.data?.error === 'INVALID_DISTANCE', `Expected error=INVALID_DISTANCE, got ${JSON.stringify(resp.data)}`);
  });

  await test('distance = 0 → 400 INVALID_DISTANCE', async () => {
    const resp = await callEstimate(0);
    assert(resp.status === 400, `Expected 400, got ${resp.status}`);
    assert(resp.data?.error === 'INVALID_DISTANCE', `Expected error=INVALID_DISTANCE, got ${JSON.stringify(resp.data)}`);
  });

  await test('distance = 1000 → 400 INVALID_DISTANCE (outlier)', async () => {
    const resp = await callEstimate(1000);
    assert(resp.status === 400, `Expected 400, got ${resp.status}`);
    assert(resp.data?.error === 'INVALID_DISTANCE', `Expected error=INVALID_DISTANCE, got ${JSON.stringify(resp.data)}`);
  });

  await test(`distance = MAX_DISTANCE + 1 (${MAX_DISTANCE_KM + 1}) → 400 INVALID_DISTANCE`, async () => {
    const resp = await callEstimate(MAX_DISTANCE_KM + 1);
    assert(resp.status === 400, `Expected 400, got ${resp.status}`);
    assert(resp.data?.error === 'INVALID_DISTANCE', `Expected error=INVALID_DISTANCE, got ${JSON.stringify(resp.data)}`);
  });

  await test('distance = 10 (valid) → 200 OK', async () => {
    const resp = await callEstimate(10);
    assert(resp.status === 200, `Expected 200, got ${resp.status} — body: ${JSON.stringify(resp.data)}`);
  });

  await test('distance = 1 (boundary, valid) → 200 OK', async () => {
    const resp = await callEstimate(1);
    assert(resp.status === 200, `Expected 200, got ${resp.status} — body: ${JSON.stringify(resp.data)}`);
  });

  await test(`distance = ${MAX_DISTANCE_KM} (boundary max, valid) → 200 OK`, async () => {
    const resp = await callEstimate(MAX_DISTANCE_KM);
    assert(resp.status === 200, `Expected 200, got ${resp.status} — body: ${JSON.stringify(resp.data)}`);
  });

  await test('distance = NaN (string "abc") → 400 INVALID_DISTANCE', async () => {
    const resp = await callEstimate('abc');
    assert(resp.status === 400, `Expected 400, got ${resp.status}`);
    assert(resp.data?.error === 'INVALID_DISTANCE', `Expected error=INVALID_DISTANCE, got ${JSON.stringify(resp.data)}`);
  });
}

async function runAiServiceTests() {
  // NOTE: backend/ai-service is a LEGACY standalone service (Node.js mock).
  // It is NOT included in docker-compose.yml and is NOT deployed in production.
  // Its functions have been replaced by:
  //   - ai-matching-service (port 4001)
  //   - ai-eta-service      (port 4002)
  //   - ai-surge-service    (port 4003)
  //
  // The fail-safe clamp code added to ai-service/src/index.js still provides
  // safety if that service ever runs standalone (e.g., local dev on port 8000).
  // In automated testing, we skip these tests when the service is not reachable.

  const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  console.log(`\n🤖 AI Service (Legacy) — Fail-Safe Clamp Tests`);
  console.log(`   Target: ${AI_URL}`);
  console.log(`   [⚠️]  This service is NOT in docker-compose.yml.`);
  console.log(`   Skip if unreachable (expected in CI/Docker environment).\n`);

  // Quick reachability check
  let reachable = false;
  try {
    await axios.get(AI_URL, { timeout: 2000, validateStatus: () => true });
    reachable = true;
  } catch (_) {
    // not running — expected
  }

  if (!reachable) {
    console.log('  ⏭️  SKIP: ai-service not reachable at', AI_URL);
    console.log('  ℹ️   The fail-safe clamp code exists in backend/ai-service/src/index.js');
    console.log('  ℹ️   To test manually: cd backend/ai-service && node src/index.js');
    return;
  }

  const callAI = async (distance_km) => {
    try {
      return await axios.post(
        `${AI_URL}/api/predict-price`,
        { distance_km, time_min: 10 },
        { validateStatus: () => true, timeout: 5000 }
      );
    } catch (err) {
      throw new Error(`AI request failed: ${err.message}`);
    }
  };

  await test('AI: distance = 1000 → NOT crash, returns clamped=true', async () => {
    const resp = await callAI(1000);
    assert(
      resp.status === 200 || resp.status === 400,
      `Expected 200 (clamped) or 400 (rejected), got ${resp.status}`
    );
    if (resp.status === 200) {
      assert(resp.data?.clamped === true, `Expected clamped=true, got ${JSON.stringify(resp.data)}`);
    }
  });

  await test('AI: distance = -1 → 400 INVALID_DISTANCE', async () => {
    const resp = await callAI(-1);
    assert(resp.status === 400, `Expected 400, got ${resp.status}`);
    assert(resp.data?.error === 'INVALID_DISTANCE', `Expected error=INVALID_DISTANCE, got ${JSON.stringify(resp.data)}`);
  });

  await test('AI: distance = 10 (valid) → 200 OK, no crash', async () => {
    const resp = await callAI(10);
    assert(resp.status === 200, `Expected 200, got ${resp.status}`);
    assert(typeof resp.data?.price === 'number', `Expected numeric price in response`);
  });
}

// ── ENTRY ────────────────────────────────────────────────
(async () => {
  console.log('🔍 Distance Validation Test Suite');
  console.log('==================================');

  await runPricingServiceTests();
  await runAiServiceTests();

  console.log('\n==================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error('❌ Some tests FAILED. Fix validation before deploying.');
    process.exit(1);
  } else {
    console.log('✅ All tests PASSED.');
    process.exit(0);
  }
})();
