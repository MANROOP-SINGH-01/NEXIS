/**
 * FILE: tests/contract/interventionsFlow.spec.ts
 * PURPOSE: Contract test suite for Phase 10 Root-Cause & Intervention Engine.
 * SPECIFICATION: Master Spec Section 14.5, 15.3, 19.5 & Phase 10.
 */

import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:8787';

test.describe('Phase 10: Root-Cause & Intervention Engine Contract Suite', () => {
  let testAuthToken = '';

  test.beforeAll(async ({ request }) => {
    const uniquePhone = `+9196${Date.now().toString().slice(-8)}`;
    const regRes = await request.post(`${API_BASE}/api/auth/register`, {
      data: {
        phone: uniquePhone,
        password: 'InterventionContract123!',
        name: 'Intervention Contract Trainee',
        email: `intervention_trainee_${Date.now()}@nexis.gov.in`,
      },
    });

    if (regRes.ok()) {
      const regData = await regRes.json();
      testAuthToken = regData.token || '';
    }
  });

  test('GET /api/interventions/ping returns readiness probe and policy contract', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/interventions/ping`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('ready');
    expect(body.namespace).toBe('/api/interventions');
    expect(body.phase).toBe(10);
    expect(body.rootCausesCount).toBe(10);
    expect(body.humanApprovalGateRequired).toBe(true);
    expect(body.policyContract).toContain('Section 15.3');
  });

  test('GET /api/interventions/taxonomy exposes all 10 root causes and action types', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/interventions/taxonomy`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Object.keys(body.rootCauses).length).toBe(10);
    expect(body.rootCauses.SKILL_MISMATCH).toBeDefined();
    expect(body.rootCauses.EXPERIENCE_GAP).toBeDefined();
    expect(body.rootCauses.LOCATION_MISMATCH).toBeDefined();
    expect(body.rootCauses.SALARY_MISMATCH).toBeDefined();
    expect(body.rootCauses.TRANSPORT).toBeDefined();
    expect(body.rootCauses.LANGUAGE).toBeDefined();
    expect(body.rootCauses.INTERVIEW_PERFORMANCE).toBeDefined();
    expect(body.rootCauses.COURSE_RELEVANCE).toBeDefined();
    expect(body.rootCauses.EMPLOYER_DEMAND).toBeDefined();
    expect(body.rootCauses.CAREGIVING).toBeDefined();
  });

  test('Security guard: rejects unauthenticated access to protected intervention routes', async ({ request }) => {
    const r1 = await request.post(`${API_BASE}/api/interventions/diagnose`, { data: {} });
    expect(r1.status()).toBe(401);

    const r2 = await request.post(`${API_BASE}/api/interventions/recommend`, { data: {} });
    expect(r2.status()).toBe(401);

    const r3 = await request.get(`${API_BASE}/api/interventions/queue`);
    expect(r3.status()).toBe(401);

    const r4 = await request.post(`${API_BASE}/api/interventions/fake_id/deliver`, { data: {} });
    expect(r4.status()).toBe(401);
  });

  test('POST /api/interventions/diagnose evaluates candidate signals deterministically', async ({ request }) => {
    test.skip(!testAuthToken, 'Requires live auth token');

    const response = await request.post(`${API_BASE}/api/interventions/diagnose`, {
      headers: { Authorization: `Bearer ${testAuthToken}` },
      data: {
        signals: {
          skillGaps: [{ skillName: 'TypeScript', importance: 0.9, isMissing: true }],
          applicationRejections: [{ rejectionReason: 'MISSING_SKILL' }],
          surveyFeedback: { commute_barrier: true },
        },
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.count).toBeGreaterThanOrEqual(2);

    const causes = body.diagnoses.map((d: any) => d.rootCause);
    expect(causes).toContain('SKILL_MISMATCH');
    expect(causes).toContain('TRANSPORT');
  });

  test('End-to-End Intervention Workflow with Section 15.3 Human-in-the-Loop Approval Gate', async ({ request }) => {
    test.skip(!testAuthToken, 'Requires live auth token');

    // 1. Recommend an intervention from observed signals
    const recRes = await request.post(`${API_BASE}/api/interventions/recommend`, {
      headers: { Authorization: `Bearer ${testAuthToken}` },
      data: {
        signals: {
          interviewScores: [40, 52],
          applicationRejections: [{ rejectionReason: 'INTERVIEW' }],
        },
      },
    });

    expect(recRes.status()).toBe(201);
    const recBody = await recRes.json();
    expect(recBody.success).toBe(true);
    expect(recBody.count).toBeGreaterThan(0);

    const intervention = recBody.interventions.find((i: any) => i.rootCause === 'INTERVIEW_PERFORMANCE');
    expect(intervention).toBeDefined();
    expect(intervention.status).toBe('PENDING_APPROVAL');
    expect(intervention.approvedBy).toBeNull();
    const interventionId = intervention.id;

    // 2. Reviewer queue inspection
    const qRes = await request.get(`${API_BASE}/api/interventions/queue`, {
      headers: { Authorization: `Bearer ${testAuthToken}` },
    });
    expect(qRes.status()).toBe(200);
    const qBody = await qRes.json();
    const inQueue = qBody.queue.some((i: any) => i.id === interventionId);
    expect(inQueue).toBe(true);

    // 3. ATTEMPT DELIVERY BEFORE APPROVAL — MUST BE REJECTED WITH 403 (Section 15.3 Gate)
    const deliverEarlyRes = await request.post(`${API_BASE}/api/interventions/${interventionId}/deliver`, {
      headers: { Authorization: `Bearer ${testAuthToken}` },
      data: { deliveryChannel: 'IN_APP' },
    });
    expect(deliverEarlyRes.status()).toBe(403);
    const earlyBody = await deliverEarlyRes.json();
    expect(earlyBody.code).toBe('UNAPPROVED_INTERVENTION_DELIVERY_BLOCKED');
    expect(earlyBody.error).toContain('Human approval required before intervention delivery');

    // 4. Human Officer stamps approval
    const approveRes = await request.post(`${API_BASE}/api/interventions/${interventionId}/approve`, {
      headers: { Authorization: `Bearer ${testAuthToken}` },
      data: {
        approvedBy: 'District Officer K. Deshmukh',
        notes: 'Reviewed mock interview rubric; approved Nexus-Mirror drills.',
      },
    });
    expect(approveRes.status()).toBe(200);
    const approveBody = await approveRes.json();
    expect(approveBody.success).toBe(true);
    expect(approveBody.intervention.status).toBe('APPROVED');
    expect(approveBody.intervention.approvedBy).toBe('District Officer K. Deshmukh');

    // 5. DELIVER INTERVENTION AFTER APPROVAL — MUST SUCCEED WITH 200
    const deliverApprovedRes = await request.post(`${API_BASE}/api/interventions/${interventionId}/deliver`, {
      headers: { Authorization: `Bearer ${testAuthToken}` },
      data: { deliveryChannel: 'IN_APP' },
    });
    expect(deliverApprovedRes.status()).toBe(200);
    const deliverBody = await deliverApprovedRes.json();
    expect(deliverBody.success).toBe(true);
    expect(deliverBody.intervention.status).toBe('DELIVERED');

    // 6. Reassess outcome
    const reassessRes = await request.post(`${API_BASE}/api/interventions/${interventionId}/reassess`, {
      headers: { Authorization: `Bearer ${testAuthToken}` },
      data: {
        outcomeStatus: 'COMPLETED',
        notes: 'Candidate completed 3 mock interview rounds with 82% average score.',
      },
    });
    expect(reassessRes.status()).toBe(200);
    const reassessBody = await reassessRes.json();
    expect(reassessBody.success).toBe(true);
    expect(reassessBody.intervention.status).toBe('COMPLETED');
    expect(reassessBody.intervention.outcomeReassessed).toBe(true);
  });
});
