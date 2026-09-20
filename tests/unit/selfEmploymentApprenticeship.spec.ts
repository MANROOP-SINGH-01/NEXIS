import { test, expect } from '@playwright/test';
import {
  VALID_EVENT_TYPES,
  ENTERPRISE_TYPES,
  WAGE_BANDS,
  normalizeEventType,
  recordOutcomeEvent,
  recordSelfEmploymentOutcome,
  recordApprenticeshipConversion,
  getTraineeTimeline,
} from '../../server/services/outcomeService.js';

test.describe('Phase 9: Self-Employment, Apprenticeship & Outcome States Unit Tests', () => {
  test.describe('1. Full Longitudinal Outcome State Model (Section 2.4 & 19.1)', () => {
    test('contains all 15 canonical livelihood and outcome states', () => {
      // Salaried & Formal
      expect(VALID_EVENT_TYPES).toContain('PLACED');
      expect(VALID_EVENT_TYPES).toContain('SALARIED');

      // Apprenticeship & Conversion
      expect(VALID_EVENT_TYPES).toContain('APPRENTICESHIP');
      expect(VALID_EVENT_TYPES).toContain('APPRENTICESHIP_CONVERSION');

      // Entrepreneurship, Freelance & Informal
      expect(VALID_EVENT_TYPES).toContain('SELF_EMPLOYED');
      expect(VALID_EVENT_TYPES).toContain('ENTREPRENEURSHIP');
      expect(VALID_EVENT_TYPES).toContain('FREELANCE');
      expect(VALID_EVENT_TYPES).toContain('GIG_WORK');
      expect(VALID_EVENT_TYPES).toContain('AGRICULTURE');
      expect(VALID_EVENT_TYPES).toContain('CONTRACT_WORK');
      expect(VALID_EVENT_TYPES).toContain('INFORMAL_EMPLOYMENT');

      // Further Education & Reskilling
      expect(VALID_EVENT_TYPES).toContain('HIGHER_EDUCATION');
      expect(VALID_EVENT_TYPES).toContain('FURTHER_EDUCATION');
      expect(VALID_EVENT_TYPES).toContain('RE_SKILLING');
      expect(VALID_EVENT_TYPES).toContain('RE_TRAINING');

      // Active Search, Retention & Unreachable
      expect(VALID_EVENT_TYPES).toContain('SEEKING_WORK');
      expect(VALID_EVENT_TYPES).toContain('RETAINED');
      expect(VALID_EVENT_TYPES).toContain('SWITCHED_EMPLOYER');
      expect(VALID_EVENT_TYPES).toContain('ATTRITED');
      expect(VALID_EVENT_TYPES).toContain('DROPOUT');
      expect(VALID_EVENT_TYPES).toContain('UNREACHABLE');
    });

    test('normalizes multi-format aliases to canonical outcome states', () => {
      expect(normalizeEventType('EMPLOYED')).toBe('PLACED');
      expect(normalizeEventType('apprentice')).toBe('APPRENTICESHIP');
      expect(normalizeEventType('conversion')).toBe('APPRENTICESHIP_CONVERSION');
      expect(normalizeEventType('freelancer')).toBe('FREELANCE');
      expect(normalizeEventType('gig')).toBe('GIG_WORK');
      expect(normalizeEventType('searching')).toBe('SEEKING_WORK');
      expect(normalizeEventType('dropped_out')).toBe('DROPOUT');
    });

    test('defines structured enterprise types and wage bands', () => {
      expect(ENTERPRISE_TYPES).toContain('MICRO_ENTERPRISE');
      expect(ENTERPRISE_TYPES).toContain('FREELANCE_CONSULTANT');
      expect(ENTERPRISE_TYPES).toContain('LOCAL_SERVICES');
      expect(ENTERPRISE_TYPES).toContain('AGRI_BUSINESS');
      expect(ENTERPRISE_TYPES).toContain('ARTISAN_CRAFT');
      expect(ENTERPRISE_TYPES).toContain('GIG_PLATFORM');

      expect(WAGE_BANDS).toContain('0-10k');
      expect(WAGE_BANDS).toContain('10-20k');
      expect(WAGE_BANDS).toContain('20-30k');
      expect(WAGE_BANDS).toContain('30-50k');
      expect(WAGE_BANDS).toContain('50k+');
    });
  });

  test.describe('2. Self-Employment & Micro-Enterprise Pipeline', () => {
    test('records self-employment with Udyam registration and elevates evidence provenance', async () => {
      const traineeId = `trainee_se_${Date.now()}`;

      const seEvent = await recordSelfEmploymentOutcome({
        traineeId,
        enterpriseType: 'MICRO_ENTERPRISE',
        businessName: 'Shri Ganesh Electrical Services',
        udyamNumber: 'UDYAM-MH-12-0045892',
        monthlyRevenueBand: '20-30k',
        roleRelevance: 'DIRECTLY_RELATED',
        milestone: 'M90',
      });

      expect(seEvent.eventType).toBe('SELF_EMPLOYED');
      expect(seEvent.milestone).toBe('M90');
      expect(seEvent.verificationStatus).toBe('DOCUMENT_VERIFIED');
      expect(seEvent.verificationSource).toBe('UDYAM_REGISTRATION');
      expect(seEvent.confidenceScore).toBe(0.85);
      expect(seEvent.metadata.hasOfficialRegistration).toBe(true);
      expect(seEvent.metadata.udyamNumber).toBe('UDYAM-MH-12-0045892');
    });

    test('records self-employment without Udyam as self-reported', async () => {
      const traineeId = `trainee_se_unreg_${Date.now()}`;

      const seEvent = await recordSelfEmploymentOutcome({
        traineeId,
        enterpriseType: 'FREELANCE_CONSULTANT',
        businessName: 'Freelance UI Designer',
        udyamNumber: null,
        monthlyRevenueBand: '10-20k',
        milestone: 'M30',
      });

      expect(seEvent.eventType).toBe('SELF_EMPLOYED');
      expect(seEvent.verificationStatus).toBe('UNVERIFIED');
      expect(seEvent.verificationSource).toBe('TRAINEE_SELF_REPORT');
      expect(seEvent.confidenceScore).toBe(0.50);
      expect(seEvent.metadata.hasOfficialRegistration).toBe(false);
    });
  });

  test.describe('3. NAPS Apprenticeship-to-Employment Conversion Pipeline', () => {
    test('records formal NAPS apprenticeship conversion with high-confidence portal provenance', async () => {
      const traineeId = `trainee_naps_${Date.now()}`;

      const convEvent = await recordApprenticeshipConversion({
        traineeId,
        employerName: 'Tata AutoComp Systems Ltd',
        roleTitle: 'Production Technician (Permanent)',
        wageBand: '20-30k',
        priorApprenticeshipMilestone: 'M365',
      });

      expect(convEvent.eventType).toBe('APPRENTICESHIP_CONVERSION');
      expect(convEvent.milestone).toBe('M365');
      expect(convEvent.verificationStatus).toBe('API_VERIFIED');
      expect(convEvent.verificationSource).toBe('NAPS_PORTAL');
      expect(convEvent.confidenceScore).toBe(0.95);
      expect(convEvent.metadata.conversionType).toBe('NAPS_FORMAL_CONVERSION');
      expect(convEvent.metadata.isRetained).toBe(true);
    });

    test('executes the full SIH golden path sequence (Certification -> Apprenticeship -> Conversion -> Retained)', async () => {
      const traineeId = `trainee_golden_${Date.now()}`;

      // Step 1: Certification
      await recordOutcomeEvent({
        traineeId,
        eventType: 'CERTIFIED',
        verificationStatus: 'API_VERIFIED',
        verificationSource: 'THIRD_PARTY_PORTAL',
        metadata: { courseName: 'Automotive Mechatronics' },
      });

      // Step 2: NAPS Apprenticeship
      await recordOutcomeEvent({
        traineeId,
        eventType: 'APPRENTICESHIP',
        milestone: 'M30',
        verificationStatus: 'DOCUMENT_VERIFIED',
        verificationSource: 'NAPS_PORTAL',
        metadata: { employerName: 'Mahindra & Mahindra Ltd', wageBand: '10-20k' },
      });

      // Step 3: Formal Conversion to Permanent Salaried Staff
      await recordApprenticeshipConversion({
        traineeId,
        employerName: 'Mahindra & Mahindra Ltd',
        roleTitle: 'Mechatronics Associate',
        wageBand: '20-30k',
        priorApprenticeshipMilestone: 'M180',
      });

      // Step 4: 1-Year Retention Verification
      await recordOutcomeEvent({
        traineeId,
        eventType: 'RETAINED',
        milestone: 'M365',
        verificationStatus: 'EMPLOYER_DIRECT',
        verificationSource: 'EMPLOYER_DIRECT',
        metadata: { employerName: 'Mahindra & Mahindra Ltd', wageBand: '30-50k' },
      });

      // Verify complete chronological timeline
      const timeline = await getTraineeTimeline(traineeId);
      expect(timeline.events.length).toBe(4);
      expect(timeline.events.map((e) => e.eventType)).toEqual([
        'CERTIFIED',
        'APPRENTICESHIP',
        'APPRENTICESHIP_CONVERSION',
        'RETAINED',
      ]);
      expect(timeline.milestoneSummary.latestStatus).toBe('RETAINED');
    });
  });
});
