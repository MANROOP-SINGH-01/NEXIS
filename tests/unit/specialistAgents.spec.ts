/**
 * FILE: tests/unit/specialistAgents.spec.ts
 * PURPOSE: Unit tests for Phase 12 Outcome-Intelligence Specialist Agents.
 * SPECIFICATION: Master Spec Section 15.2, 15.3, 19.3, 19.5, 20 & 27 (Phase 12).
 */

import { test, expect } from '@playwright/test';
import {
  SPECIALIST_AGENT_ROSTER,
  createAgentFinding,
  runOutcomeTrackingAgent,
  runFollowUpAgent,
  runEmploymentVerificationAgent,
  runEmployerIntelligenceAgent,
  runCareerInterventionAgent,
  runProgrammeAnalyticsAgent,
  runPolicyIntelligenceAgent,
  runDataQualityAgent,
  runSpecialistAgent,
  getFindings,
  reviewFinding,
} from '../../server/services/specialistAgents.js';

test.describe('Phase 12: Outcome-Intelligence Specialist Agents Unit Suite', () => {
  test('1. Specialist Agent Roster conforms to Section 15.2', () => {
    const agentKeys = Object.keys(SPECIALIST_AGENT_ROSTER);
    expect(agentKeys).toHaveLength(11);

    // 8 Net-New Agents
    const expectedNewAgents = [
      'outcome-tracking',
      'follow-up',
      'employment-verification',
      'employer-intelligence',
      'career-intervention',
      'programme-analytics',
      'policy-intelligence',
      'data-quality',
    ];
    for (const key of expectedNewAgents) {
      expect(SPECIALIST_AGENT_ROSTER[key]).toBeDefined();
      expect(SPECIALIST_AGENT_ROSTER[key].category).toBe('OUTCOME_INTELLIGENCE');
      expect(SPECIALIST_AGENT_ROSTER[key].mission).toBeTruthy();
      expect(SPECIALIST_AGENT_ROSTER[key].deterministicSplit).toBeTruthy();
    }

    // 3 Wrapped Existing Agents
    const expectedExisting = ['nexus-strategist', 'nexus-hunter', 'nexus-mirror'];
    for (const key of expectedExisting) {
      expect(SPECIALIST_AGENT_ROSTER[key]).toBeDefined();
      expect(SPECIALIST_AGENT_ROSTER[key].category).toBe('CORE_CANDIDATE');
    }
  });

  test('2. createAgentFinding enforces Section 15.3 mandatory finding schema', () => {
    const finding = createAgentFinding({
      agent: 'data-quality',
      findingType: 'CHRONOLOGY_CHECK',
      summary: 'Chronology test summary',
      confidence: 95,
      inferenceType: 'VERIFIED',
      traineeId: 'trainee_test_01',
      evidenceReferences: ['test_ref_1'],
    });

    // Check mandatory schema fields
    expect(finding.findingId).toMatch(/^fnd_\d+_/);
    expect(finding.agent).toBe('data-quality');
    expect(finding.agentRole).toBe('Anomaly & Chronology Guard');
    expect(finding.timestamp).toBeTruthy();
    expect(finding.traineeId).toBe('trainee_test_01');
    expect(Array.isArray(finding.inputSources)).toBe(true);
    expect(finding.inputSources.length).toBeGreaterThanOrEqual(1);
    expect(finding.evidenceReferences).toContain('test_ref_1');
    expect(finding.confidence).toBe(95);
    expect(finding.inferenceType).toBe('VERIFIED');
    expect(finding.modelVersion).toBe('nexis-data-quality-v2.0');
    expect(finding.findingType).toBe('CHRONOLOGY_CHECK');
    expect(finding.summary).toBe('Chronology test summary');
    expect(finding.humanReviewStatus).toBe('PENDING');
  });

  test('3. createAgentFinding rejects unknown agent IDs and validates confidence range', () => {
    expect(() => {
      createAgentFinding({
        agent: 'non-existent-agent',
        findingType: 'TEST',
        summary: 'Test',
        confidence: 50,
      });
    }).toThrow(/Unknown agent/);

    const findingClamped = createAgentFinding({
      agent: 'outcome-tracking',
      findingType: 'TEST',
      summary: 'Test',
      confidence: 150, // Out of bounds
    });
    expect(findingClamped.confidence).toBe(100);
  });

  test('4. Section 20 Invariant: Programme Analytics Agent strictly forbids bare verdicts', () => {
    // Attempting to emit a bare verdict without uncertainty triggers invariant protection
    expect(() => {
      createAgentFinding({
        agent: 'programme-analytics',
        findingType: 'VERDICT',
        summary: 'Provider X is a bad provider with terrible metrics.',
        confidence: 90,
      });
    }).toThrow(/Section 20 Invariant Violated/);
  });

  test('5. Section 15.3 Invariant: Career Intervention Agent mandates human approval gate', () => {
    const finding = createAgentFinding({
      agent: 'career-intervention',
      findingType: 'INTERVENTION_RECOMMENDED',
      summary: 'Offer transport subsidy',
      confidence: 85,
      recommendedAction: {
        actionType: 'DELIVER_SUBSIDY',
        description: 'Subsidize bus pass',
        requiresHumanApproval: false, // Attempt to bypass human gate
      },
    });

    // Invariant automatically enforces human approval
    expect(finding.recommendedAction?.requiresHumanApproval).toBe(true);
    expect(finding.humanReviewStatus).toBe('PENDING');
  });

  test('6. Outcome Tracking Agent flags stale timeline (> 30d with no milestones)', async () => {
    const oldCert = new Date(Date.now() - (45 * 86400000)).toISOString();
    const finding = await runOutcomeTrackingAgent({
      traineeId: 'trn_stale_01',
      certificationDate: oldCert,
      events: [],
    });

    expect(finding.findingType).toBe('STALE_TIMELINE');
    expect(finding.confidence).toBeGreaterThanOrEqual(90);
    expect(finding.recommendedAction?.actionType).toBe('TRIGGER_FOLLOWUP');
  });

  test('7. Follow-Up Agent blocks outreach when DPDP survey consent is withheld', async () => {
    const finding = await runFollowUpAgent({
      traineeId: 'trn_no_consent',
      consents: { LONGITUDINAL_SURVEY: false },
    });

    expect(finding.findingType).toBe('OUTREACH_BLOCKED_BY_CONSENT');
    expect(finding.confidence).toBe(100);
    expect(finding.recommendedAction?.actionType).toBe('REQUEST_CONSENT_UPDATE');
  });

  test('8. Follow-Up Agent respects quiet hours and escalates channel', async () => {
    // Quiet hours (23:00 IST)
    const quietFinding = await runFollowUpAgent({
      traineeId: 'trn_quiet_test',
      consents: { LONGITUDINAL_SURVEY: true },
      currentHourIST: 23,
    });
    expect(quietFinding.findingType).toBe('OUTREACH_DEFERRED_QUIET_HOURS');
    expect(quietFinding.details.isQuietHours).toBe(true);

    // Escalation from 2 previous attempts -> ASSISTED_CALL
    const escalatedFinding = await runFollowUpAgent({
      traineeId: 'trn_escalate_test',
      consents: { LONGITUDINAL_SURVEY: true },
      attemptHistory: [{ id: 1 }, { id: 2 }],
      currentHourIST: 11,
    });
    expect(escalatedFinding.details.recommendedChannel).toBe('ASSISTED_CALL');
  });

  test('9. Employment Verification Agent calculates Section 19.3 formula and isolates unverified claims', async () => {
    // S=1, E=0, D=0, T=1, X=0 -> C = 25(1) + 25(0) + 20(0) + 15(1) + 15(0) = 40
    const unverifiedFinding = await runEmploymentVerificationAgent({
      employmentRecordId: 'emp_claim_01',
      traineeId: 'trn_emp_01',
      selfReported: true,
      employerConfirmed: false,
      documentVerified: false,
      temporalConsistency: true,
    });
    expect(unverifiedFinding.confidence).toBe(40);
    expect(unverifiedFinding.inferenceType).toBe('INFERRED');
    expect(unverifiedFinding.findingType).toBe('UNVERIFIED_CLAIM_ALERT');

    // S=1, E=1, D=1, T=1, X=1 -> C = 100
    const verifiedFinding = await runEmploymentVerificationAgent({
      employmentRecordId: 'emp_claim_02',
      traineeId: 'trn_emp_02',
      selfReported: true,
      employerConfirmed: true,
      documentVerified: true,
      temporalConsistency: true,
      crossSourceCorroborated: true,
    });
    expect(verifiedFinding.confidence).toBe(100);
    expect(verifiedFinding.inferenceType).toBe('VERIFIED');
    expect(verifiedFinding.findingType).toBe('VERIFICATION_ROBUST');
  });

  test('10. Data Quality Agent catches chronological violations', async () => {
    // Employment started BEFORE certification
    const violationFinding = await runDataQualityAgent({
      traineeId: 'trn_bad_chronology',
      certificationDate: '2025-06-01',
      employmentStartDate: '2025-02-01',
    });

    expect(violationFinding.findingType).toBe('DATA_INTEGRITY_VIOLATION');
    expect(violationFinding.details.isClean).toBe(false);
    expect(violationFinding.details.anomalies).toHaveLength(1);
    expect(violationFinding.details.anomalies[0].rule).toBe('CHRONOLOGY_EMPLOYMENT_BEFORE_CERTIFICATION');
    expect(violationFinding.recommendedAction?.requiresHumanApproval).toBe(true);
  });

  test('11. Policy Intelligence Agent classifies Maharashtra district imbalances', async () => {
    const finding = await runPolicyIntelligenceAgent({
      district: 'Gadchiroli',
      region: 'Vidarbha',
      activeVacancies: 15,
      certifiedTrainees: 100, // 0.15x -> HIGH_DEFICIT
      topDeficitTrades: ['Solar PV Installer', 'Forestry Technician'],
    });

    expect(finding.details.ratio).toBe(0.15);
    expect(finding.details.status).toBe('HIGH_DEFICIT');
    expect(finding.details.isAcuteShortage).toBe(true);
    expect(finding.recommendedAction?.actionType).toBe('STATE_SEAT_ALLOCATION_REBALANCE');
  });

  test('12. Human review lifecycle updates finding status and reviewer notes', () => {
    const finding = createAgentFinding({
      agent: 'employer-intelligence',
      findingType: 'EMPLOYER_RISK_ANOMALY',
      summary: 'High contestation detected',
      confidence: 85,
    });

    const reviewed = reviewFinding({
      findingId: finding.findingId,
      reviewerId: 'officer_pune_01',
      decision: 'APPROVED',
      reviewNotes: 'Verified employer physically at Ranjangaon MIDC.',
    });

    expect(reviewed.humanReviewStatus).toBe('APPROVED');
    expect(reviewed.reviewedBy).toBe('officer_pune_01');
    expect(reviewed.reviewNotes).toContain('Ranjangaon MIDC');
  });
});
