import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:8787';

test.describe('Phase 8: Employment Verification & Evidence Ledger Contract Suite', () => {
  let testAuthToken = '';

  test.beforeAll(async ({ request }) => {
    // Register a fresh trainee session
    const uniquePhone = `+9197${Date.now().toString().slice(-8)}`;
    const regRes = await request.post(`${API_BASE}/api/auth/register`, {
      data: {
        phone: uniquePhone,
        password: 'VerifyContractPassword123!',
        name: 'Verification Contract Trainee',
        email: `verify_trainee_${Date.now()}@nexis.gov.in`,
      },
    });

    if (regRes.ok()) {
      const regData = await regRes.json();
      testAuthToken = regData.token || '';
    }
  });

  test('GET /api/verification/ping returns formula, weights, and evidence tiers', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/verification/ping`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('ready');
    expect(body.namespace).toBe('/api/verification');
    expect(body.formula).toBe('C = min(100, 25S + 25E + 20D + 15T + 15X)');
    expect(body.weights.S).toBe(25);
    expect(body.weights.E).toBe(25);
    expect(body.weights.D).toBe(20);
    expect(body.weights.T).toBe(15);
    expect(body.weights.X).toBe(15);
    expect(body.levels.UNVERIFIED).toBeDefined();
    expect(body.levels.SELF_REPORTED).toBeDefined();
    expect(body.levels.CONFLICTING).toBeDefined();
  });

  test('POST /api/verification/employment-records rejects unauthenticated calls with 401', async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/verification/employment-records`, {
      data: {
        employerName: 'Tata Motors',
        roleTitle: 'Production Engineer',
      },
    });
    expect(response.status()).toBe(401);
  });

  test('POST /api/verification/employment-records creates claim with initial score 25 (SELF_REPORTED)', async ({ request }) => {
    test.skip(!testAuthToken, 'Live auth token not available');

    const response = await request.post(`${API_BASE}/api/verification/employment-records`, {
      headers: { Authorization: `Bearer ${testAuthToken}` },
      data: {
        employerName: 'Bajaj Auto Ltd',
        roleTitle: 'Quality Assurance Technician',
        employmentType: 'SALARIED',
        startDate: '2024-08-01',
        wageBand: '20-30k',
      },
    });
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.record).toBeDefined();
    expect(body.record.confidenceScore).toBe(25);
    expect(body.record.levelCode).toBe('SELF_REPORTED');
    expect(body.record.evidenceLabel).toBe('Self-reported');
    expect(body.record.formula).toBe('C = min(100, 25S + 25E + 20D + 15T + 15X)');
  });

  test('POST /api/verification/employment-records/:id/evidence attaches document evidence (D=20)', async ({ request }) => {
    test.skip(!testAuthToken, 'Live auth token not available');

    // 1. Create base record
    const createRes = await request.post(`${API_BASE}/api/verification/employment-records`, {
      headers: { Authorization: `Bearer ${testAuthToken}` },
      data: {
        employerName: 'Larsen & Toubro Heavy Engineering',
        roleTitle: 'CNC Machine Operator',
      },
    });
    const { record } = await createRes.json();
    expect(record.confidenceScore).toBe(25);

    // 2. Attach documentary evidence
    const evidenceRes = await request.post(`${API_BASE}/api/verification/employment-records/${record.id}/evidence`, {
      headers: { Authorization: `Bearer ${testAuthToken}` },
      data: {
        evidenceLevel: 'DOCUMENT_PAYSLIP',
        evidenceType: 'PAYSLIP',
        documentRef: 's3://evidence/lt_payslip_aug2024.pdf',
        notes: 'Pay slip verified by trainee submission',
      },
    });
    expect(evidenceRes.status()).toBe(200);

    const evBody = await evidenceRes.json();
    expect(evBody.record.confidenceScore).toBe(45); // 25 + 20
    expect(evBody.record.levelCode).toBe('SELF_REPORTED');
    expect(evBody.record.breakdown.D.value).toBe(true);
  });

  test('POST /api/verification/verify/:token/resolve with CONTESTED enforces CONFLICTING status without data deletion', async ({ request }) => {
    const fakeToken = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    const resolveRes = await request.post(`${API_BASE}/api/verification/verify/${fakeToken}/resolve`, {
      data: {
        decision: 'CONTESTED',
        verifiedByName: 'Ramesh Kulkarni (Plant HR Head)',
        reasonCode: 'CANDIDATE_NEVER_JOINED',
        reasonNotes: 'No employment record exists under this employee name.',
      },
    });
    expect(resolveRes.status()).toBe(200);

    const body = await resolveRes.json();
    expect(body.status).toBe('CONFLICTING');
    expect(body.disputeFlag).toBe(true);
    expect(body.levelCode).toBe('CONFLICTING');
    expect(body.evidenceLabel).toBe('Conflicting evidence');
    expect(body.disputeDetails.contestedBy).toBe('Ramesh Kulkarni (Plant HR Head)');
    expect(body.disputeDetails.reasonCode).toBe('CANDIDATE_NEVER_JOINED');
  });
});
