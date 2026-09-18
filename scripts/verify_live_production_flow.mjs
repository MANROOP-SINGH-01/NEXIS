/**
 * FILE: scripts/verify_live_production_flow.mjs
 * PURPOSE: End-to-end empirical verification of live Vercel deployment and Supabase DB.
 * TARGET: https://nexis-forge.vercel.app
 */

const BASE_URL = 'https://nexis-forge.vercel.app';

async function verifyProduction() {
  console.log('================================================================');
  console.log(`Pinging Live Production Server: ${BASE_URL}`);
  console.log('================================================================\n');

  const results = [];

  // Step 1: Health Check
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    const json = await res.json();
    console.log('[STEP 1] /api/health ->', res.status, json);
    if (res.status === 200 && json.database === 'connected') {
      results.push({ step: '1. Production Health & DB Connection', status: 'PASS', details: json });
    } else {
      results.push({ step: '1. Production Health & DB Connection', status: 'FAIL', details: json });
    }
  } catch (err) {
    console.error('Step 1 failed:', err.message);
    results.push({ step: '1. Production Health', status: 'FAIL', error: err.message });
  }

  // Step 2: Register fresh candidate
  const uniquePhone = `+919999${Math.floor(100000 + Math.random() * 900000)}`;
  const password = 'ProductionHardenedPass!2026';
  let token = '';
  let userId = '';

  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: uniquePhone,
        password,
        name: 'Live Production Test User',
        email: `prod_test_${Date.now()}@nexis.example`,
      }),
    });
    const json = await res.json();
    console.log('[STEP 2] /api/auth/register ->', res.status);
    if (res.status === 201 && json.token) {
      token = json.token;
      userId = json.user.id;
      results.push({ step: '2. User Registration', status: 'PASS', details: `User ID: ${userId}` });
    } else {
      results.push({ step: '2. User Registration', status: 'FAIL', error: json });
    }
  } catch (err) {
    results.push({ step: '2. User Registration', status: 'FAIL', error: err.message });
  }

  // Step 3: Negative test - Duplicate registration rejection
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: uniquePhone,
        password,
        name: 'Duplicate Candidate',
      }),
    });
    console.log('[STEP 3] Duplicate phone registration ->', res.status);
    if (res.status === 409) {
      results.push({ step: '3. Duplicate Phone Rejection (409)', status: 'PASS' });
    } else {
      results.push({ step: '3. Duplicate Phone Rejection (409)', status: 'FAIL', statusReturned: res.status });
    }
  } catch (err) {
    results.push({ step: '3. Duplicate Phone Rejection', status: 'FAIL', error: err.message });
  }

  // Step 4: Negative test - Invalid password login rejection
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: uniquePhone,
        password: 'IncorrectPassword999',
      }),
    });
    console.log('[STEP 4] Invalid password login ->', res.status);
    if (res.status === 401) {
      results.push({ step: '4. Bad Password Rejection (401)', status: 'PASS' });
    } else {
      results.push({ step: '4. Bad Password Rejection (401)', status: 'FAIL', statusReturned: res.status });
    }
  } catch (err) {
    results.push({ step: '4. Bad Password Rejection', status: 'FAIL', error: err.message });
  }

  // Step 5: Valid Login
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: uniquePhone,
        password,
      }),
    });
    const json = await res.json();
    console.log('[STEP 5] Valid password login ->', res.status);
    if (res.status === 200 && json.token) {
      token = json.token;
      results.push({ step: '5. Valid Login & Token Issuance', status: 'PASS' });
    } else {
      results.push({ step: '5. Valid Login & Token Issuance', status: 'FAIL', details: json });
    }
  } catch (err) {
    results.push({ step: '5. Valid Login', status: 'FAIL', error: err.message });
  }

  // Step 6: DPDP Consent recording for 4 scopes
  if (token) {
    try {
      const scopes = ['JOB_SEARCH_DATA', 'EMPLOYER_SHARING', 'ANALYTICS', 'GOVT_CROSS_CHECK'];
      let allScopesPassed = true;

      for (const scope of scopes) {
        const cRes = await fetch(`${BASE_URL}/api/consent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            scope,
            granted: true,
            version: 'v1.0-prod-audit',
          }),
        });
        if (cRes.status !== 201) allScopesPassed = false;
      }

      console.log('[STEP 6] DPDP Consent recording 4 scopes ->', allScopesPassed ? 'All 201 Created' : 'Incomplete');
      results.push({ step: '6. DPDP 4-Scope Consent Logging', status: allScopesPassed ? 'PASS' : 'FAIL' });
    } catch (err) {
      results.push({ step: '6. DPDP Consent', status: 'FAIL', error: err.message });
    }
  }

  // Step 7: RBAC Protection: Candidate attempting admin endpoint
  if (token) {
    try {
      const res = await fetch(`${BASE_URL}/api/admin/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('[STEP 7] Candidate accessing /api/admin/audit-logs ->', res.status);
      if (res.status === 403) {
        results.push({ step: '7. RBAC Admin Route Protection (403)', status: 'PASS' });
      } else {
        results.push({ step: '7. RBAC Admin Route Protection (403)', status: 'FAIL', statusReturned: res.status });
      }
    } catch (err) {
      results.push({ step: '7. RBAC Admin Route Protection', status: 'FAIL', error: err.message });
    }
  }

  // Step 8: Authenticated Profile Retrieval
  if (token) {
    try {
      const res = await fetch(`${BASE_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      console.log('[STEP 8] Authenticated /api/profile ->', res.status, json.profile?.name);
      if (res.status === 200 && json.profile) {
        results.push({ step: '8. Authenticated Profile Retrieval', status: 'PASS' });
      } else {
        results.push({ step: '8. Authenticated Profile Retrieval', status: 'FAIL', details: json });
      }
    } catch (err) {
      results.push({ step: '8. Profile Retrieval', status: 'FAIL', error: err.message });
    }
  }

  // Step 9: Query O*NET Skills Taxonomy from Live PostgreSQL Database
  try {
    const res = await fetch(`${BASE_URL}/api/career-engine/skills?limit=10`);
    const json = await res.json();
    console.log('[STEP 9] /api/career-engine/skills ->', res.status, 'Total skills in sample:', json?.skills?.length || json?.length || 0);
    if (res.status === 200) {
      results.push({ step: '9. Live O*NET Skill Taxonomy Query', status: 'PASS' });
    } else {
      results.push({ step: '9. Live O*NET Skill Taxonomy Query', status: 'FAIL', details: json });
    }
  } catch (err) {
    results.push({ step: '9. Live O*NET Skill Taxonomy Query', status: 'FAIL', error: err.message });
  }

  console.log('\n================================================================');
  console.log('LIVE PRODUCTION EMPIRICAL VERIFICATION RESULTS:');
  console.log('================================================================');
  console.table(results);

  const passedCount = results.filter(r => r.status === 'PASS').length;
  console.log(`\nScore: ${passedCount}/${results.length} PASSED`);
}

verifyProduction();
