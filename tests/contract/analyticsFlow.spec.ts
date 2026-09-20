/**
 * FILE: tests/contract/analyticsFlow.spec.ts
 * PURPOSE: Contract test suite for Phase 11 Provider & District Outcome Analytics.
 * SPECIFICATION: Master Spec Section 14.6, 20 & 27 (Phase 11).
 */

import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:8787';

test.describe('Phase 11: Provider & District Analytics Contract Suite', () => {
  let testAuthToken = '';

  test.beforeAll(async ({ request }) => {
    const uniquePhone = `+9197${Date.now().toString().slice(-8)}`;
    const regRes = await request.post(`${API_BASE}/api/auth/register`, {
      data: {
        phone: uniquePhone,
        password: 'AnalyticsContract123!',
        name: 'Analytics Policy Reviewer',
        email: `analytics_officer_${Date.now()}@nexis.gov.in`,
      },
    });

    if (regRes.ok()) {
      const regData = await regRes.json();
      testAuthToken = regData.token || '';
    }
  });

  test('GET /api/analytics/ping returns readiness probe and policy invariants', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/analytics/ping`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('ready');
    expect(body.namespace).toBe('/api/analytics');
    expect(body.phase).toBe(11);
    expect(body.antiOverrankingGuaranteed).toBe(true);
    expect(body.smallCellSuppressionThreshold).toBe(5);
    expect(body.supportedDistrictsCount).toBe(36);
    expect(body.policyContract).toContain('Section 20');
  });

  test('GET /api/analytics/providers enforces authentication guard (401 without token)', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/analytics/providers`);
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.error).toContain('Unauthorized');
  });

  test('GET /api/analytics/providers returns denominator-grounded retention curves with valid auth', async ({ request }) => {
    test.skip(!testAuthToken, 'Requires valid test session token');

    const response = await request.get(`${API_BASE}/api/analytics/providers`, {
      headers: { Authorization: `Bearer ${testAuthToken}` },
    });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.antiOverrankingContract).toContain('Section 20');
    expect(body.smallCellPolicy).toBeDefined();
    expect(body.providers.length).toBeGreaterThan(0);

    const puneProvider = body.providers.find((p: any) => p.providerId === 'prov_pune_iti_01');
    expect(puneProvider).toBeDefined();
    expect(puneProvider.district).toBe('Pune');
    expect(puneProvider.certificationRate.isSuppressed).toBe(false);
    expect(puneProvider.certificationRate.confidenceInterval.confidenceLevel).toBe('95%');
    expect(puneProvider.retentionCurve.t30).toBeDefined();
    expect(puneProvider.retentionCurve.t90).toBeDefined();
    expect(puneProvider.retentionCurve.t180).toBeDefined();
    expect(puneProvider.retentionCurve.t365).toBeDefined();

    // Verify small cell suppression on provider with cohort size < 5
    const suppressedProvider = body.providers.find((p: any) => p.providerId === 'prov_gadchiroli_rural_05');
    expect(suppressedProvider).toBeDefined();
    expect(suppressedProvider.cohortSize).toBe(4);
    expect(suppressedProvider.certificationRate.isSuppressed).toBe(true);
    expect(suppressedProvider.certificationRate.displayValue).toBe('< 5');
    expect(suppressedProvider.certificationRate.percentage).toBeNull();
  });

  test('GET /api/analytics/providers supports ?district filter', async ({ request }) => {
    test.skip(!testAuthToken, 'Requires valid test session token');

    const response = await request.get(`${API_BASE}/api/analytics/providers?district=Pune`, {
      headers: { Authorization: `Bearer ${testAuthToken}` },
    });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.providers.length).toBe(1);
    expect(body.providers[0].district).toBe('Pune');
  });

  test('GET /api/analytics/districts enforces authentication and returns 36 Maharashtra districts', async ({ request }) => {
    const unauthResponse = await request.get(`${API_BASE}/api/analytics/districts`);
    expect(unauthResponse.status()).toBe(401);

    test.skip(!testAuthToken, 'Requires valid test session token');

    const response = await request.get(`${API_BASE}/api/analytics/districts`, {
      headers: { Authorization: `Bearer ${testAuthToken}` },
    });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.state).toBe('Maharashtra');
    expect(body.count).toBe(36);
    expect(body.districts.length).toBe(36);
    expect(body.stateWideSummary.totalDistricts).toBe(36);

    const gadchiroli = body.districts.find((d: any) => d.districtName === 'Gadchiroli');
    expect(gadchiroli.imbalanceStatus).toBe('HIGH_DEFICIT');
    expect(gadchiroli.demandSupplyRatio).toBeLessThan(0.45);
  });

  test('GET /api/analytics/policy-summary returns executive synthesis of district and provider data', async ({ request }) => {
    test.skip(!testAuthToken, 'Requires valid test session token');

    const response = await request.get(`${API_BASE}/api/analytics/policy-summary`, {
      headers: { Authorization: `Bearer ${testAuthToken}` },
    });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.state).toBe('Maharashtra');
    expect(body.districtCount).toBe(36);
    expect(body.principlesEnforced).toContain('Denominator transparency on all percentages');
    expect(body.principlesEnforced).toContain('Small cell suppression (< 5 masked)');
  });
});
