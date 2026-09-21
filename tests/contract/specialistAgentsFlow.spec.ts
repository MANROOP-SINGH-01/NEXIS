/**
 * FILE: tests/contract/specialistAgentsFlow.spec.ts
 * PURPOSE: Contract tests for Phase 12 Outcome-Intelligence Specialist Agents REST API.
 * SPECIFICATION: Master Spec Section 15.2, 15.3, 20 & 27 (Phase 12).
 * MOUNTED AT: /api/specialist-agents
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8787';

test.describe('Phase 12: Outcome-Intelligence Specialist Agents Contract Suite', () => {
  let authToken = '';

  test.beforeAll(async ({ request }) => {
    // Acquire active session token via registration
    const uniquePhone = `+9196${Date.now().toString().slice(-8)}`;
    const regRes = await request.post(`${BASE_URL}/api/auth/register`, {
      data: {
        phone: uniquePhone,
        password: 'SpecialistAgents123!',
        name: 'Specialist Agent Reviewer',
        email: `agent_reviewer_${Date.now()}@nexis.gov.in`,
      },
    });

    if (regRes.ok()) {
      const regData = await regRes.json();
      authToken = regData.token || '';
    }
    if (!authToken) {
      authToken = 'dev_token';
    }
  });

  test('1. GET /api/specialist-agents/ping returns readiness probe and policy invariants', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/specialist-agents/ping`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('ready');
    expect(body.phase).toBe(12);
    expect(body.totalAgentsCount).toBe(11);
    expect(body.netNewSpecialistCount).toBe(8);
    expect(body.wrappedExistingCount).toBe(3);
    expect(body.mandatoryFindingSchemaVersion).toBe('15.3-standard');
    expect(body.invariants.prohibitSilentRecordAlteration).toBe(true);
    expect(body.invariants.humanReviewGateMandatoryForSensitiveInterventions).toBe(true);
    expect(body.invariants.antiVerdictDisclaimerGuaranteed).toBe(true);
    expect(body.agents).toContain('outcome-tracking');
    expect(body.agents).toContain('employment-verification');
    expect(body.agents).toContain('career-intervention');
    expect(body.agents).toContain('programme-analytics');
    expect(body.agents).toContain('policy-intelligence');
  });

  test('2. GET /api/specialist-agents/roster exposes all 11 agents with missions and splits', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/specialist-agents/roster`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.total).toBe(11);
    expect(body.roster['outcome-tracking'].name).toBe('Outcome Tracking Agent');
    expect(body.roster['career-intervention'].role).toBe('Root-Cause & Remediation Planner');
    expect(body.roster['programme-analytics'].capabilities).toContain('ANTI_OVERRANKING_EVALUATION');
  });

  test('3. POST /api/specialist-agents/run rejects unauthenticated requests with 401', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/specialist-agents/run`, {
      data: { agentId: 'data-quality', params: { traineeId: 'trn_test' } },
    });
    expect(res.status()).toBe(401);
  });

  test('4. POST /api/specialist-agents/run executes agent and emits Section 15.3 compliant finding', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/specialist-agents/run`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        agentId: 'data-quality',
        params: {
          traineeId: 'trn_contract_demo',
          certificationDate: '2025-06-01',
          employmentStartDate: '2025-02-01', // Chronology violation
        },
      },
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.agentId).toBe('data-quality');

    const fnd = body.finding;
    expect(fnd.findingId).toMatch(/^fnd_\d+_/);
    expect(fnd.agent).toBe('data-quality');
    expect(fnd.findingType).toBe('DATA_INTEGRITY_VIOLATION');
    expect(fnd.confidence).toBeGreaterThanOrEqual(90);
    expect(fnd.inferenceType).toBe('VERIFIED');
    expect(fnd.modelVersion).toBe('nexis-data-quality-v2.0');
    expect(Array.isArray(fnd.inputSources)).toBe(true);
    expect(fnd.recommendedAction?.requiresHumanApproval).toBe(true);
    expect(fnd.humanReviewStatus).toBe('PENDING');
  });

  test('5. GET /api/specialist-agents/findings returns filtered findings with authentication', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/specialist-agents/findings?agent=data-quality`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(typeof body.total).toBe('number');
    expect(Array.isArray(body.findings)).toBe(true);
  });

  test('6. POST /api/specialist-agents/findings/:id/review updates review status with officer sign-off', async ({ request }) => {
    // First generate a finding
    const runRes = await request.post(`${BASE_URL}/api/specialist-agents/run`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        agentId: 'employer-intelligence',
        params: {
          employerId: 'emp_contract_01',
          companyName: 'Apex Solar Contracting',
          contestedHiresCount: 4,
        },
      },
    });
    const runBody = await runRes.json();
    const findingId = runBody.finding.findingId;

    // Review finding
    const reviewRes = await request.post(`${BASE_URL}/api/specialist-agents/findings/${findingId}/review`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        decision: 'APPROVED',
        notes: 'Confirmed by District Skill Development Officer.',
      },
    });
    expect(reviewRes.status()).toBe(200);

    const reviewBody = await reviewRes.json();
    expect(reviewBody.success).toBe(true);
    expect(reviewBody.finding.humanReviewStatus).toBe('APPROVED');
    expect(reviewBody.finding.reviewNotes).toContain('District Skill Development Officer');
  });

  test('7. POST /api/specialist-agents/synthesize-portfolio executes cross-agent evaluation without bare verdicts', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/specialist-agents/synthesize-portfolio`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        district: 'Nashik',
        providerId: 'prov_nashik_agri_02',
        traineeId: 'trn_portfolio_01',
      },
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.findingsCount).toBe(6);
    expect(Array.isArray(body.findings)).toBe(true);

    // Assert Section 20 invariant: Programme Analytics finding has no bare verdict
    const progFinding = body.findings.find((f: any) => f.agent === 'programme-analytics');
    expect(progFinding).toBeDefined();
    expect(progFinding.summary.toLowerCase()).not.toContain('bad provider');
    expect(progFinding.summary.toLowerCase()).not.toContain('terrible');
    expect(progFinding.summary.toLowerCase()).toContain('before taking programmatic action');
    expect(progFinding.details.certificationRate).toBeDefined();
    expect(progFinding.details.placementRate).toBeDefined();
  });

  test('8. GET /api/specialist-agents/queue-status and /api/agents/queue-status report real-time telemetry (Section 15.5 Step 11)', async ({ request }) => {
    const res1 = await request.get(`${BASE_URL}/api/specialist-agents/queue-status`);
    expect(res1.status()).toBe(200);
    const body1 = await res1.json();
    expect(body1.success).toBe(true);
    expect(body1.queueName).toBe('agent-jobs');
    expect(typeof body1.depth).toBe('number');
    expect(body1.rosterCount).toBe(11);

    const res2 = await request.get(`${BASE_URL}/api/agents/queue-status`);
    expect(res2.status()).toBe(200);
    const body2 = await res2.json();
    expect(body2.success).toBe(true);
    expect(body2.queueName).toBe('agent-jobs');
  });

  test('9. POST /api/specialist-agents/enqueue and GET /jobs/:jobId executes asynchronous agent dispatch (Section 15.5 Steps 4-6)', async ({ request }) => {
    const enqueueRes = await request.post(`${BASE_URL}/api/specialist-agents/enqueue`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        jobType: 'data-quality',
        payload: {
          traineeId: 'MH-CONTRACT-QUEUE-01',
          enrollmentDate: '2025-01-01',
          certificationDate: '2025-03-01',
          employmentStartDate: '2025-03-15',
        },
      },
    });
    expect(enqueueRes.status()).toBe(202);
    const enqueueBody = await enqueueRes.json();
    expect(enqueueBody.success).toBe(true);
    expect(enqueueBody.status).toBe('QUEUED');
    expect(enqueueBody.jobId).toBeTruthy();

    // Poll status of the dispatched background job
    await new Promise((resolve) => setTimeout(resolve, 80));
    const statusRes = await request.get(`${BASE_URL}/api/specialist-agents/jobs/${enqueueBody.jobId}`);
    expect(statusRes.status()).toBe(200);
    const statusBody = await statusRes.json();
    expect(statusBody.success).toBe(true);
    expect(statusBody.job.jobId).toBe(enqueueBody.jobId);
    expect(statusBody.job.status).toBe('COMPLETED');
    expect(statusBody.job.result.finding.agent).toBe('data-quality');
  });
});
