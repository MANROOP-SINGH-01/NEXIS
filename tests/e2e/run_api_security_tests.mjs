/**
 * Standalone Empirical API Security & Flow Test
 * Runs directly against Express backend app without external browser overhead.
 */
import app from '../../server/index.js';
import http from 'http';
import prisma from '../../server/lib/prisma.js';

let server;
const PORT = 8899;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function runTests() {
  console.log('--- STARTING EMPIRICAL API & SECURITY VALIDATION ---');
  
  // Start server on dedicated test port
  await new Promise((resolve) => {
    server = app.listen(PORT, '127.0.0.1', () => {
      console.log(`[TEST SERVER] Running on ${BASE_URL}`);
      resolve(true);
    });
  });

  const testPhone = `+917777${Math.floor(100000 + Math.random() * 900000)}`;
  const testPassword = 'HardenedPassword!2026';
  let sessionToken = '';
  let userId = '';

  try {
    // 1. Health check
    console.log('[TEST 1] Health check endpoint...');
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthJson = await healthRes.json();
    if (healthJson.status !== 'ok') throw new Error(`Health check failed: ${JSON.stringify(healthJson)}`);
    console.log('✓ Health check passed:', healthJson);

    // 2. Register fresh user
    console.log('[TEST 2] Register fresh user...');
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: testPhone,
        password: testPassword,
        name: 'Empirical Verification User',
        email: `verify_${Date.now()}@test.example`,
      }),
    });
    if (regRes.status !== 201) throw new Error(`Registration failed with status ${regRes.status}: ${await regRes.text()}`);
    const regJson = await regRes.json();
    sessionToken = regJson.token;
    userId = regJson.user.id;
    console.log('✓ Registration passed. User ID:', userId);

    // 3. Duplicate phone registration rejection (409)
    console.log('[TEST 3] Duplicate phone registration rejection (409)...');
    const dupRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: testPhone,
        password: testPassword,
        name: 'Duplicate Candidate',
      }),
    });
    if (dupRes.status !== 409) throw new Error(`Expected 409 for duplicate phone, got ${dupRes.status}`);
    console.log('✓ Duplicate registration correctly rejected with 409 Conflict');

    // 4. Invalid credentials login rejection (401)
    console.log('[TEST 4] Invalid credentials login rejection (401)...');
    const badLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testPhone,
        password: 'WrongPassword#999',
      }),
    });
    if (badLoginRes.status !== 401) throw new Error(`Expected 401 for bad password, got ${badLoginRes.status}`);
    console.log('✓ Invalid login correctly rejected with 401 Unauthorized');

    // 5. Valid credentials login (200)
    console.log('[TEST 5] Valid login (200)...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testPhone,
        password: testPassword,
      }),
    });
    if (loginRes.status !== 200) throw new Error(`Login failed with status ${loginRes.status}`);
    const loginJson = await loginRes.json();
    sessionToken = loginJson.token;
    console.log('✓ Valid login succeeded. Session token issued.');

    // 6. Record DPDP consent for all 4 scopes
    console.log('[TEST 6] Recording DPDP consent scopes...');
    const scopes = ['JOB_SEARCH_DATA', 'EMPLOYER_SHARING', 'ANALYTICS', 'GOVT_CROSS_CHECK'];
    for (const scope of scopes) {
      const cRes = await fetch(`${BASE_URL}/api/consent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          scope,
          granted: true,
          version: 'v1.0-sih2026',
        }),
      });
      if (cRes.status !== 201) throw new Error(`Consent record failed for scope ${scope}: ${await cRes.text()}`);
    }
    console.log('✓ All 4 DPDP consent scopes recorded successfully.');

    // 7. Verify consent audit trail retrieval
    console.log('[TEST 7] Verifying consent state...');
    const consentRes = await fetch(`${BASE_URL}/api/consent`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    const consentJson = await consentRes.json();
    if (!consentJson.consent?.JOB_SEARCH_DATA?.granted) {
      throw new Error(`Consent state not reflected properly: ${JSON.stringify(consentJson)}`);
    }
    console.log('✓ Consent state verified.');

    // 8. Role-based authorization: Candidate forbidden from admin endpoints (403)
    console.log('[TEST 8] RBAC negative test (Candidate -> Admin route)...');
    const adminRes = await fetch(`${BASE_URL}/api/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    if (adminRes.status !== 403) throw new Error(`Expected 403 for candidate accessing admin route, got ${adminRes.status}`);
    console.log('✓ Candidate correctly rejected from admin route with 403 Forbidden');

    // 9. Profile completeness and retrieval
    console.log('[TEST 9] Candidate profile retrieval...');
    const profileRes = await fetch(`${BASE_URL}/api/profile`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    if (profileRes.status !== 200) throw new Error(`Profile retrieval failed: ${await profileRes.text()}`);
    const profileJson = await profileRes.json();
    console.log('✓ Candidate profile retrieved:', profileJson.profile.name);

    // 10. DPDP Right-to-be-Forgotten: Delete profile & account
    console.log('[TEST 10] Deleting account and all personal data (DPDP compliance)...');
    const delRes = await fetch(`${BASE_URL}/api/profile`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    if (delRes.status !== 200) throw new Error(`Delete profile failed with status ${delRes.status}: ${await delRes.text()}`);
    const delJson = await delRes.json();
    console.log('✓ Account deletion successful:', delJson.message);

    // 11. Post-deletion negative test: Session must now be invalid (401)
    console.log('[TEST 11] Post-deletion access check...');
    const postDelRes = await fetch(`${BASE_URL}/api/profile`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    if (postDelRes.status !== 401) throw new Error(`Expected 401 after deletion, got ${postDelRes.status}`);
    console.log('✓ Post-deletion access correctly rejected with 401 Unauthorized.');

    console.log('\n========================================');
    console.log('ALL EMPIRICAL TESTS PASSED SUCCESSFULLY');
    console.log('========================================\n');
  } catch (err) {
    console.error('TEST FAILURE:', err);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
  }
}

runTests();
