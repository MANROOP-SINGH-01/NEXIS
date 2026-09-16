/**
 * FILE: scripts/test-auth-and-ratelimit.js
 * PURPOSE: Test script to verify 1A.4 (Auth on AI endpoints) and 1A.5 (Rate limiting)
 */

import http from 'http';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8787';

async function makeRequest(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = options.headers || {};
  const method = options.method || 'GET';
  const body = options.body ? JSON.stringify(options.body) : undefined;

  if (body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method,
    headers,
    body,
  });

  const json = await res.json().catch(() => null);
  return { status: res.status, headers: Object.fromEntries(res.headers.entries()), json };
}

async function runTests() {
  console.log('🚀 Starting 1A.4 and 1A.5 Verification Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // ── TEST 1: Unauthenticated requests to AI endpoints must return 401 ──
  console.log('📋 Test Suite 1: AI Endpoint Authentication (1A.4)');

  const unauthEndpoints = [
    { path: '/api/resume/extract', method: 'POST' },
    { path: '/api/resume/bullet', method: 'POST', body: {} },
    { path: '/api/resume/tailor', method: 'POST', body: {} },
    { path: '/api/resume/render-pdf', method: 'POST', body: {} },
    { path: '/api/jobs/discover', method: 'POST', body: {} },
    { path: '/api/interview/brief', method: 'POST', body: {} },
    { path: '/api/interview/generate', method: 'POST', body: {} },
    { path: '/api/interview/cross-question', method: 'POST', body: {} },
  ];

  for (const ep of unauthEndpoints) {
    const res = await makeRequest(ep.path, { method: ep.method, body: ep.body });
    assert(res.status === 401, `${ep.method} ${ep.path} without auth returns 401 (got ${res.status})`);
  }

  // ── TEST 2: Requests with dev_trainee or session token pass auth ──
  console.log('\n📋 Test Suite 2: Authenticated AI Endpoint Access');
  const authRes = await makeRequest('/api/resume/bullet', {
    method: 'POST',
    headers: { Authorization: 'Bearer dev_trainee' },
    body: { repoData: { name: 'test' } },
  });
  assert(authRes.status !== 401, `POST /api/resume/bullet with Bearer dev_trainee does not return 401 (got ${authRes.status})`);

  // ── TEST 3: OTP Rate Limiter (1A.5) ──
  console.log('\n📋 Test Suite 3: OTP Rate Limiter (max 5 per 15 min)');
  const testPhone = `+9199999${Math.floor(10000 + Math.random() * 90000)}`;

  for (let i = 1; i <= 5; i++) {
    const res = await makeRequest('/api/auth/request-otp', {
      method: 'POST',
      body: { phone: testPhone },
    });
    assert(res.status === 200, `OTP request #${i} succeeds (got ${res.status})`);
  }

  // 6th request should hit 429
  const blockedRes = await makeRequest('/api/auth/request-otp', {
    method: 'POST',
    body: { phone: testPhone },
  });
  assert(blockedRes.status === 429, `OTP request #6 returns 429 Too Many Requests (got ${blockedRes.status})`);
  assert(blockedRes.headers['retry-after'] !== undefined, `429 response contains Retry-After header`);

  // ── SUMMARY ──
  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
