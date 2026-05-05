const axios = require('axios');

const BASE_URL = process.env.AI_BASE_URL || 'http://localhost:3000';
const ENDPOINT = process.env.AI_ENDPOINT || '/api/ai/recommend/top-drivers';
const TOKEN = process.env.AI_BEARER_TOKEN || '';
const TOTAL_REQUESTS = Number.parseInt(process.env.AI_TOTAL_REQUESTS || '100', 10);
const CONCURRENCY = Number.parseInt(process.env.AI_CONCURRENCY || '10', 10);
const REQUEST_TIMEOUT_MS = Number.parseInt(process.env.AI_REQUEST_TIMEOUT_MS || '4000', 10);
const SLA_MS = Number.parseInt(process.env.AI_SLA_MS || '200', 10);

const payload = {
  pickup: { lat: 10.762622, lng: 106.660172 },
  top_n: 3,
  radius_km: 10,
};

const percentile = (arr, p) => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(idx, 0)];
};

const run = async () => {
  const url = `${BASE_URL}${ENDPOINT}`;
  const headers = { 'Content-Type': 'application/json' };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;

  const latencies = [];
  let success = 0;
  let non2xx = 0;
  let timeouts = 0;
  let networkErrors = 0;

  let cursor = 0;

  const worker = async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= TOTAL_REQUESTS) return;

      const start = Date.now();
      try {
        const response = await axios.post(url, payload, {
          headers,
          timeout: REQUEST_TIMEOUT_MS,
        });
        const elapsed = Date.now() - start;
        latencies.push(elapsed);

        if (response.status >= 200 && response.status < 300) {
          success += 1;
        } else {
          non2xx += 1;
        }
      } catch (error) {
        const elapsed = Date.now() - start;
        latencies.push(elapsed);

        if (error.code === 'ECONNABORTED') {
          timeouts += 1;
        } else if (error.response) {
          non2xx += 1;
        } else {
          networkErrors += 1;
        }
      }
    }
  };

  const startedAt = Date.now();
  const workerCount = Math.min(CONCURRENCY, TOTAL_REQUESTS);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  const totalDuration = Date.now() - startedAt;

  const avg = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);
  const min = latencies.length ? Math.min(...latencies) : 0;
  const max = latencies.length ? Math.max(...latencies) : 0;

  const report = {
    endpoint: url,
    totalRequests: TOTAL_REQUESTS,
    concurrency: workerCount,
    timeoutMs: REQUEST_TIMEOUT_MS,
    slaMs: SLA_MS,
    totalDurationMs: totalDuration,
    throughputRps: Number(((TOTAL_REQUESTS / totalDuration) * 1000).toFixed(2)),
    success,
    non2xx,
    timeouts,
    networkErrors,
    latencyMs: {
      min,
      avg: Number(avg.toFixed(2)),
      p50,
      p95,
      p99,
      max,
    },
  };

  console.log('\n=== AI LATENCY BENCHMARK REPORT ===');
  console.log(JSON.stringify(report, null, 2));

  const passed = p95 < SLA_MS && timeouts === 0 && non2xx === 0 && networkErrors === 0;
  console.log(`\nSLA CHECK (p95 < ${SLA_MS}ms, no timeout, no errors): ${passed ? 'PASS' : 'FAIL'}`);

  if (!passed) {
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error('Benchmark script failed:', error.message);
  process.exit(1);
});
