/**
 * FILE: tests/contract/followupsFlow.spec.ts
 * PURPOSE: Automated end-to-end HTTP contract tests for Phase 5 Follow-Up Orchestration,
 *          multilingual dispatching, operator queue, response outcome synchronization,
 *          and 3-attempt escalation state machine.
 * RUN WITH: npx playwright test tests/contract/followupsFlow.spec.ts
 */

import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:8787';

test.describe('Phase 5: Follow-Up Orchestration & Escalation Contract Suite', () => {
  let authToken: string = '';
  let traineeId: string = '';

  test.beforeAll(async ({ request }) => {
    // Register candidate
    const testPhone = `+9198${Date.now().toString().slice(-8)}`;
    const regRes = await request.post(`${API_BASE}/api/auth/register`, {
      data: {
        phone: testPhone,
        password: 'FollowUpPassword123!',
        name: 'FollowUp Test Candidate',
        email: `followup_${Date.now()}@nexis.gov.in`,
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

    // Grant consent for communications
    await request.post(`${API_BASE}/api/consent/grant`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { purpose: 'WHATSAPP_NOTIFICATIONS', version: 'v2.0' },
    });
    await request.post(`${API_BASE}/api/consent/grant`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { purpose: 'OUTCOME_TRACKING', version: 'v2.0' },
    });
  });

  test('GET /api/followups/ping returns readiness probe with checkpoints and channels', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/followups/ping`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.namespace).toBe('/api/followups');
    expect(body.status).toBe('ready');
    expect(body.checkpoints).toEqual(['T_0', 'T_30', 'T_90', 'T_180', 'T_365']);
    expect(body.channels).toContain('WHATSAPP');
    expect(body.channels).toContain('SMS');
    expect(body.channels).toContain('ASSISTED_CALL');
    expect(body.supportedLanguages).toEqual(['mr', 'hi', 'en']);
  });

  test('GET /api/followups/templates returns multilingual template catalog', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/followups/templates`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.templates).toBeDefined();
    expect(body.templates.T_30).toBeDefined();
    expect(body.templates.T_30.whatsapp.mr.header).toContain('३०');
    expect(body.templates.T_90.sms.en).toContain('90-day');
  });

  test('POST /api/followups/schedule rejects unauthenticated requests with 401', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/followups/schedule`, {
      data: {
        traineeId,
      },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /api/followups/schedule creates exactly 5 longitudinal checkpoints (T_0 to T_365)', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/followups/schedule`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        traineeId,
        completionDate: new Date().toISOString(),
        preferredLanguage: 'mr',
        district: 'Pune',
        traineeName: 'FollowUp Test Candidate',
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.scheduledCount).toBe(5);
    expect(body.attempts).toHaveLength(5);
    expect(body.attempts.map((a: any) => a.checkpoint)).toEqual(['T_0', 'T_30', 'T_90', 'T_180', 'T_365']);
  });

  test('GET /api/followups/queue returns operator outreach queue and summary metrics', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/followups/queue`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.queue)).toBe(true);
    expect(body.totalPending).toBeGreaterThanOrEqual(1);
    expect(body.mode).toBe('operational');
  });

  test('POST /api/followups/:id/dispatch executes mock message delivery with DPDP compliance', async ({ request }) => {
    // Get an attempt
    const queueRes = await request.get(`${API_BASE}/api/followups/queue?checkpoint=T_30`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const queueData = await queueRes.json();
    const attempt = queueData.queue.find((a: any) => a.traineeId === traineeId);
    expect(attempt).toBeDefined();

    const dispatchRes = await request.post(`${API_BASE}/api/followups/${attempt.id}/dispatch`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        operator: 'Officer S. Deshmukh',
      },
    });

    expect(dispatchRes.status()).toBe(200);
    const body = await dispatchRes.json();
    expect(body.ok).toBe(true);
    expect(body.attempt.status).toBe('DELIVERED');
    expect(body.consentStatus).toBe('CONSENTED');
    expect(body.dispatchedMessage).toBeDefined();
  });

  test('POST /api/followups/:id/respond logs candidate report and syncs with OutcomeEvent timeline', async ({ request }) => {
    // Get attempt
    const queueRes = await request.get(`${API_BASE}/api/followups/queue?checkpoint=T_30`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const queueData = await queueRes.json();
    const attempt = queueData.queue.find((a: any) => a.traineeId === traineeId);
    expect(attempt).toBeDefined();

    const respondRes = await request.post(`${API_BASE}/api/followups/${attempt.id}/respond`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        employmentStatus: 'EMPLOYED',
        employerName: 'Tata AutoComp Systems',
        wageBand: '20k+',
        operatorNotes: 'Verified offer letter via WhatsApp attachment',
      },
    });

    expect(respondRes.status()).toBe(200);
    const body = await respondRes.json();
    expect(body.ok).toBe(true);
    expect(body.attempt.status).toBe('RESPONDED');

    // Verify linked outcome event
    expect(body.outcomeEvent).toBeDefined();
    expect(body.outcomeEvent.milestone).toBe('M30');
    expect(body.outcomeEvent.metadata.employerName).toBe('Tata AutoComp Systems');
  });

  test('POST /api/followups/:id/escalate enforces channel transition and 3-attempt UNREACHABLE state', async ({ request }) => {
    // Schedule dedicated attempt for escalation testing
    const schedRes = await request.post(`${API_BASE}/api/followups/schedule`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        completionDate: new Date().toISOString(),
        preferredLanguage: 'en',
      },
    });
    const schedData = await schedRes.json();
    const targetAttempt = schedData.attempts[2]; // T_90

    // Attempt 1: WHATSAPP -> SMS
    const esc1 = await request.post(`${API_BASE}/api/followups/${targetAttempt.id}/escalate`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { reason: 'WhatsApp unread' },
    });
    expect(esc1.status()).toBe(200);
    const esc1Body = await esc1.json();
    expect(esc1Body.nextChannel).toBe('SMS');
    expect(esc1Body.unreachable).toBe(false);

    // Attempt 2: SMS -> ASSISTED_CALL
    const esc2 = await request.post(`${API_BASE}/api/followups/${targetAttempt.id}/escalate`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { reason: 'SMS unacknowledged' },
    });
    expect(esc2.status()).toBe(200);
    const esc2Body = await esc2.json();
    expect(esc2Body.nextChannel).toBe('ASSISTED_CALL');
    expect(esc2Body.unreachable).toBe(false);

    // Attempt 3: 3rd failed outreach -> UNREACHABLE (Statutory Rule)
    const esc3 = await request.post(`${API_BASE}/api/followups/${targetAttempt.id}/escalate`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { reason: 'Call went to voicemail' },
    });
    expect(esc3.status()).toBe(200);
    const esc3Body = await esc3.json();
    expect(esc3Body.unreachable).toBe(true);
    expect(esc3Body.attempt.status).toBe('UNREACHABLE');
    expect(esc3Body.message).toContain('missing-observation');
  });
});
