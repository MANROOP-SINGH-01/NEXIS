/**
 * FILE: scripts/test-employer-and-govt.js
 * PURPOSE: Test employer verification lifecycle (request, token lookup, employer confirmation)
 *          and government registry cross-checks.
 */

import prisma from '../server/lib/prisma.js';

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
  console.log('🚀 Starting Employer Verification & Govt Check Tests...\n');
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

  const authHeaders = { Authorization: 'Bearer dev_trainee' };

  try {
    // 1. Setup dev_trainee record and consent
    let trainee = await prisma.trainee.findFirst({ where: { githubId: 'dev_trainee' } });
    if (!trainee) {
      trainee = await prisma.trainee.create({
        data: {
          githubId: 'dev_trainee',
          name: 'Developer Trainee',
          phoneNumber: '9999999999',
        },
      });
    }

    // Ensure EMPLOYER_SHARING consent is granted
    await prisma.consentRecord.create({
      data: {
        traineeId: trainee.id,
        scope: 'EMPLOYER_SHARING',
        granted: true,
        version: 'v1',
      },
    });

    // Create an EMPLOYED OutcomeCheckIn for testing
    const checkIn = await prisma.outcomeCheckIn.create({
      data: {
        traineeId: trainee.id,
        checkinType: 'SELF_INITIATED',
        status: 'COMPLETED',
        employmentStatus: 'EMPLOYED',
        employerName: 'Acme Technologies Ltd',
        wageBand: '20k+',
      },
    });

    console.log('--- TEST GROUP 1: Trainee Requests Employer Verification ---');
    const reqVerifRes = await makeRequest('/api/trainee/request-employer-verification', {
      method: 'POST',
      headers: authHeaders,
      body: {
        outcomeCheckInId: checkIn.id,
        employerContact: 'hr@acmetech.com',
      },
    });

    assert(reqVerifRes.status === 201, 'POST /api/trainee/request-employer-verification returns 201');
    const token = reqVerifRes.json?.verification?.verificationToken;
    assert(Boolean(token), 'Returns verification token');

    // 2. Employer reviews verification portal via token (public unauth endpoint)
    console.log('\n--- TEST GROUP 2: Employer Public Verification Review ---');
    const getVerifRes = await makeRequest(`/api/verify/${token}`);
    assert(getVerifRes.status === 200, `GET /api/verify/${token} returns 200`);
    assert(Boolean(getVerifRes.json?.traineeFirstName), 'Displays trainee first name accurately');
    assert(getVerifRes.json?.employerNameClaimed === 'Acme Technologies Ltd', 'Displays claimed employer name');

    // 3. Employer confirms employment
    console.log('\n--- TEST GROUP 3: Employer Confirms Employment ---');
    const confirmRes = await makeRequest(`/api/verify/${token}`, {
      method: 'POST',
      body: {
        decision: 'CONFIRMED',
        verifiedByName: 'Jane Smith',
        reasonNotes: 'Candidate joined our Bangalore engineering team and performs exceptionally.',
      },
    });

    assert(confirmRes.status === 200, `POST /api/verify/${token} returns 200`);
    assert(confirmRes.json?.verification?.status === 'CONFIRMED', 'Verification status updated to CONFIRMED');

    // 4. Token Reuse Guard
    console.log('\n--- TEST GROUP 4: Verification Token Reuse Guard ---');
    const reuseRes = await makeRequest(`/api/verify/${token}`, {
      method: 'POST',
      body: {
        decision: 'CONFIRMED',
        verifiedByName: 'Jane Smith',
      },
    });
    assert(reuseRes.status === 409, 'Re-submitting confirmed verification token returns 409 Conflict');

    // 5. Government Cross-Check History (public or authenticated)
    console.log('\n--- TEST GROUP 5: Government Cross-Check History ---');
    const govtHistRes = await makeRequest(`/api/trainee/govt-crosscheck-history/${trainee.id}`);
    assert(govtHistRes.status === 200, `GET /api/trainee/govt-crosscheck-history/${trainee.id} returns 200`);
    assert(Array.isArray(govtHistRes.json?.history), 'Returns history array');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log(`\n========================================`);
  console.log(`Employer & Govt Tests: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
