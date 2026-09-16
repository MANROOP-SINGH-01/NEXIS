/**
 * FILE: scripts/test-phase2-career-loop.js
 * PURPOSE: Automated verification of Phase 2 (Career Loop, Job Trust Score, Multi-Signal Matching, GitHub Evidence, DPDP Audit Trail)
 */

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
  console.log('🚀 Starting Phase 2 Career Loop Verification Tests...\n');
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
    // ── TEST 1: GitHub Evidence Harvester & Auto-Verification (P1.1 / Section 14.3) ──
    console.log('--- TEST GROUP 1: GitHub Evidence & Automatic Verification ---');
    const unauthGh = await makeRequest('/api/career/github-evidence?username=torvalds');
    assert(unauthGh.status === 401, 'Unauthenticated GitHub evidence call returns 401');

    const authGh = await makeRequest('/api/career/github-evidence?username=torvalds', { headers: authHeaders });
    assert(authGh.status === 200, 'Authenticated GitHub evidence call returns 200');
    assert(Boolean(authGh.json?.evidence?.primaryLanguages), 'Returns primary languages evidence');
    assert(Array.isArray(authGh.json?.evidence?.verifiedCodeEvidence), 'Returns verified code evidence list');

    // ── TEST 2: Job Trust Score (P1.9) & Multi-Signal Matching (P1.5) ──
    console.log('\n--- TEST GROUP 2: Job Trust Score & Multi-Signal Bucketing ---');
    const jobsRes = await makeRequest('/api/jobs/discover', {
      method: 'POST',
      headers: authHeaders,
      body: {
        targetRole: 'Full Stack Engineer',
        mode: 'current',
        skillProfile: {
          candidate_skills: [
            { skill: 'React', demonstrated: true },
            { skill: 'Node.js', demonstrated: true },
            { skill: 'TypeScript', demonstrated: true }
          ]
        }
      }
    });

    assert(jobsRes.status === 200, 'POST /api/jobs/discover returns 200');
    assert(Array.isArray(jobsRes.json?.items), 'Returns items array');
    assert(jobsRes.json?.items?.length > 0, `Discovered ${jobsRes.json?.items?.length} job matches`);

    if (jobsRes.json?.items?.length > 0) {
      const job = jobsRes.json.items[0];
      // Job Trust Score verification (P1.9)
      assert(typeof job.trustScore === 'number' && job.trustScore >= 0 && job.trustScore <= 1, `Job has valid trustScore: ${job.trustScore}`);
      assert(typeof job.trustPercent === 'number', `Job has trustPercent: ${job.trustPercent}%`);
      assert(['HIGH', 'MEDIUM', 'LOW'].includes(job.trustLevel), `Job has valid trustLevel: ${job.trustLevel}`);
      assert(Array.isArray(job.trustFactors), 'Job includes transparent trustFactors breakdown');

      // Multi-Signal Scoring verification (P1.5)
      assert(typeof job.skillScore === 'number', `Job has skillScore: ${job.skillScore}%`);
      assert(typeof job.experienceScore === 'number', `Job has experienceScore: ${job.experienceScore}%`);
      assert(typeof job.titleScore === 'number', `Job has titleScore: ${job.titleScore}%`);
      assert(typeof job.projectScore === 'number', `Job has projectScore: ${job.projectScore}%`);
      assert(typeof job.overallScore === 'number', `Job has overallScore composite: ${job.overallScore}%`);

      // Bucketing
      assert(['APPLY_NOW', 'LEARN_THEN_APPLY', 'STRETCH', 'IGNORE'].includes(job.bucket), `Job correctly categorized into bucket: "${job.bucket}"`);
    }

    // ── TEST 3: Application Pipeline Tracker (P1.6 / Section 8.3) ──
    console.log('\n--- TEST GROUP 3: Application Pipeline Tracking ---');
    const firstJob = jobsRes.json?.items?.[0] || { job_title: 'Full Stack Engineer', company_name: 'Tech Corp', application_link: 'https://example.com' };
    
    const trackRes = await makeRequest('/api/career/applications', {
      method: 'POST',
      headers: authHeaders,
      body: {
        jobTitle: firstJob.job_title,
        companyName: firstJob.company_name,
        applicationLink: firstJob.application_link,
        status: 'SAVED',
      }
    });

    assert(trackRes.status === 201, 'POST /api/career/applications returns 201 Created');
    assert(trackRes.json?.application?.status === 'SAVED', 'Application status persisted as SAVED');
    assert(Boolean(trackRes.json?.application?.id), 'Application received unique id');

    // Query application pipeline
    const listAppsRes = await makeRequest('/api/career/applications', { headers: authHeaders });
    assert(listAppsRes.status === 200, 'GET /api/career/applications returns 200');
    assert(Array.isArray(listAppsRes.json?.applications), 'Returns applications list');
    assert(listAppsRes.json?.applications?.length > 0, `Found ${listAppsRes.json?.applications?.length} applications in pipeline`);
    assert(typeof listAppsRes.json?.analytics?.total === 'number', 'Pipeline includes analytics summary');

    // ── TEST 4: DPDP Consent & Immutable Audit Trail (P0.5 / Section 4.3) ──
    console.log('\n--- TEST GROUP 4: DPDP Consent & Immutable Audit Trail ---');
    const grantConsentRes = await makeRequest('/api/consent', {
      method: 'POST',
      headers: authHeaders,
      body: {
        scope: 'EMPLOYER_SHARING',
        granted: true,
        version: 'v1.1',
      }
    });

    assert(grantConsentRes.status === 201, 'POST /api/consent returns 201 Created');
    assert(grantConsentRes.json?.consentRecord?.scope === 'EMPLOYER_SHARING', 'Consent record created for EMPLOYER_SHARING');
    assert(grantConsentRes.json?.consentRecord?.granted === true, 'Consent granted status recorded');

    // Query Audit Trail
    const auditRes = await makeRequest('/api/consent/audit-trail', { headers: authHeaders });
    assert(auditRes.status === 200, 'GET /api/consent/audit-trail returns 200');
    assert(Array.isArray(auditRes.json?.consentRecords), 'Audit trail returns consentRecords array');
    assert(Array.isArray(auditRes.json?.auditEvents), 'Audit trail returns immutable auditEvents array');
    const consentAuditEvent = auditRes.json?.auditEvents?.find(e => e.action === 'CONSENT_GRANTED' || e.targetType === 'CONSENT_SCOPE');
    assert(Boolean(consentAuditEvent), 'Audit trail includes recorded CONSENT_GRANTED audit event');

  } catch (err) {
    console.error('Unexpected test error:', err);
    failed++;
  }

  console.log(`\n========================================`);
  console.log(`Phase 2 Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
