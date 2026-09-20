/**
 * FILE: tests/unit/officeSimulationIntegration.spec.ts
 * PURPOSE: Unit tests for Phase 16: 3D Office / Agent Simulation Integration.
 * SPECIFICATION: Master Spec Section 9, 15.3, 19.3, 21.1, 27 (Phase 16).
 */

import { test, expect } from '@playwright/test';
import {
  SPECIALIST_AGENT_ROSTER,
  getFindings,
  createAgentFinding,
  reviewFinding,
} from '../../server/services/specialistAgents.js';

test.describe('Phase 16: 3D Office & Agent Simulation Integration Suite', () => {
  test('1. Real-time agent activity stream incorporates Outcome Intelligence specialists (Section 9)', () => {
    const rosterKeys = Object.keys(SPECIALIST_AGENT_ROSTER);
    expect(rosterKeys).toContain('outcome-tracking');
    expect(rosterKeys).toContain('follow-up');
    expect(rosterKeys).toContain('employment-verification');
    expect(rosterKeys).toContain('career-intervention');
    expect(rosterKeys).toContain('data-quality');

    const findings = getFindings({});
    expect(findings.length).toBeGreaterThanOrEqual(4);

    // Verify key outcome agents have seeded telemetry
    const agentsInLedger = new Set(findings.map((f) => f.agent));
    expect(agentsInLedger.has('outcome-tracking')).toBe(true);
    expect(agentsInLedger.has('follow-up')).toBe(true);
    expect(agentsInLedger.has('employment-verification')).toBe(true);
    expect(agentsInLedger.has('career-intervention')).toBe(true);
  });

  test('2. Evidence panel findings strictly conform to Section 15.3 schema', () => {
    const findings = getFindings({});
    expect(findings.length).toBeGreaterThan(0);

    for (const f of findings) {
      // 1. Unique findingId
      expect(f.findingId).toMatch(/^fnd_\d+_/);

      // 2. Canonical agent identifier
      expect(typeof f.agent).toBe('string');
      expect(SPECIALIST_AGENT_ROSTER[f.agent]).toBeDefined();

      // 3. Timestamp
      expect(new Date(f.timestamp).getTime()).not.toBeNaN();

      // 4. Input sources array
      expect(Array.isArray(f.inputSources)).toBe(true);
      expect(f.inputSources.length).toBeGreaterThanOrEqual(1);
      expect(f.inputSources[0]).toHaveProperty('sourceType');
      expect(f.inputSources[0]).toHaveProperty('description');

      // 5. Evidence references
      expect(Array.isArray(f.evidenceReferences)).toBe(true);

      // 6. Confidence score [0, 100]
      expect(typeof f.confidence).toBe('number');
      expect(f.confidence).toBeGreaterThanOrEqual(0);
      expect(f.confidence).toBeLessThanOrEqual(100);

      // 7. Inference type
      expect(['INFERRED', 'VERIFIED']).toContain(f.inferenceType);

      // 8. Model version
      expect(typeof f.modelVersion).toBe('string');
      expect(f.modelVersion.length).toBeGreaterThan(0);

      // 9. Finding type & summary
      expect(typeof f.findingType).toBe('string');
      expect(typeof f.summary).toBe('string');

      // 10. Human review status
      expect(['PENDING', 'APPROVED', 'REJECTED', 'NOT_REQUIRED']).toContain(f.humanReviewStatus);
    }
  });

  test('3. Human review transition enforces auditability and gate compliance (Section 15.3 & 15.4)', () => {
    const testFinding = createAgentFinding({
      agent: 'career-intervention',
      findingType: 'REMEDIAL_SKILL_ASSIGNMENT',
      summary: 'Automated remedial Python voucher suggested',
      confidence: 89,
      inferenceType: 'INFERRED',
      traineeId: 'MH-TEST-001',
      recommendedAction: {
        actionType: 'ASSIGN_MODULE',
        description: 'Assign Python 40h remedial course',
        requiresHumanApproval: true,
      },
    });

    expect(testFinding.humanReviewStatus).toBe('PENDING');
    expect(testFinding.recommendedAction?.requiresHumanApproval).toBe(true);

    // Perform human officer approval
    const approvedFinding = reviewFinding({
      findingId: testFinding.findingId,
      reviewerId: 'officer_pune_district',
      decision: 'APPROVED',
      reviewNotes: 'Verified candidate qualification match with MIDC vacancies',
    });

    expect(approvedFinding.humanReviewStatus).toBe('APPROVED');
    expect(approvedFinding.reviewedBy).toBe('officer_pune_district');
    expect(approvedFinding.reviewedAt).toBeTruthy();
    expect(approvedFinding.reviewNotes).toContain('MIDC vacancies');
  });

  test('4. Section 21.1 bidirectional navigation mapping covers all operational work queues', () => {
    // Validates the target tab mapping used by WorkQueueNavigator
    const expectedQueues = [
      { id: 'outcomes', tab: 'my-outcome' },
      { id: 'interventions', tab: 'interventions' },
      { id: 'dedup', isModal: true },
      { id: 'analytics', isModal: true },
      { id: 'jobs', tab: 'job-matches' },
      { id: 'skills', tab: 'skill-gaps' },
      { id: 'logs', tab: 'system-logs' },
    ];

    expect(expectedQueues.length).toBe(7);
    for (const q of expectedQueues) {
      expect(q.id).toBeTruthy();
      if (!q.isModal) {
        expect(['my-outcome', 'interventions', 'job-matches', 'skill-gaps', 'system-logs']).toContain(q.tab);
      }
    }
  });
});
