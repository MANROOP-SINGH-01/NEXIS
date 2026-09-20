/**
 * FILE: tests/contract/dpdpConsentFlow.spec.ts
 * PURPOSE: Automated end-to-end HTTP contract tests for Phase 3 DPDP Act 2023 consent flows
 *          and Defect #1 instantaneous revocation verification.
 * RUN WITH: npx playwright test tests/contract/dpdpConsentFlow.spec.ts
 */

import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:8787';

test.describe('Phase 3: DPDP Consent & Defect #1 Remediation Contract Suite', () => {
  let authToken: string = '';

  test.beforeAll(async ({ request }) => {
    // Register or login a test trainee to obtain an active session token
    const testPhone = `+9198${Date.now().toString().slice(-8)}`;
    const regRes = await request.post(`${API_BASE}/api/auth/register`, {
      data: {
        phone: testPhone,
        password: 'DpdpTestPassword123!',
        name: 'DPDP Test Trainee',
        email: `dpdp_${Date.now()}@nexis.gov.in`,
      },
    });

    expect(regRes.status()).toBe(201);
    const regData = await regRes.json();
    authToken = regData.token;
    expect(authToken).toBeTruthy();
  });

  test('GET /api/consent/purposes returns DPDP v2.0 catalog with 9 purposes and multilingual fields', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/consent/purposes`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.framework).toContain('Digital Personal Data Protection Act 2023');
    expect(body.version).toBe('v2.0');
    expect(body.purposes).toBeDefined();

    // Check OUTCOME_TRACKING
    const outcomeTracking = body.purposes.OUTCOME_TRACKING;
    expect(outcomeTracking).toBeDefined();
    expect(outcomeTracking.title.en).toBe('Longitudinal Outcome Tracking');
    expect(outcomeTracking.title.mr).toBeTruthy();
    expect(outcomeTracking.title.hi).toBeTruthy();
    expect(outcomeTracking.isEssential).toBe(true);

    // Check all 9 purposes exist
    const keys = Object.keys(body.purposes);
    expect(keys).toHaveLength(9);
  });

  test('GET /api/consent/me returns caller consent state with full purpose map', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/consent/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.traineeId).toBeTruthy();
    expect(body.consent).toBeDefined();
    expect(body.dpdpPurposes).toHaveLength(9);
  });

  test('POST /api/consent/grant grants active consent for LONGITUDINAL_SURVEY', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/consent/grant`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        purpose: 'LONGITUDINAL_SURVEY',
        version: 'v2.0',
      },
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.purpose).toBe('LONGITUDINAL_SURVEY');
    expect(body.granted).toBe(true);
    expect(body.grantedAt).toBeTruthy();
  });

  test('POST /api/consent/withdraw immediately revokes consent (Defect #1 Fix Verification)', async ({ request }) => {
    // 1. Grant consent first
    await request.post(`${API_BASE}/api/consent/grant`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { purpose: 'WAGE_ANALYSIS', version: 'v2.0' },
    });

    // Verify it is active
    const meBefore = await request.get(`${API_BASE}/api/consent/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const beforeData = await meBefore.json();
    expect(beforeData.consent.WAGE_ANALYSIS?.granted).toBe(true);

    // 2. Withdraw consent
    const withdrawRes = await request.post(`${API_BASE}/api/consent/withdraw`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        purpose: 'WAGE_ANALYSIS',
        reason: 'Candidate requested revocation in privacy dashboard',
      },
    });
    expect(withdrawRes.status()).toBe(200);

    const withdrawData = await withdrawRes.json();
    expect(withdrawData.ok).toBe(true);
    expect(withdrawData.purpose).toBe('WAGE_ANALYSIS');
    expect(withdrawData.granted).toBe(false);
    expect(withdrawData.status).toBe('REVOKED');

    // 3. DEFECT #1 VERIFICATION: Immediately check /api/consent/me to ensure revocation took effect
    const meAfter = await request.get(`${API_BASE}/api/consent/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const afterData = await meAfter.json();
    expect(afterData.consent.WAGE_ANALYSIS?.granted).toBe(false);
    expect(afterData.consent.WAGE_ANALYSIS?.revokedAt).toBeTruthy();
  });

  test('Preserved legacy POST /api/consent continues to accept legacy scope objects', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/consent`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        scope: 'JOB_SEARCH_DATA',
        granted: true,
        version: 'v1.0',
      },
    });
    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.consentRecord).toBeDefined();
    expect(body.consentRecord.scope).toBe('JOB_SEARCH_DATA');
    expect(body.consentRecord.granted).toBe(true);
  });
});
