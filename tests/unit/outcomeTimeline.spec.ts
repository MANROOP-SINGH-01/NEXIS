import { test, expect } from '@playwright/test';
import {
  normalizeMilestone,
  normalizeEventType,
  recordOutcomeEvent,
  getTraineeTimeline,
  getCohortRetention,
  verifyOutcomeEvent,
  VALID_EVENT_TYPES,
  VALID_MILESTONES,
  VALID_VERIFICATION_STATUSES,
  VALID_VERIFICATION_SOURCES,
} from '../../server/services/outcomeService.js';
import resilienceStore from '../../server/lib/resilienceStore.js';

test.describe('Phase 4: Longitudinal Outcome Timeline & Defect #2 Remediation Unit Tests', () => {

  test('All canonical milestones and event types are defined and immutable', () => {
    expect(VALID_MILESTONES).toEqual(['M30', 'M90', 'M180', 'M365']);
    expect(VALID_EVENT_TYPES).toContain('PLACED');
    expect(VALID_EVENT_TYPES).toContain('SELF_EMPLOYED');
    expect(VALID_EVENT_TYPES).toContain('CERTIFIED');
    expect(VALID_EVENT_TYPES).toContain('ATTRITED');
  });

  test('normalizeMilestone accurately maps multi-format inputs to canonical enum values', () => {
    expect(normalizeMilestone('30')).toBe('M30');
    expect(normalizeMilestone('30d')).toBe('M30');
    expect(normalizeMilestone('30_DAY')).toBe('M30');
    expect(normalizeMilestone('M30')).toBe('M30');

    expect(normalizeMilestone('90')).toBe('M90');
    expect(normalizeMilestone('90_DAY')).toBe('M90');
    expect(normalizeMilestone('M90')).toBe('M90');

    expect(normalizeMilestone('180')).toBe('M180');
    expect(normalizeMilestone('180_DAY')).toBe('M180');
    expect(normalizeMilestone('M180')).toBe('M180');

    expect(normalizeMilestone('365')).toBe('M365');
    expect(normalizeMilestone('365_DAY')).toBe('M365');
    expect(normalizeMilestone('M365')).toBe('M365');

    expect(normalizeMilestone('invalid')).toBeNull();
    expect(normalizeMilestone(null)).toBeNull();
  });

  test('normalizeEventType converts legacy status aliases to canonical event types', () => {
    expect(normalizeEventType('EMPLOYED')).toBe('PLACED');
    expect(normalizeEventType('placed')).toBe('PLACED');
    expect(normalizeEventType('SELF_EMPLOYED')).toBe('SELF_EMPLOYED');
    expect(normalizeEventType('CERTIFIED')).toBe('CERTIFIED');
    expect(normalizeEventType('unknown_status')).toBe('PLACED');
  });

  test('recordOutcomeEvent registers immutable milestone transition with provenance (Defect #2 Fix)', async () => {
    const testTraineeId = `trainee_test_p4_${Date.now()}`;

    // Record M30 milestone
    const event1 = await recordOutcomeEvent({
      traineeId: testTraineeId,
      eventType: 'PLACED',
      milestone: '30_DAY',
      effectiveDate: new Date('2025-07-01T10:00:00Z'),
      metadata: {
        employerName: 'Tata Consultancy Services',
        jobTitle: 'Associate Software Engineer',
        monthlySalary: 25000,
        location: 'Pune',
      },
      verificationStatus: 'DOCUMENT_VERIFIED',
      verificationSource: 'EMPLOYER_DIRECT',
      confidenceScore: 0.95,
    });

    expect(event1).toBeDefined();
    expect(event1.traineeId).toBe(testTraineeId);
    expect(event1.milestone).toBe('M30');
    expect(event1.eventType).toBe('PLACED');
    expect(event1.verificationStatus).toBe('DOCUMENT_VERIFIED');
    expect(event1.verificationSource).toBe('EMPLOYER_DIRECT');
    expect(event1.confidenceScore).toBe(0.95);

    // Record M90 milestone with higher verification tier (EPF UAN match)
    const event2 = await recordOutcomeEvent({
      traineeId: testTraineeId,
      eventType: 'PLACED',
      milestone: 'M90',
      effectiveDate: new Date('2025-09-01T10:00:00Z'),
      metadata: {
        employerName: 'Tata Consultancy Services',
        monthlySalary: 26500,
        epfUan: '101234567890',
      },
      verificationStatus: 'API_VERIFIED',
      verificationSource: 'EPF_UAN_MATCH',
      confidenceScore: 0.99,
    });

    expect(event2.milestone).toBe('M90');
    expect(event2.verificationStatus).toBe('API_VERIFIED');
    expect(event2.verificationSource).toBe('EPF_UAN_MATCH');
    expect(event2.confidenceScore).toBe(0.99);

    // Fetch timeline and verify chronological ordering and summary
    const timeline = await getTraineeTimeline(testTraineeId);
    expect(timeline.traineeId).toBe(testTraineeId);
    expect(timeline.events.length).toBeGreaterThanOrEqual(2);

    expect(timeline.milestoneSummary.M30?.milestone).toBe('M30');
    expect(timeline.milestoneSummary.M90?.milestone).toBe('M90');
    expect(timeline.milestoneSummary.latestStatus).toBe('PLACED');
    expect(timeline.milestoneSummary.verifiedTenureMonths).toBeGreaterThanOrEqual(3);
  });

  test('getCohortRetention accurately returns 30d, 90d, 180d, and 365d retention curves', async () => {
    const retention = await getCohortRetention('MAH_PUNE_COHORT_2024');

    expect(retention.cohortId).toBe('MAH_PUNE_COHORT_2024');
    expect(retention.placementRatePct).toBe(85.0);
    expect(retention.retentionCurve.M30.retentionPct).toBe(94.1);
    expect(retention.retentionCurve.M90.retentionPct).toBe(88.2);
    expect(retention.retentionCurve.M180.retentionPct).toBe(81.3);
    expect(retention.retentionCurve.M365.retentionPct).toBe(75.5);
    expect(retention.topEmployers.length).toBeGreaterThan(0);
  });

  test('verifyOutcomeEvent updates status and attaches officer audit notes', async () => {
    const testTraineeId = `trainee_verify_test_${Date.now()}`;
    const ev = await recordOutcomeEvent({
      traineeId: testTraineeId,
      eventType: 'PLACED',
      milestone: 'M30',
      verificationStatus: 'PENDING',
      verificationSource: 'TRAINEE_SELF_REPORT',
    });

    const verified = await verifyOutcomeEvent(ev.id, {
      status: 'API_VERIFIED',
      notes: 'Cross-verified with EPFO UAN active wage deposit records',
      verifiedBy: 'Officer R. Deshmukh',
      confidenceScore: 0.99,
    });

    expect(verified.verificationStatus).toBe('API_VERIFIED');
  });
});
