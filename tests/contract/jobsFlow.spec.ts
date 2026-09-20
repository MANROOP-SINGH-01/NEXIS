/**
 * FILE: tests/contract/jobsFlow.spec.ts
 * PURPOSE: API Contract Tests for Phase 7 Adzuna Job Intelligence, 6-Factor Matching,
 *          Attribution Badge Metadata, and Zero-Google Search Fallback Guarantee.
 * RUN WITH: npx playwright test tests/contract/jobsFlow.spec.ts
 * SPEC: Master Implementation Spec Section 4.2, Section 18.1-18.3, and Phase 7 (Defect #2 Fix).
 */

import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:8787';

test.describe('Phase 7: Adzuna Job Intelligence & 6-Factor Matching Contract Suite', () => {
  let testAuthToken: string = '';

  test.beforeAll(async ({ request }) => {
    // Register a fresh trainee session
    const uniquePhone = `+9195${Date.now().toString().slice(-8)}`;
    const regRes = await request.post(`${API_BASE}/api/auth/register`, {
      data: {
        phone: uniquePhone,
        password: 'AdzunaContractPassword123!',
        name: 'Adzuna Contract Trainee',
        email: `adzuna_trainee_${Date.now()}@nexis.gov.in`,
      },
    });

    if (regRes.ok()) {
      const regData = await regRes.json();
      testAuthToken = regData.token || '';
    }
  });

  test('GET /api/jobs/weights returns 6-factor matching formula and default weights', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/jobs/weights`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.formula).toBe('M = 0.40S + 0.20E + 0.15L + 0.10Q + 0.10R + 0.05P');
    expect(body.defaultWeights).toBeDefined();
    expect(body.defaultWeights.S).toBe(0.40);
    expect(body.defaultWeights.E).toBe(0.20);
    expect(body.defaultWeights.L).toBe(0.15);
    expect(body.defaultWeights.Q).toBe(0.10);
    expect(body.defaultWeights.R).toBe(0.10);
    expect(body.defaultWeights.P).toBe(0.05);

    // Sum of default weights must equal 1.00
    const sum =
      body.defaultWeights.S +
      body.defaultWeights.E +
      body.defaultWeights.L +
      body.defaultWeights.Q +
      body.defaultWeights.R +
      body.defaultWeights.P;
    expect(Math.round(sum * 100) / 100).toBe(1.0);
  });

  test('GET /api/jobs/provider-status exposes Adzuna API health, rate limits, and Section 4.2 licensing disclosure', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/jobs/provider-status`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.provider).toContain('Adzuna');
    expect(body.rateLimit).toBeDefined();
    expect(body.rateLimit.minuteLimit).toBe(25);
    expect(body.rateLimit.dailyLimit).toBe(250);
    expect(body.licensingNotice).toContain('Section 4.2');
  });

  test('GET /api/jobs/discover rejects unauthenticated calls with 401 Unauthorized', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/jobs/discover`);
    expect(response.status()).toBe(401);
  });

  test('GET /api/jobs/discover returns structured Adzuna listings with mandatory attribution and zero Google links', async ({ request }) => {
    test.skip(!testAuthToken, 'Live auth token not available');
    const response = await request.get(`${API_BASE}/api/jobs/discover?what=Web+Developer&country=in`, {
      headers: { Authorization: `Bearer ${testAuthToken}` },
    });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.provider).toBe('adzuna');
    expect(body.attribution).toBe('Jobs by Adzuna');
    expect(body.attributionUrl).toBe('https://www.adzuna.in');
    expect(Array.isArray(body.results)).toBe(true);
    expect(body.results.length).toBeGreaterThan(0);

    for (const job of body.results) {
      expect(typeof job.title).toBe('string');
      expect(typeof job.company).toBe('string');
      expect(typeof job.link).toBe('string');
      // Crucial: Zero Google search fallback
      expect(job.link).not.toContain('google.com/search');
      expect(job.link).toContain('adzuna');
    }
  });

  test('POST /api/jobs/discover computes deterministic 6-factor score and returns real clickable postings (Defect #2 Fix)', async ({ request }) => {
    test.skip(!testAuthToken, 'Live auth token not available');
    const response = await request.post(`${API_BASE}/api/jobs/discover`, {
      headers: { Authorization: `Bearer ${testAuthToken}` },
      data: {
        targetRole: 'Full Stack Engineer',
        resume: 'Experienced with React.js, TypeScript, Node.js, and PostgreSQL.',
        mode: 'current',
        location: 'Pune, Maharashtra',
        deterministicOnly: true,
      },
    });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.mode).toBe('adzuna-provider');
    expect(body.matchingFormula).toBe('M = 0.40S + 0.20E + 0.15L + 0.10Q + 0.10R + 0.05P');
    expect(body.attribution?.attributionBadgeRequired).toBe(true);
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBeGreaterThan(0);

    for (const item of body.items) {
      expect(typeof item.job_title).toBe('string');
      expect(typeof item.company_name).toBe('string');
      expect(typeof item.application_link).toBe('string');

      // Crucial: ZERO Google search links remaining
      expect(item.application_link).not.toContain('google.com/search');
      expect(item.application_link).toContain('adzuna');

      // 6-Factor match score verification
      expect(typeof item.alignment_score).toBe('number');
      expect(item.alignment_score).toBeGreaterThanOrEqual(0);
      expect(item.alignment_score).toBeLessThanOrEqual(100);

      // Verify 6-factor breakdown object
      expect(item.sixFactorMatch).toBeDefined();
      expect(item.sixFactorMatch.breakdown).toBeDefined();
      const { S, E, L, Q, R, P } = item.sixFactorMatch.breakdown;
      expect(typeof S).toBe('number');
      expect(typeof E).toBe('number');
      expect(typeof L).toBe('number');
      expect(typeof Q).toBe('number');
      expect(typeof R).toBe('number');
      expect(typeof P).toBe('number');
    }
  });
});
