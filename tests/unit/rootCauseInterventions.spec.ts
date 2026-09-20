/**
 * FILE: tests/unit/rootCauseInterventions.spec.ts
 * PURPOSE: Unit tests for Phase 10 Root-Cause Engine & Intervention Approval Gate.
 * SPECIFICATION: Master Spec Section 14.5, 15.3, 19.5 & Phase 10.
 */

import { test, expect } from '@playwright/test';
import {
  ROOT_CAUSES,
  INTERVENTION_TYPES,
  diagnoseRootCauses,
} from '../../server/services/rootCauseEngine.js';
import {
  createIntervention,
  approveIntervention,
  deliverIntervention,
  reassessIntervention,
  getTraineeInterventions,
  _resetInterventionsMemory,
} from '../../server/services/interventionService.js';

test.describe('Phase 10: Root-Cause & Intervention Engine Unit Tests', () => {
  test.beforeEach(() => {
    _resetInterventionsMemory();
  });

  test.describe('1. Taxonomy & Contract Verification (Section 19.5)', () => {
    test('contains all 10 canonical root causes with default actions and intervention types', () => {
      const keys = Object.keys(ROOT_CAUSES);
      expect(keys.length).toBe(10);
      expect(keys).toContain('SKILL_MISMATCH');
      expect(keys).toContain('EXPERIENCE_GAP');
      expect(keys).toContain('LOCATION_MISMATCH');
      expect(keys).toContain('SALARY_MISMATCH');
      expect(keys).toContain('TRANSPORT');
      expect(keys).toContain('LANGUAGE');
      expect(keys).toContain('INTERVIEW_PERFORMANCE');
      expect(keys).toContain('COURSE_RELEVANCE');
      expect(keys).toContain('EMPLOYER_DEMAND');
      expect(keys).toContain('CAREGIVING');

      keys.forEach((k) => {
        const rc = ROOT_CAUSES[k];
        expect(rc.code).toBe(k);
        expect(rc.name).toBeDefined();
        expect(rc.defaultTitle).toBeDefined();
        expect(rc.defaultAction).toBeDefined();
        expect(INTERVENTION_TYPES).toContain(rc.interventionType);
      });
    });
  });

  test.describe('2. Deterministic Rule Engine Signal Mapping', () => {
    test('returns empty array when no failure signals are present (zero hallucination)', () => {
      const result = diagnoseRootCauses({});
      expect(result).toEqual([]);
    });

    test('diagnoses SKILL_MISMATCH when missing skills or skill-rejections are present', () => {
      const diagnoses = diagnoseRootCauses({
        skillGaps: [{ skillName: 'React 19', importance: 0.8, isMissing: true }],
        applicationRejections: [{ rejectionReason: 'MISSING_SKILL' }],
      });
      expect(diagnoses.length).toBeGreaterThanOrEqual(1);
      const skillDiag = diagnoses.find((d) => d.rootCause === 'SKILL_MISMATCH');
      expect(skillDiag).toBeDefined();
      expect(skillDiag?.recommendedIntervention.type).toBe('REMEDIAL_MODULE');
      expect(skillDiag?.confidence).toBeGreaterThanOrEqual(0.6);
      expect(skillDiag?.evidenceRefs.length).toBeGreaterThan(0);
    });

    test('diagnoses EXPERIENCE_GAP when experience rejection or zero tenure with delay', () => {
      const diagnoses = diagnoseRootCauses({
        applicationRejections: [{ rejectionReason: 'LACK_OF_EXPERIENCE' }],
        totalExperienceMonths: 0,
      });
      const expDiag = diagnoses.find((d) => d.rootCause === 'EXPERIENCE_GAP');
      expect(expDiag).toBeDefined();
      expect(expDiag?.recommendedIntervention.type).toBe('APPRENTICESHIP_MATCH');
      expect(expDiag?.evidenceRefs[0]).toContain('REJECTIONS_FOR_EXPERIENCE');
    });

    test('diagnoses LOCATION_MISMATCH when commute distance excessive and no relocation', () => {
      const diagnoses = diagnoseRootCauses({
        locationDistanceKm: 45,
        relocationWillingness: false,
      });
      const locDiag = diagnoses.find((d) => d.rootCause === 'LOCATION_MISMATCH');
      expect(locDiag).toBeDefined();
      expect(locDiag?.recommendedIntervention.type).toBe('LOCAL_MOBILITY');
      expect(locDiag?.evidenceRefs).toContain('RELOCATION_CONSTRAINED');
    });

    test('diagnoses SALARY_MISMATCH when survey reports wage expectation deficit', () => {
      const diagnoses = diagnoseRootCauses({
        surveyFeedback: { salary_below_expectation: true },
      });
      const salDiag = diagnoses.find((d) => d.rootCause === 'SALARY_MISMATCH');
      expect(salDiag).toBeDefined();
      expect(salDiag?.recommendedIntervention.type).toBe('CAREER_COUNSELLING');
      expect(salDiag?.evidenceRefs).toContain('SURVEY_WAGE_EXPECTATION_GAP');
    });

    test('diagnoses TRANSPORT when commute barrier is flagged', () => {
      const diagnoses = diagnoseRootCauses({
        surveyFeedback: { commute_barrier: true },
      });
      const transDiag = diagnoses.find((d) => d.rootCause === 'TRANSPORT');
      expect(transDiag).toBeDefined();
      expect(transDiag?.recommendedIntervention.type).toBe('LOCAL_MOBILITY');
    });

    test('diagnoses LANGUAGE when communication gap is reported', () => {
      const diagnoses = diagnoseRootCauses({
        applicationRejections: [{ rejectionReason: 'COMMUNICATION_BARRIER' }],
      });
      const langDiag = diagnoses.find((d) => d.rootCause === 'LANGUAGE');
      expect(langDiag).toBeDefined();
      expect(langDiag?.recommendedIntervention.type).toBe('REMEDIAL_MODULE');
    });

    test('diagnoses INTERVIEW_PERFORMANCE when repeated mock interview scores < 60', () => {
      const diagnoses = diagnoseRootCauses({
        interviewScores: [42, 55],
      });
      const intDiag = diagnoses.find((d) => d.rootCause === 'INTERVIEW_PERFORMANCE');
      expect(intDiag).toBeDefined();
      expect(intDiag?.recommendedIntervention.type).toBe('MOCK_INTERVIEW');
    });

    test('diagnoses COURSE_RELEVANCE when market misalignment is reported', () => {
      const diagnoses = diagnoseRootCauses({
        surveyFeedback: { course_unrelated_to_market: true },
      });
      const crDiag = diagnoses.find((d) => d.rootCause === 'COURSE_RELEVANCE');
      expect(crDiag).toBeDefined();
      expect(crDiag?.recommendedIntervention.type).toBe('CURRICULUM_REVIEW');
    });

    test('diagnoses EMPLOYER_DEMAND when district demand ratio < 0.35', () => {
      const diagnoses = diagnoseRootCauses({
        districtDemandRatio: 0.22,
      });
      const edDiag = diagnoses.find((d) => d.rootCause === 'EMPLOYER_DEMAND');
      expect(edDiag).toBeDefined();
      expect(edDiag?.recommendedIntervention.type).toBe('CURRICULUM_REVIEW');
    });

    test('diagnoses CAREGIVING when domestic care obligations are reported', () => {
      const diagnoses = diagnoseRootCauses({
        surveyFeedback: { caregiving_obligations: true },
      });
      const careDiag = diagnoses.find((d) => d.rootCause === 'CAREGIVING');
      expect(careDiag).toBeDefined();
      expect(careDiag?.recommendedIntervention.type).toBe('CAREER_COUNSELLING');
    });
  });

  test.describe('3. Human Approval Gate & Delivery Policy (Section 15.3)', () => {
    test('newly created intervention initializes to PENDING_APPROVAL with null approvedBy', async () => {
      const intervention = await createIntervention({
        traineeId: 'trainee_test_01',
        rootCause: 'SKILL_MISMATCH',
        recommendedAction: 'Enroll in React 19 bridge module',
        evidenceRefs: ['GAP: React 19'],
      });

      expect(intervention.id).toBeDefined();
      expect(intervention.status).toBe('PENDING_APPROVAL');
      expect(intervention.approvedBy).toBeNull();
      expect(intervention.approvedAt).toBeNull();
    });

    test('BLOCKS delivery and throws 403 if intervention is NOT approved (Section 15.3)', async () => {
      const intervention = await createIntervention({
        traineeId: 'trainee_test_02',
        rootCause: 'EXPERIENCE_GAP',
        recommendedAction: 'Match with 6-month apprenticeship',
      });

      // Attempt delivery without prior approval
      let thrownError: any = null;
      try {
        await deliverIntervention(intervention.id, { deliveryChannel: 'IN_APP' });
      } catch (err: any) {
        thrownError = err;
      }

      expect(thrownError).not.toBeNull();
      expect(thrownError.statusCode).toBe(403);
      expect(thrownError.message).toContain('Human approval required before intervention delivery');
    });

    test('approves intervention when valid approvedBy officer string is provided', async () => {
      const intervention = await createIntervention({
        traineeId: 'trainee_test_03',
        rootCause: 'INTERVIEW_PERFORMANCE',
      });

      const approved = await approveIntervention(intervention.id, {
        approvedBy: 'District Officer Sharma (MH-PUNE-01)',
        notes: 'Verified candidate interview audio transcript.',
      });

      expect(approved.status).toBe('APPROVED');
      expect(approved.approvedBy).toBe('District Officer Sharma (MH-PUNE-01)');
      expect(approved.approvedAt).toBeInstanceOf(Date);
    });

    test('successfully delivers approved intervention and updates status to DELIVERED', async () => {
      const intervention = await createIntervention({
        traineeId: 'trainee_test_04',
        rootCause: 'TRANSPORT',
      });

      await approveIntervention(intervention.id, {
        approvedBy: 'Officer Patil',
      });

      const delivered = await deliverIntervention(intervention.id, {
        deliveryChannel: 'SMS',
      });

      expect(delivered.status).toBe('DELIVERED');
      expect(delivered.deliveredAt).toBeInstanceOf(Date);
      expect(delivered.deliveryChannel).toBe('SMS');
    });

    test('reassesses outcome after delivery and marks outcomeReassessed true', async () => {
      const intervention = await createIntervention({
        traineeId: 'trainee_test_05',
        rootCause: 'SKILL_MISMATCH',
      });

      await approveIntervention(intervention.id, { approvedBy: 'Officer Kulkarni' });
      await deliverIntervention(intervention.id);

      const reassessed = await reassessIntervention(intervention.id, {
        outcomeStatus: 'COMPLETED',
        notes: 'Candidate completed remedial bridge module with 88% assessment score.',
      });

      expect(reassessed.outcomeReassessed).toBe(true);
      expect(reassessed.status).toBe('COMPLETED');
    });
  });
});
