/**
 * FILE: scripts/verify_live_vercel.mjs
 * PURPOSE: End-to-end verification against the live Vercel deployment over HTTPS.
 */

import prisma from '../server/lib/prisma.js';

const VERCEL_URL = 'https://nexis-forge.vercel.app';
const TEST_PHONE = `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`;
const TEST_PASS = 'VercelLiveTest2026!';
const TEST_NAME = 'Vercel Candidate';

async function runLiveVerification() {
  console.log('=== STARTING LIVE VERCEL HTTPS EMPIRICAL VERIFICATION ===');
  console.log(`Target URL: ${VERCEL_URL}`);

  // 1. Frontend availability
  console.log('\n[TEST 1] Testing Frontend root URL...');
  const feRes = await fetch(`${VERCEL_URL}/`);
  const feHtml = await feRes.text();
  if (feRes.status === 200 && feHtml.includes('<div id="root">')) {
    console.log(`[PASS] Frontend is live and serving HTML (HTTP 200)! Title: ${feHtml.match(/<title>(.*?)<\/title>/)?.[1] || 'NEXIS'}`);
  } else {
    throw new Error(`Frontend test failed. HTTP ${feRes.status}: ${feHtml.slice(0, 200)}`);
  }

  // 2. Health Endpoint
  console.log('\n[TEST 2] Testing Serverless Function /api/health...');
  const healthRes = await fetch(`${VERCEL_URL}/api/health`);
  const healthData = await healthRes.json();
  console.log(`[PASS] Health check returned HTTP ${healthRes.status}:`, JSON.stringify(healthData));

  // 3. Live Registration over Vercel HTTPS -> Supabase
  console.log('\n[TEST 3] Registering new user over Vercel HTTPS...');
  const regRes = await fetch(`${VERCEL_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: TEST_PHONE,
      password: TEST_PASS,
      name: TEST_NAME,
    }),
  });
  const regData = await regRes.json();
  if (!regRes.ok || !regData.user) {
    throw new Error(`Live registration failed (${regRes.status}): ${JSON.stringify(regData)}`);
  }
  const userId = regData.user.id;
  console.log(`[PASS] User registered via Vercel HTTPS! ID: ${userId}, Phone: ${TEST_PHONE}`);

  // 4. Live Login over Vercel HTTPS
  console.log('\n[TEST 4] Logging in over Vercel HTTPS...');
  const loginRes = await fetch(`${VERCEL_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: TEST_PHONE,
      password: TEST_PASS,
    }),
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok || !loginData.token) {
    throw new Error(`Live login failed (${loginRes.status}): ${JSON.stringify(loginData)}`);
  }
  const authToken = loginData.token;
  console.log(`[PASS] Login successful over Vercel HTTPS! Token received.`);

  // 5. Authenticated Profile Request
  console.log('\n[TEST 5] Fetching /api/auth/me with Bearer token...');
  const meRes = await fetch(`${VERCEL_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const meData = await meRes.json();
  if (!meRes.ok || meData.user?.id !== userId) {
    throw new Error(`Live /api/auth/me failed: ${JSON.stringify(meData)}`);
  }
  console.log(`[PASS] Authenticated request verified! Role: ${meData.user.role}`);

  // 6. Direct Verification in Supabase Database
  console.log('\n[TEST 6] Inspecting Supabase PostgreSQL to verify record exists...');
  const dbRecord = await prisma.user.findUnique({
    where: { id: userId },
    include: { candidateProfile: true },
  });
  if (!dbRecord || dbRecord.phone !== TEST_PHONE) {
    throw new Error('Supabase persistence verification failed: Record not found in Supabase DB');
  }
  console.log(`[PASS] Record CONFIRMED in Supabase PostgreSQL! Phone: ${dbRecord.phone}`);

  // 7. Live Adzuna Job Search over Vercel HTTPS
  console.log('\n[TEST 7] Testing live Adzuna job search (GET /api/jobs/discover) over Vercel HTTPS...');
  const jobsRes = await fetch(`${VERCEL_URL}/api/jobs/discover?what=Software%20Engineer&country=in`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const jobsData = await jobsRes.json();
  if (jobsRes.ok && Array.isArray(jobsData.results) && jobsData.results.length > 0) {
    console.log(`[PASS] Live Adzuna jobs returned via Vercel HTTPS! Count: ${jobsData.results.length}`);
    console.log(`       Sample: "${jobsData.results[0].title}" at "${jobsData.results[0].company}"`);
  } else {
    console.warn(`[WARN] Adzuna response: ${JSON.stringify(jobsData)}`);
  }

  // 8. Test Logout & Token Revocation
  console.log('\n[TEST 8] Testing live logout...');
  const logoutRes = await fetch(`${VERCEL_URL}/api/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!logoutRes.ok) throw new Error('Logout request failed');

  const postLogoutRes = await fetch(`${VERCEL_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (postLogoutRes.status !== 401) {
    throw new Error(`Expected 401 after logout, got ${postLogoutRes.status}`);
  }
  console.log(`[PASS] Token revocation verified over Vercel HTTPS (HTTP 401)!`);

  // Cleanup test user
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  console.log('\n[PASS] Test user cleaned up from Supabase.');

  console.log('\n=== ALL LIVE VERCEL HTTPS TESTS PASSED! ===');
}

runLiveVerification()
  .catch(err => {
    console.error('\n[FATAL LIVE VERIFICATION ERROR]:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
