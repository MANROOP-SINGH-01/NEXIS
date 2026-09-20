/**
 * FILE: tests/contract/outcomesFlow.spec.ts
 * PURPOSE: Automated end-to-end HTTP contract tests for Phase 4 Longitudinal Outcome Engine,
 *          Defect #2 remediation, consent gating, and milestone retention endpoints.
 * RUN WITH: npx playwright test tests/contract/outcomesFlow.spec.ts
 */

import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:8787';

test.describe('Phase 4: Longitudinal Outcome Timeline & Defect #2 Remediation Contract Suite', () => {
  let authToken: string = '';
  let traineeId: string = '';

  test.beforeAll(async ({ request }) => {
    // Register candidate
    const testPhone = `+9198${Date.now().toString().slice(-8)}`;
    const regRes = await request.post(`${API_BASE}/api/auth/register`, {
      data: {
        phone: testPhone,
        password: 'OutcomeTestPassword123!',
        name: 'Outcome Timeline Trainee',
        email: `outcome_${Date.now()}@nexis.gov.in`,
      },
    });

    expect(regRes.status()).toBe(201);
    const regData = await regRes.json();
    authToken = regData.token;
    expect(authToken).toBeTruthy();

    // Fetch caller identity
    const meRes = await request.get(`${API_BASE}/api/consent/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(meRes.status()).toBe(200);
    const meData = await meRes.json();
    traineeId = meData.traineeId || meData.trainee?.id;
    expect(traineeId).toBeTruthy();

    // Explicitly grant OUTCOME_TRACKING consent
    const grantRes = await request.post(`${API_BASE}/api/consent/grant`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { purpose: 'OUTCOME_TRACKING', version: 'v2.0' },
    });
    expect(grantRes.status()).toBe(200);
  });

  test('GET /api/outcomes/ping returns ready probe with all 4 supported milestones', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/outcomes/ping`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.namespace).toBe('/api/outcomes');
    expect(body.status).toBe('ready');
    expect(body.supportedMilestones).toEqual(['M30', 'M90', 'M180', 'M365']);
  });

  test('POST /api/outcomes/events rejects unauthenticated requests with 401', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/outcomes/events`, {
      data: {
        eventType: 'PLACED',
        milestone: 'M30',
      },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /api/outcomes/events enforces DPDP consent check for OUTCOME_TRACKING', async ({ request }) => {
    // Revoke consent
    await request.post(`${API_BASE}/api/consent/withdraw`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { purpose: 'OUTCOME_TRACKING' },
    });

    // Attempt recording event -> Expect 403 Forbidden
    const res = await request.post(`${API_BASE}/api/outcomes/events`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        eventType: 'PLACED',
        milestone: 'M30',
      },
    });

    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('DPDP_CONSENT_REQUIRED');

    // Re-grant consent
    const regrantRes = await request.post(`${API_BASE}/api/consent/grant`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { purpose: 'OUTCOME_TRACKING', version: 'v2.0' },
    });
    expect(regrantRes.status()).toBe(200);
  });

  test('POST /api/outcomes/events records milestone transition with full provenance (Defect #2 Fix)', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/outcomes/events`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        traineeId,
        eventType: 'PLACED',
        milestone: '30_DAY',
        effectiveDate: new Date().toISOString(),
        metadata: {
          employerName: 'Infosys Limited',
          jobTitle: 'Associate Software Engineer',
          monthlySalary: 25000,
          location: 'Pune SEZ',
        },
        verificationStatus: 'API_VERIFIED',
        verificationSource: 'EPF_UAN_MATCH',
        confidenceScore: 0.98,
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.event.milestone).toBe('M30');
    expect(body.event.verificationStatus).toBe('API_VERIFIED');
    expect(body.event.verificationSource).toBe('EPF_UAN_MATCH');
    expect(body.event.confidenceScore).toBe(0.98);
  });

  test('GET /api/outcomes/trainees/:id/timeline returns chronological sequence and milestone summary', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/outcomes/trainees/${traineeId}/timeline`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.traineeId).toBe(traineeId);
    expect(Array.isArray(body.events)).toBe(true);
    expect(body.events.length).toBeGreaterThanOrEqual(1);
    expect(body.milestoneSummary).toBeDefined();
    expect(body.milestoneSummary.M30?.milestone).toBe('M30');
  });

  test('GET /api/outcomes/cohorts/:id/retention returns 30d, 90d, 180d, 365d retention curve', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/outcomes/cohorts/COHORT_2024_PUNE/retention`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.retentionCurve).toBeDefined();
    expect(body.retentionCurve.M30.retentionPct).toBe(94.1);
    expect(body.retentionCurve.M90.retentionPct).toBe(88.2);
    expect(body.retentionCurve.M180.retentionPct).toBe(81.3);
    expect(body.retentionCurve.M365.retentionPct).toBe(75.5);
  });

  test('POST /api/outcomes/events/:id/verify updates verification status with evidence provenance', async ({ request }) => {
    // Create an event first
    const createRes = await request.post(`${API_BASE}/api/outcomes/events`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        traineeId,
        eventType: 'PLACED',
        milestone: 'M90',
        verificationStatus: 'PENDING',
      },
    });

    expect(createRes.status()).toBe(201);
    const created = await createRes.json();
    const eventId = created.event.id;

    // Verify event
    const verifyRes = await request.post(`${API_BASE}/api/outcomes/events/${eventId}/verify`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        status: 'DOCUMENT_VERIFIED',
        notes: 'Verified via uploaded Form 16 / Bank Statement',
        verifiedBy: 'Officer K. Patil',
        confidenceScore: 0.96,
      },
    });

    expect(verifyRes.status()).toBe(200);
    const verifyBody = await verifyRes.json();
    expect(verifyBody.ok).toBe(true);
    expect(verifyBody.event.verificationStatus).toBe('DOCUMENT_VERIFIED');
  });

  test('Preserved legacy POST /api/trainee/status-update continues to function smoothly', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/trainee/status-update`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        employmentStatus: 'EMPLOYED',
        employerName: 'Wipro Technologies',
        wageBand: '20k+',
        notes: 'Legacy check-in update test',
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.checkIn).toBeDefined();
    expect(body.checkIn.employmentStatus).toBe('EMPLOYED');
  });
});
