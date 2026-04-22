#!/usr/bin/env node
/**
 * CAB System – Newman Runner
 * Chạy Level 1 + Level 2 test cases và output Pass/Fail cho từng TC
 *
 * Cài: npm install -g newman newman-reporter-htmlextra
 * Chạy: node run-tests.js
 */

const newman = require('newman');
const path   = require('path');
const fs     = require('fs');

const COLLECTION = path.join(__dirname, 'postman-level1-level2.json');
const ENVIRONMENT = path.join(__dirname, 'postman-environment.json');
const REPORT_DIR  = path.join(__dirname, 'reports');

if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

console.log('\n======================================================');
console.log('  CAB SYSTEM – OFFICIAL TEST RUNNER (121 Test Cases)');
console.log('  Level 1 + Level 2 (TC01 – TC20)');
console.log('======================================================\n');

newman.run({
  collection: require(COLLECTION),
  environment: require(ENVIRONMENT),
  reporters: ['cli', 'json', 'htmlextra'],
  reporter: {
    json: {
      export: path.join(REPORT_DIR, `results-${timestamp}.json`)
    },
    htmlextra: {
      export: path.join(REPORT_DIR, `report-${timestamp}.html`),
      title: 'CAB System – Level 1 & 2 Official Test Results',
      browserTitle: 'CAB Test Report',
      darkTheme: true
    }
  },
  iterationCount: 1,
  timeout: 30000,
  timeoutRequest: 10000,
  bail: false, // Tiếp tục dù có fail
  delayRequest: 200
}, (err, summary) => {
  console.log('\n======================================================');
  console.log('                   TEST SUMMARY');
  console.log('======================================================');

  if (err) {
    console.error('Newman run error:', err);
    process.exit(1);
  }

  const run = summary.run;
  const stats = run.stats;

  // Print per-test results
  const failures = {};
  run.failures.forEach(f => {
    const key = `${f.source.name}`;
    if (!failures[key]) failures[key] = [];
    failures[key].push(f.error.message);
  });

  let passed = 0, failed = 0;
  run.executions.forEach(exec => {
    const name = exec.item.name;
    const assertions = exec.assertions || [];
    assertions.forEach(a => {
      if (a.error) {
        console.log(`  ❌ FAIL  | ${name} >> ${a.assertion}`);
        console.log(`           ↳ ${a.error.message}`);
        failed++;
      } else {
        console.log(`  ✅ PASS  | ${name} >> ${a.assertion}`);
        passed++;
      }
    });
  });

  console.log('\n------------------------------------------------------');
  console.log(`  Assertions: ${passed} PASSED, ${failed} FAILED`);
  console.log(`  Requests:   ${stats.requests.total} total, ${stats.requests.failed} failed`);
  console.log(`  HTTP Errors: ${run.failures.length}`);
  console.log('------------------------------------------------------');
  console.log(`\n  📄 HTML Report: ${path.join(REPORT_DIR, `report-${timestamp}.html`)}`);
  console.log('======================================================\n');

  if (failed > 0 || stats.requests.failed > 0) {
    process.exit(1);
  }
});
