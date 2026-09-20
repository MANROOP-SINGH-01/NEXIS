/**
 * FILE: tests/unit/followupEscalation.spec.ts
 * PURPOSE: Unit tests for Phase 5 Multichannel Follow-Up Orchestration,
 *          multilingual templates, automated channel escalation,
 *          and statistical missing-observation invariance.
 * RUN WITH: npx playwright test tests/unit/followupEscalation.spec.ts
 */

import { test, expect } from '@playwright/test';
import {
  CHECKPOINTS,
  SUPPORTED_LANGUAGES,
  renderTemplate,
  FOLLOWUP_TEMPLATES,
} from '../../server/services/followupTemplates.js';
import {
  scheduleFollowUps,
  getFollowUpQueue,
  dispatchFollowUp,
  recordResponse,
  escalateAttempt,
  CHECKPOINT_DAYS,
} from '../../server/services/followupService.js';
import resilienceStore from '../../server/lib/resilienceStore.js';

test.describe('Phase 5: Follow-Up Orchestration & Escalation Unit Suite', () => {
  const testTraineeId = `trainee_followup_test_${Date.now()}`;

  test.beforeAll(() => {
    // Seed test candidate in resilience store
    resilienceStore.addUser({
      id: `usr_${Date.now()}`,
      phone: '+919876543210',
      email: 'followup_test@nexis.gov.in',
      role: 'CANDIDATE',
      candidateProfile: { name: 'Sunil Gavaskar' },
      trainee: {
        id: testTraineeId,
        name: 'Sunil Gavaskar',
        phoneNumber: '+919876543210',
        preferredLanguage: 'mr',
      },
    });

    // Grant default consent
    resilienceStore.grantConsent(testTraineeId, 'WHATSAPP_NOTIFICATIONS', 'v2.0');
    resilienceStore.grantConsent(testTraineeId, 'OUTCOME_TRACKING', 'v2.0');
  });

  test('All 5 standard checkpoints (T_0, T_30, T_90, T_180, T_365) are defined with exact day offsets', () => {
    expect(CHECKPOINTS).toEqual(['T_0', 'T_30', 'T_90', 'T_180', 'T_365']);
    expect(CHECKPOINT_DAYS.T_0).toBe(0);
    expect(CHECKPOINT_DAYS.T_30).toBe(30);
    expect(CHECKPOINT_DAYS.T_90).toBe(90);
    expect(CHECKPOINT_DAYS.T_180).toBe(180);
    expect(CHECKPOINT_DAYS.T_365).toBe(365);
  });

  test('renderTemplate supports Marathi, Hindi, and English across SMS, WhatsApp, and Assisted Call', () => {
    // 1. Marathi WhatsApp for T_30
    const mrWa = renderTemplate('T_30', 'WHATSAPP', 'mr', { name: 'सुनील' });
    expect(typeof mrWa).toBe('object');
    expect(mrWa.header).toContain('३०');
    expect(mrWa.body).toContain('सुनील');
    expect(mrWa.options.length).toBeGreaterThanOrEqual(3);

    // 2. English SMS for T_90
    const enSms = renderTemplate('T_90', 'SMS', 'en', { name: 'Sunil' });
    expect(typeof enSms).toBe('string');
    expect(enSms).toContain('90-day');

    // 3. Hindi Assisted Call for T_365
    const hiCall = renderTemplate('T_365', 'ASSISTED_CALL', 'hi', { name: 'सुनील', operator: 'अमित' });
    expect(typeof hiCall).toBe('object');
    expect(hiCall.greeting).toContain('सुनील');
    expect(hiCall.questions.length).toBeGreaterThanOrEqual(2);
  });

  test('scheduleFollowUps creates exactly 5 sequenced attempts with WhatsApp initial channel', async () => {
    const baseDate = new Date('2026-01-01T00:00:00.000Z');
    const attempts = await scheduleFollowUps({
      traineeId: testTraineeId,
      completionDate: baseDate,
      preferredLanguage: 'mr',
      phone: '+919876543210',
      district: 'Pune',
      traineeName: 'Sunil Gavaskar',
    });

    expect(attempts).toHaveLength(5);
    expect(attempts.map((a) => a.checkpoint)).toEqual(['T_0', 'T_30', 'T_90', 'T_180', 'T_365']);
    expect(attempts.every((a) => a.channel === 'WHATSAPP')).toBe(true);
    expect(attempts.every((a) => a.status === 'SCHEDULED')).toBe(true);

    // Verify day offsets
    const t0 = new Date(attempts[0].scheduledAt).getTime();
    const t30 = new Date(attempts[1].scheduledAt).getTime();
    const diffDays = Math.round((t30 - t0) / (24 * 3600 * 1000));
    expect(diffDays).toBe(30);
  });

  test('dispatchFollowUp renders localized content and records delivery timestamp', async () => {
    const queueData = await getFollowUpQueue({ checkpoint: 'T_30' });
    const attempt = queueData.queue.find((a) => a.traineeId === testTraineeId);
    expect(attempt).toBeDefined();

    const dispatchResult = await dispatchFollowUp(attempt!.id, {
      operator: 'Officer S. Kulkarni',
    });

    expect(dispatchResult.ok).toBe(true);
    expect(dispatchResult.attempt.status).toBe('DELIVERED');
    expect(dispatchResult.attempt.attemptedAt).toBeDefined();
    expect(dispatchResult.consentStatus).toBe('CONSENTED');
    expect(dispatchResult.dispatchedMessage).toBeDefined();
  });

  test('recordResponse updates attempt and automatically synchronizes with OutcomeEvent timeline', async () => {
    const queueData = await getFollowUpQueue({ checkpoint: 'T_30' });
    const attempt = queueData.queue.find((a) => a.traineeId === testTraineeId);
    expect(attempt).toBeDefined();

    const result = await recordResponse(attempt!.id, {
      employmentStatus: 'EMPLOYED',
      employerName: 'Bajaj Auto Ltd',
      wageBand: '20k+',
      operatorNotes: 'Verified offer letter and ID card photo via WhatsApp',
    });

    expect(result.ok).toBe(true);
    expect(result.attempt.status).toBe('RESPONDED');

    // Verify linked OutcomeEvent
    expect(result.outcomeEvent).toBeDefined();
    expect(result.outcomeEvent.milestone).toBe('M30');
    expect(result.outcomeEvent.eventType).toBe('PLACED');
    expect(result.outcomeEvent.metadata.employerName).toBe('Bajaj Auto Ltd');
  });

  test('escalateAttempt enforces WhatsApp -> SMS -> Assisted Call -> UNREACHABLE state transition', async () => {
    // 1. Create a fresh attempt for escalation testing
    const baseDate = new Date();
    const attempts = await scheduleFollowUps({
      traineeId: `trainee_esc_${Date.now()}`,
      completionDate: baseDate,
      preferredLanguage: 'en',
    });
    const targetAttempt = attempts[1]; // T_30 attempt

    // Initial state: WHATSAPP, retryCount: 0
    expect(targetAttempt.channel).toBe('WHATSAPP');
    expect(targetAttempt.retryCount).toBe(0);

    // Escalation 1: WHATSAPP -> SMS
    const esc1 = await escalateAttempt(targetAttempt.id, { reason: 'WhatsApp unread for 48h' });
    expect(esc1.ok).toBe(true);
    expect(esc1.escalated).toBe(true);
    expect(esc1.unreachable).toBe(false);
    expect(esc1.nextChannel).toBe('SMS');
    expect(esc1.attempt.retryCount).toBe(1);

    // Escalation 2: SMS -> ASSISTED_CALL
    const esc2 = await escalateAttempt(targetAttempt.id, { reason: 'SMS delivery unconfirmed' });
    expect(esc2.ok).toBe(true);
    expect(esc2.escalated).toBe(true);
    expect(esc2.unreachable).toBe(false);
    expect(esc2.nextChannel).toBe('ASSISTED_CALL');
    expect(esc2.attempt.retryCount).toBe(2);

    // Escalation 3: 3rd failed outreach -> UNREACHABLE (Statutory Rule)
    const esc3 = await escalateAttempt(targetAttempt.id, { reason: 'Call went to voicemail / no answer' });
    expect(esc3.ok).toBe(true);
    expect(esc3.escalated).toBe(true);
    expect(esc3.unreachable).toBe(true);
    expect(esc3.attempt.status).toBe('UNREACHABLE');
    expect(esc3.attempt.retryCount).toBe(3);

    // Invariance Check: Verifies message explicitly guarantees non-degradation of unemployment
    expect(esc3.message).toContain('missing-observation');
    expect(esc3.message).toContain('Employment status preserved without degradation');
  });
});
