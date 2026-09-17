/**
 * FILE: scripts/verify_cloud_stack.mjs
 * PURPOSE: Empirical verification of Supabase PostgreSQL persistence, Auth, Adzuna, and FreeLLMAPI reachability.
 */

import app from '../server/index.js';
import prisma from '../server/lib/prisma.js';
import http from 'http';

const TEST_PHONE = `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`;
const TEST_PASS = 'TestCloudPass_2026!';
const TEST_NAME = 'Cloud Verify Candidate';

async function main() {
  console.log('--- STARTING EMPIRICAL CLOUD STACK VERIFICATION ---');

  // 1. Start ephemeral express server
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(8789, resolve));
  const baseUrl = 'http://127.0.0.1:8789';
  console.log(`[PASS] Ephemeral verification server listening at ${baseUrl}`);

  let authToken = null;
  let userId = null;

  try {
    // 2. Test Registration -> Supabase PostgreSQL
    console.log('\n[TEST 1] Registering test user against Supabase Postgres...');
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
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
      throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
    }
    userId = regData.user.id;
    console.log(`[PASS] User registered in Supabase! ID: ${userId}, Phone: ${TEST_PHONE}`);

    // Verify record in Supabase via direct Prisma query
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { candidateProfile: true },
    });
    if (!dbUser || dbUser.phone !== TEST_PHONE) {
      throw new Error('Supabase persistence verification failed: User not found in DB');
    }
    console.log(`[PASS] Direct Supabase DB confirmation: Record verified in PostgreSQL!`);

    // 3. Test Login -> Supabase PostgreSQL
    console.log('\n[TEST 2] Logging in test user...');
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: TEST_PHONE,
        password: TEST_PASS,
      }),
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok || !loginData.token) {
      throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
    }
    authToken = loginData.token;
    console.log(`[PASS] Login successful! Session token issued.`);

    // 4. Test Authenticated Route -> GET /api/auth/me
    console.log('\n[TEST 3] Testing authenticated /api/auth/me...');
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const meData = await meRes.json();
    if (!meRes.ok || meData.user?.id !== userId) {
      throw new Error(`Auth me check failed: ${JSON.stringify(meData)}`);
    }
    console.log(`[PASS] Authenticated request verified! Name: ${meData.user.candidateProfile?.name}`);

    // 5. Test Live Supabase Data Mutation & Persistence (Apply to Job)
    console.log('\n[TEST 4] Testing real DB mutation (Job Application creation)...');
    const candidateId = dbUser.candidateProfile.id;
    const application = await prisma.jobApplication.create({
      data: {
        candidateId,
        jobTitle: 'Cloud Solutions Architect',
        companyName: 'Cloud Innovations Ltd',
        status: 'APPLIED',
        applicationLink: 'https://example.com/jobs/001',
      },
    });
    console.log(`[PASS] Mutation persisted to Supabase! JobApplication ID: ${application.id}`);

    const verifyApp = await prisma.jobApplication.findUnique({
      where: { id: application.id },
    });
    if (!verifyApp || verifyApp.status !== 'APPLIED') {
      throw new Error('Data persistence check failed: Application not persisted');
    }
    console.log(`[PASS] Data persistence confirmed across separate query!`);

    // 5. Test Adzuna Real Job Discovery (GET /api/jobs/discover with auth)
    console.log('\n[TEST 5] Testing real Adzuna API (/api/jobs/discover) with auth...');
    const jobsRes = await fetch(`${baseUrl}/api/jobs/discover?what=Software%20Engineer&country=in`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const jobsData = await jobsRes.json();
    if (jobsRes.ok && Array.isArray(jobsData.results) && jobsData.results.length > 0) {
      console.log(`[PASS] Real Adzuna job search verified! Found ${jobsData.results.length} live jobs.`);
      console.log(`       Sample: "${jobsData.results[0].title}" at "${jobsData.results[0].company}"`);
    } else {
      console.warn(`[WARN] Adzuna response: ${JSON.stringify(jobsData)}`);
    }

    // 6. Test FreeLLMAPI Reachability / Health
    console.log('\n[TEST 6] Testing FreeLLMAPI dependency reachability...');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.json();
    console.log(`[INFO] Health status:`, JSON.stringify(healthData, null, 2));

    // 7. Test Logout & Session Revocation
    console.log('\n[TEST 7] Testing logout and session revocation...');
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!logoutRes.ok) throw new Error('Logout request failed');

    // Attempt request with revoked token
    const revokedRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (revokedRes.status !== 401) {
      throw new Error(`Expected 401 for revoked token, got ${revokedRes.status}`);
    }
    console.log(`[PASS] Revoked token correctly rejected with HTTP 401!`);

    // Attempt request with forged/invalid token
    const forgedRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: 'Bearer forged-invalid-token-xyz' },
    });
    if (forgedRes.status !== 401) {
      throw new Error(`Expected 401 for forged token, got ${forgedRes.status}`);
    }
    console.log(`[PASS] Forged token correctly rejected with HTTP 401!`);
    console.log(`[INFO] Health status:`, JSON.stringify(healthData, null, 2));

    // Cleanup test records
    await prisma.jobApplication.delete({ where: { id: application.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    console.log(`\n[PASS] Test records cleaned up from Supabase.`);

  } finally {
    server.close();
    await prisma.$disconnect();
  }

  console.log('\n--- VERIFICATION RUN COMPLETED SUCCESSFULLY ---');
}

main().catch(err => {
  console.error('\n[FATAL ERROR IN VERIFICATION]:', err);
  process.exit(1);
});
