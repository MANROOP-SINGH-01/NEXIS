import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:8787';

test.describe('Phase 9: Self-Employment & Apprenticeship Outcome Flow Contract Suite', () => {
  let testAuthToken: string = '';
  let testTraineeId: string = '';

  test.beforeAll(async ({ request }) => {
    const uniquePhone = `+9198${Date.now().toString().slice(-8)}`;
    const regRes = await request.post(`${API_BASE}/api/auth/register`, {
      data: {
        phone: uniquePhone,
        password: 'Phase9Password123!',
        name: 'Phase 9 Livelihoods Trainee',
        email: `p9_trainee_${Date.now()}@nexis.gov.in`,
      },
    });

    if (regRes.ok()) {
      const regData = await regRes.json();
      testAuthToken = regData.token || '';
      testTraineeId = regData.user?.trainee?.id || regData.user?.id || '';

      // Grant OUTCOME_TRACKING consent
      await request.post(`${API_BASE}/api/consent/grant`, {
        headers: { Authorization: `Bearer ${testAuthToken}` },
        data: { purpose: 'OUTCOME_TRACKING' },
      });
    }
  });

  test('GET /api/outcomes/ping includes Phase 9 livelihood and apprenticeship event types', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/outcomes/ping`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.supportedEvents).toContain('APPRENTICESHIP');
    expect(body.supportedEvents).toContain('APPRENTICESHIP_CONVERSION');
    expect(body.supportedEvents).toContain('SELF_EMPLOYED');
    expect(body.supportedEvents).toContain('FREELANCE');
    expect(body.supportedEvents).toContain('GIG_WORK');
    expect(body.supportedEvents).toContain('AGRICULTURE');
  });

  test('POST /api/outcomes/self-employment rejects unauthenticated requests with 401', async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/outcomes/self-employment`, {
      data: {
        enterpriseType: 'MICRO_ENTERPRISE',
        businessName: 'Unauth Enterprise',
      },
    });
    expect(response.status()).toBe(401);
  });

  test('POST /api/outcomes/self-employment records micro-enterprise with Udyam verification', async ({ request }) => {
    test.skip(!testAuthToken, 'Live auth token not available');

    const response = await request.post(`${API_BASE}/api/outcomes/self-employment`, {
      headers: { Authorization: `Bearer ${testAuthToken}` },
      data: {
        enterpriseType: 'MICRO_ENTERPRISE',
        businessName: 'Arohi Solar Energy Solutions',
        udyamNumber: 'UDYAM-MH-18-0091244',
        monthlyRevenueBand: '20-30k',
        roleRelevance: 'DIRECTLY_RELATED',
        milestone: 'M90',
      },
    });
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.event.eventType).toBe('SELF_EMPLOYED');
    expect(body.event.milestone).toBe('M90');
    expect(body.event.verificationStatus).toBe('DOCUMENT_VERIFIED');
    expect(body.event.verificationSource).toBe('UDYAM_REGISTRATION');
    expect(body.event.confidenceScore).toBe(0.85);
    expect(body.event.metadata.enterpriseType).toBe('MICRO_ENTERPRISE');
  });

  test('POST /api/outcomes/apprenticeship-conversion records NAPS conversion to salaried staff', async ({ request }) => {
    test.skip(!testAuthToken, 'Live auth token not available');

    const response = await request.post(`${API_BASE}/api/outcomes/apprenticeship-conversion`, {
      headers: { Authorization: `Bearer ${testAuthToken}` },
      data: {
        employerName: 'Godrej & Boyce Mfg Co Ltd',
        roleTitle: 'Precision Tooling Associate',
        wageBand: '20-30k',
        priorApprenticeshipMilestone: 'M365',
      },
    });
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.event.eventType).toBe('APPRENTICESHIP_CONVERSION');
    expect(body.event.verificationStatus).toBe('API_VERIFIED');
    expect(body.event.verificationSource).toBe('NAPS_PORTAL');
    expect(body.event.confidenceScore).toBe(0.95);
    expect(body.event.metadata.isRetained).toBe(true);
  });
});
