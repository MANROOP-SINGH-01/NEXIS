/**
 * FILE: tests/contract/existingEndpoints.spec.ts
 * PURPOSE: Automated API contract freeze suite for existing NEXIS endpoints
 *          and newly mounted outcome-intelligence namespaces.
 * RUN WITH: npx playwright test tests/contract
 * SPEC: Master Implementation Spec Section 14.7, Phase 1 & Section 28
 */

import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:8787';

test.describe('Phase 1: API Contract Freeze & Namespace Guardrails', () => {

  let testAuthToken: string = '';

  test.beforeAll(async ({ request }) => {
    // Obtain a live authenticated session token via the API
    const testPhone = `+9198${Date.now().toString().slice(-8)}`;
    const regRes = await request.post(`${API_BASE}/api/auth/register`, {
      data: {
        phone: testPhone,
        password: 'ContractTestPassword123!',
        name: 'Contract Test Trainee',
        email: `trainee_${Date.now()}@nexis.gov.in`,
      },
    });

    if (regRes.ok()) {
      const regData = await regRes.json();
      testAuthToken = regData.token;
    }
  });

  test.describe('1. Core Health & Feature Flag Contracts', () => {
    test('GET /api/health returns frozen health contract', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/health`);
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toMatchObject({
        status: 'ok',
        database: expect.any(String),
        llmRouter: expect.any(String),
      });
    });

    test('GET /api/feature-flags returns configured boolean registry', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/feature-flags`);
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(typeof body.OUTCOME_INTELLIGENCE_LAYER).toBe('boolean');
      expect(typeof body.DPDP_PHASE2_CONSENT).toBe('boolean');
      expect(typeof body.FOLLOWUP_ORCHESTRATION).toBe('boolean');
      expect(typeof body.EXPLAINABLE_SKILL_INTELLIGENCE).toBe('boolean');
      expect(typeof body.ADZUNA_STRUCTURED_JOBS).toBe('boolean');
      expect(typeof body.EVIDENCE_LEDGER).toBe('boolean');
    });
  });

  test.describe('2. Protected Legacy Endpoints: Authentication & Security Guardrails', () => {
    test('GET /api/jobs/discover rejects unauthenticated calls', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/jobs/discover`);
      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    test('POST /api/jobs/discover rejects unauthenticated calls', async ({ request }) => {
      const response = await request.post(`${API_BASE}/api/jobs/discover`, {
        data: { targetRole: 'Frontend Developer' },
      });
      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    test('POST /api/resume/tailor rejects unauthenticated calls', async ({ request }) => {
      const response = await request.post(`${API_BASE}/api/resume/tailor`, {
        data: { resume: 'Sample resume', jd: 'Sample JD' },
      });
      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    test('POST /api/interview/brief rejects unauthenticated calls', async ({ request }) => {
      const response = await request.post(`${API_BASE}/api/interview/brief`, {
        data: { roleTitle: 'DevOps Engineer' },
      });
      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    test('POST /api/interview/generate rejects unauthenticated calls', async ({ request }) => {
      const response = await request.post(`${API_BASE}/api/interview/generate`, {
        data: { resume: 'Dev', jd: 'JD' },
      });
      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    test('GET /api/consent rejects unauthenticated calls', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/consent`);
      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });
  });

  test.describe('3. New Route Namespaces Contract Freeze', () => {
    test('GET /api/outcomes/ping responds with ready status', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/outcomes/ping`);
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toMatchObject({
        namespace: '/api/outcomes',
        status: 'ready',
        timestamp: expect.any(String),
      });
    });

    test('GET /api/consent/ping responds with ready status', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/consent/ping`);
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toMatchObject({
        namespace: '/api/consent',
        status: 'ready',
        dpdpPhasing: expect.stringContaining('Phase-2'),
        timestamp: expect.any(String),
      });
    });

    test('GET /api/followups/ping responds with ready status and checkpoints', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/followups/ping`);
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toMatchObject({
        namespace: '/api/followups',
        status: 'ready',
        checkpoints: expect.arrayContaining(['T_0', 'T_30', 'T_90', 'T_180', 'T_365']),
        timestamp: expect.any(String),
      });
    });

    test('GET /api/skills/ping responds with ready status and evidence classes', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/skills/ping`);
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toMatchObject({
        namespace: '/api/skills',
        status: 'ready',
        evidenceClasses: expect.arrayContaining([
          'ASSESSMENT_SCORE',
          'EMPLOYER_CONFIRMED_USE',
          'COMPLETED_PROJECT',
          'CERTIFICATION',
          'RESUME_MENTION',
          'SELF_REPORT',
        ]),
        timestamp: expect.any(String),
      });
    });
  });

  test.describe('4. Authenticated Request Contract Validation', () => {
    test('GET /api/consent returns caller consent record shape when authenticated', async ({ request }) => {
      test.skip(!testAuthToken, 'Live auth token not available');
      const response = await request.get(`${API_BASE}/api/consent`, {
        headers: { Authorization: `Bearer ${testAuthToken}` },
      });
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('traineeId');
      expect(body).toHaveProperty('consent');
    });

    test('GET /api/followups/queue returns empty queue structure for foundation phase', async ({ request }) => {
      test.skip(!testAuthToken, 'Live auth token not available');
      const response = await request.get(`${API_BASE}/api/followups/queue`, {
        headers: { Authorization: `Bearer ${testAuthToken}` },
      });
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toMatchObject({
        queue: expect.any(Array),
        totalPending: 0,
        mode: 'foundation_ready',
      });
    });

    test('POST /api/skills/extract returns scaffold payload for foundation phase', async ({ request }) => {
      test.skip(!testAuthToken, 'Live auth token not available');
      const response = await request.post(`${API_BASE}/api/skills/extract`, {
        headers: { Authorization: `Bearer ${testAuthToken}` },
        data: { text: 'Proficient in TypeScript, PostgreSQL, and Express.' },
      });
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toMatchObject({
        extractedSkills: expect.any(Array),
        sourceType: 'RESUME',
        totalExtracted: 0,
        mode: 'foundation_ready',
      });
    });
  });
});
