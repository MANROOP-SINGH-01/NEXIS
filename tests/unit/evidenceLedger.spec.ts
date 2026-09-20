import { test, expect } from '@playwright/test';
import {
  calculateEvidenceScore,
  normalizeEmployerName,
  generateSignedVerificationToken,
  createEmploymentRecord,
  addVerificationEvidence,
  resolveEmployerVerification,
  EVIDENCE_WEIGHTS,
  EVIDENCE_LEVELS,
} from '../../server/services/verificationEngine.js';

test.describe('Phase 8: Employment Verification & Evidence Ledger Unit Tests', () => {
  test.describe('1. Exact Mathematical Evidence Formula (Section 19.3)', () => {
    test('strictly computes C = min(100, 25S + 25E + 20D + 15T + 15X)', () => {
      // Base case: Zero evidence
      const unverified = calculateEvidenceScore({ S: 0, E: 0, D: 0, T: 0, X: 0 });
      expect(unverified.score).toBe(0);
      expect(unverified.levelCode).toBe('UNVERIFIED');
      expect(unverified.label).toBe('Unverified');

      // 1. Initial self-report only: S=1 (25 pts)
      const selfReport = calculateEvidenceScore({ S: 1, E: 0, D: 0, T: 0, X: 0 });
      expect(selfReport.score).toBe(25);
      expect(selfReport.levelCode).toBe('SELF_REPORTED');
      expect(selfReport.label).toBe('Self-reported');

      // 2. Self-report + Document (Pay slip): S=1, D=1 (25 + 20 = 45 pts)
      const withDoc = calculateEvidenceScore({ S: 1, E: 0, D: 1, T: 0, X: 0 });
      expect(withDoc.score).toBe(45);
      expect(withDoc.levelCode).toBe('SELF_REPORTED');

      // 3. Self-report + Employer confirmation: S=1, E=1 (25 + 25 = 50 pts)
      const partiallyVerified = calculateEvidenceScore({ S: 1, E: 1, D: 0, T: 0, X: 0 });
      expect(partiallyVerified.score).toBe(50);
      expect(partiallyVerified.levelCode).toBe('PARTIALLY_VERIFIED');
      expect(partiallyVerified.label).toBe('Partially verified');

      // 4. Self-report + Employer + Document + Provider: S=1, E=1, D=1, T=1 (25 + 25 + 20 + 15 = 85 pts)
      const highlyVerified = calculateEvidenceScore({ S: 1, E: 1, D: 1, T: 1, X: 0 });
      expect(highlyVerified.score).toBe(85);
      expect(highlyVerified.levelCode).toBe('HIGHLY_VERIFIED');
      expect(highlyVerified.label).toBe('Highly verified');

      // 5. Complete 5-tier verification: S=1, E=1, D=1, T=1, X=1 (25 + 25 + 20 + 15 + 15 = 100 pts)
      const fullyVerified = calculateEvidenceScore({ S: 1, E: 1, D: 1, T: 1, X: 1 });
      expect(fullyVerified.score).toBe(100);
      expect(fullyVerified.levelCode).toBe('FULLY_VERIFIED');
      expect(fullyVerified.label).toBe('Fully verified');
    });

    test('verifies all 5 weight constants match the specification contract', () => {
      expect(EVIDENCE_WEIGHTS.S).toBe(25);
      expect(EVIDENCE_WEIGHTS.E).toBe(25);
      expect(EVIDENCE_WEIGHTS.D).toBe(20);
      expect(EVIDENCE_WEIGHTS.T).toBe(15);
      expect(EVIDENCE_WEIGHTS.X).toBe(15);
    });
  });

  test.describe('2. Dispute Management & CONFLICTING Status Invariant (Section 19.3)', () => {
    test('contested claims are marked CONFLICTING without overwriting historical claims', () => {
      const disputed = calculateEvidenceScore({ S: 1, E: 0, D: 1, T: 0, X: 0, isDisputed: true });
      expect(disputed.isDisputed).toBe(true);
      expect(disputed.levelCode).toBe('CONFLICTING');
      expect(disputed.label).toBe('Conflicting evidence');
    });

    test('resolveEmployerVerification with DENIED preserves original claim and records dispute reason', async () => {
      const testToken = generateSignedVerificationToken();

      // Simulate employer contestation
      const resolution = await resolveEmployerVerification({
        token: testToken,
        decision: 'DENIED',
        verifiedByName: 'Sunil Patil (HR Ops)',
        reasonCode: 'CANDIDATE_NEVER_JOINED',
        reasonNotes: 'Candidate was offered a position but declined before onboarding.',
      });

      expect(resolution.status).toBe('CONFLICTING');
      expect(resolution.disputeFlag).toBe(true);
      expect(resolution.levelCode).toBe('CONFLICTING');
      expect(resolution.evidenceLabel).toBe('Conflicting evidence');
      expect(resolution.disputeDetails.contestedBy).toBe('Sunil Patil (HR Ops)');
      expect(resolution.disputeDetails.reasonCode).toBe('CANDIDATE_NEVER_JOINED');
      expect(resolution.disputeDetails.reasonNotes).toContain('Candidate was offered');
    });
  });

  test.describe('3. Employer Name Normalization & Signed Token Cryptography', () => {
    test('normalizes enterprise and vocational employer names correctly', () => {
      expect(normalizeEmployerName('Tata Consultancy Services Ltd.')).toBe('tata consultancy');
      expect(normalizeEmployerName('Infosys Technologies Private Limited')).toBe('infosys');
      expect(normalizeEmployerName('Wipro Infotech India Pvt. Ltd.')).toBe('wipro infotech');
      expect(normalizeEmployerName('Mahindra & Mahindra Auto Works LLP')).toBe('mahindra mahindra auto works');
    });

    test('generates cryptographically random 64-character hexadecimal tokens', () => {
      const token1 = generateSignedVerificationToken();
      const token2 = generateSignedVerificationToken();

      expect(token1).toHaveLength(64);
      expect(token2).toHaveLength(64);
      expect(token1).not.toBe(token2);
      expect(/^[0-9a-f]{64}$/.test(token1)).toBe(true);
    });
  });

  test.describe('4. Incremental Evidence Ledger Pipeline', () => {
    test('createEmploymentRecord begins at Self-Reported (25 pts)', async () => {
      const record = await createEmploymentRecord({
        traineeId: 'trainee_test_p8',
        employerName: 'Persistent Systems Ltd',
        roleTitle: 'Associate Software Engineer',
        wageBand: '20-30k',
      });

      expect(record.confidenceScore).toBe(25);
      expect(record.evidenceLabel).toBe('Self-reported');
      expect(record.levelCode).toBe('SELF_REPORTED');
      expect(record.formula).toBe('C = min(100, 25S + 25E + 20D + 15T + 15X)');
    });

    test('addVerificationEvidence incrementally recalculates score with formula audit', async () => {
      const record = await createEmploymentRecord({
        traineeId: 'trainee_test_p8_inc',
        employerName: 'KPIT Technologies',
        roleTitle: 'Embedded C Developer',
      });
      expect(record.confidenceScore).toBe(25);

      // Attach Pay Slip (+20 pts -> 45)
      const afterDoc = await addVerificationEvidence({
        employmentRecordId: record.id,
        evidenceLevel: 'DOCUMENT_PAYSLIP',
        evidenceType: 'PAYSLIP',
        documentRef: 's3://evidence/payslip_july2025.pdf',
        notes: 'Monthly pay slip verified for July 2025',
      });
      expect(afterDoc.confidenceScore).toBe(45);
      expect(afterDoc.levelCode).toBe('SELF_REPORTED');

      // Attach Employer Confirmation (+25 pts -> 70)
      const afterEmployer = await addVerificationEvidence({
        employmentRecordId: record.id,
        evidenceLevel: 'EMPLOYER_CONFIRMATION',
        evidenceType: 'EMPLOYER_SIGN_OFF',
        notes: 'HR confirmed start date of 2025-06-15',
      });
      expect(afterEmployer.confidenceScore).toBe(70);
      expect(afterEmployer.levelCode).toBe('PARTIALLY_VERIFIED');
    });
  });
});
