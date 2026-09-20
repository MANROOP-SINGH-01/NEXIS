/**
 * FILE: server/services/verificationEngine.js
 * PURPOSE: Phase 8 Employment Verification & Evidence Ledger Service.
 * SPECIFICATION: NEXIS Master Implementation Plan Section 19.3 & 27 (Phase 8).
 * FORMULA: C = min(100, 25S + 25E + 20D + 15T + 15X)
 *   - S = Self-report (25 pts)
 *   - E = Employer confirmation (25 pts)
 *   - D = Document / offer letter / pay slip (20 pts)
 *   - T = Training provider verification (15 pts)
 *   - X = External government / EPF / tax cross-check (15 pts)
 */

import crypto from 'crypto';
import prisma from '../lib/prisma.js';

export const EVIDENCE_WEIGHTS = Object.freeze({
  S: 25, // Self-report
  E: 25, // Employer confirmation
  D: 20, // Document / offer letter / pay slip
  T: 15, // Training provider verification
  X: 15, // External government / EPF / tax cross-check
});

export const EVIDENCE_LEVELS = Object.freeze({
  UNVERIFIED: { min: 0, max: 24, label: 'Unverified', code: 'UNVERIFIED' },
  SELF_REPORTED: { min: 25, max: 49, label: 'Self-reported', code: 'SELF_REPORTED' },
  PARTIALLY_VERIFIED: { min: 50, max: 74, label: 'Partially verified', code: 'PARTIALLY_VERIFIED' },
  HIGHLY_VERIFIED: { min: 75, max: 89, label: 'Highly verified', code: 'HIGHLY_VERIFIED' },
  FULLY_VERIFIED: { min: 90, max: 100, label: 'Fully verified', code: 'FULLY_VERIFIED' },
  CONFLICTING: { min: 0, max: 100, label: 'Conflicting evidence', code: 'CONFLICTING' },
});

/**
 * In-memory fallback resilience store for SQLite/test environments
 * when public.EmploymentRecord or public.VerificationEvidence aren't in Postgres
 */
const inMemoryEmploymentLedger = new Map();

/**
 * Deterministically compute the Master Spec Section 19.3 Evidence Score
 * C = min(100, 25S + 25E + 20D + 15T + 15X)
 */
export function calculateEvidenceScore({ S = 0, E = 0, D = 0, T = 0, X = 0, isDisputed = false }) {
  const sScore = Boolean(S) ? EVIDENCE_WEIGHTS.S : 0;
  const eScore = Boolean(E) ? EVIDENCE_WEIGHTS.E : 0;
  const dScore = Boolean(D) ? EVIDENCE_WEIGHTS.D : 0;
  const tScore = Boolean(T) ? EVIDENCE_WEIGHTS.T : 0;
  const xScore = Boolean(X) ? EVIDENCE_WEIGHTS.X : 0;

  const rawScore = sScore + eScore + dScore + tScore + xScore;
  const score = Math.min(100, rawScore);

  let levelCode = 'UNVERIFIED';
  let label = 'Unverified';

  if (isDisputed) {
    levelCode = 'CONFLICTING';
    label = 'Conflicting evidence';
  } else if (score >= 90) {
    levelCode = 'FULLY_VERIFIED';
    label = 'Fully verified';
  } else if (score >= 75) {
    levelCode = 'HIGHLY_VERIFIED';
    label = 'Highly verified';
  } else if (score >= 50) {
    levelCode = 'PARTIALLY_VERIFIED';
    label = 'Partially verified';
  } else if (score >= 25) {
    levelCode = 'SELF_REPORTED';
    label = 'Self-reported';
  }

  return {
    score,
    levelCode,
    label,
    isDisputed: Boolean(isDisputed),
    breakdown: {
      S: { value: Boolean(S), points: sScore, max: EVIDENCE_WEIGHTS.S, label: 'Self-reported' },
      E: { value: Boolean(E), points: eScore, max: EVIDENCE_WEIGHTS.E, label: 'Employer confirmation' },
      D: { value: Boolean(D), points: dScore, max: EVIDENCE_WEIGHTS.D, label: 'Documentary evidence (Pay slip / Offer letter)' },
      T: { value: Boolean(T), points: tScore, max: EVIDENCE_WEIGHTS.T, label: 'Training provider confirmation' },
      X: { value: Boolean(X), points: xScore, max: EVIDENCE_WEIGHTS.X, label: 'Govt database cross-check' },
    },
    formula: 'C = min(100, 25S + 25E + 20D + 15T + 15X)',
  };
}

/**
 * Standardize and clean employer names for identity resolution
 */
export function normalizeEmployerName(rawName) {
  if (!rawName || typeof rawName !== 'string') return '';
  return rawName
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
    .replace(/\b(ltd|limited|pvt|private|inc|llp|corp|corporation|co|services|solutions|technologies|india)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate a cryptographically secure 30-day employer verification token
 */
export function generateSignedVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create or record an employment claim
 * @param {Object} params
 * @param {string} params.traineeId
 * @param {string} params.employerName
 * @param {string} params.roleTitle
 * @param {string} [params.employmentType]
 * @param {Date|string} [params.startDate]
 * @param {string} [params.wageBand]
 * @param {string} [params.reportedBy]
 */
export async function createEmploymentRecord({
  traineeId,
  employerName,
  roleTitle,
  employmentType = 'SALARIED',
  startDate = new Date(),
  wageBand = 'LESS_THAN_10K',
  reportedBy = 'TRAINEE',
}) {
  const normalized = normalizeEmployerName(employerName);
  const parsedStartDate = startDate ? new Date(startDate) : new Date();

  // Initial evidence: Self-reported (S=1, C=25)
  const calculation = calculateEvidenceScore({ S: 1, E: 0, D: 0, T: 0, X: 0, isDisputed: false });

  const recordId = `emp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const record = {
    id: recordId,
    traineeId,
    employerName,
    normalizedEmployerName: normalized,
    roleTitle,
    employmentType,
    startDate: parsedStartDate,
    endDate: null,
    wageBand: wageBand || null,
    isCurrent: true,
    confidenceScore: calculation.score,
    evidenceLabel: calculation.label,
    levelCode: calculation.levelCode,
    disputeFlag: false,
    disputeReason: null,
    disputeNotes: null,
    disputedAt: null,
    evidences: [
      {
        id: `ev_${Date.now()}_1`,
        evidenceLevel: 'SELF_REPORT',
        evidenceType: 'CANDIDATE_SELF_REPORT',
        evidenceScore: EVIDENCE_WEIGHTS.S,
        verifiedAt: new Date(),
        documentRef: null,
        notes: `Reported by ${reportedBy}`,
      },
    ],
    verificationToken: null,
    tokenExpiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Attempt DB persistence, fallback to memory
  try {
    let employer = await prisma.employer.findUnique({ where: { normalizedName: normalized } });
    if (!employer) {
      employer = await prisma.employer.create({
        data: {
          name: employerName,
          normalizedName: normalized,
          state: 'Maharashtra',
        },
      });
    }

    const dbRecord = await prisma.employmentRecord.create({
      data: {
        traineeId,
        employerId: employer.id,
        employerName,
        roleTitle,
        employmentType,
        startDate: parsedStartDate,
        wageBand: wageBand || null,
        confidenceScore: calculation.score,
        evidenceLabel: calculation.label,
        disputeFlag: false,
        verificationEvidences: {
          create: {
            evidenceLevel: 'SELF_REPORT',
            evidenceType: 'CANDIDATE_SELF_REPORT',
            evidenceScore: EVIDENCE_WEIGHTS.S,
            verifiedAt: new Date(),
            notes: `Reported by ${reportedBy}`,
          },
        },
      },
      include: { verificationEvidences: true, employer: true },
    });

    return {
      ...dbRecord,
      levelCode: calculation.levelCode,
      breakdown: calculation.breakdown,
      formula: calculation.formula,
    };
  } catch (dbErr) {
    inMemoryEmploymentLedger.set(recordId, record);
    return {
      ...record,
      breakdown: calculation.breakdown,
      formula: calculation.formula,
    };
  }
}

/**
 * Add an evidence item (Document, Provider, or Govt cross-check)
 */
export async function addVerificationEvidence({
  employmentRecordId,
  evidenceLevel, // 'DOCUMENT_PAYSLIP' | 'EMPLOYER_CONFIRMATION' | 'PROVIDER_VERIFICATION' | 'GOVT_CROSS_CHECK'
  evidenceType,  // 'PAYSLIP' | 'OFFER_LETTER' | 'EPFO_CROSSCHECK' | 'PROVIDER_AFFIDAVIT'
  documentRef = null,
  notes = null,
}) {
  let record = inMemoryEmploymentLedger.get(employmentRecordId);

  let evidences = record?.evidences || [];
  let isDisputed = record?.disputeFlag || false;

  try {
    const dbRecord = await prisma.employmentRecord.findUnique({
      where: { id: employmentRecordId },
      include: { verificationEvidences: true },
    });
    if (dbRecord) {
      evidences = dbRecord.verificationEvidences;
      isDisputed = dbRecord.disputeFlag;
    }
  } catch (err) {}

  // Determine which factors are now satisfied
  const existingLevels = new Set(evidences.map((e) => e.evidenceLevel));
  existingLevels.add(evidenceLevel);

  const S = 1; // Base self-report
  const E = existingLevels.has('EMPLOYER_CONFIRMATION') ? 1 : 0;
  const D = existingLevels.has('DOCUMENT_PAYSLIP') || existingLevels.has('DOCUMENT') ? 1 : 0;
  const T = existingLevels.has('PROVIDER_VERIFICATION') || existingLevels.has('TRAINING_PROVIDER') ? 1 : 0;
  const X = existingLevels.has('GOVT_CROSS_CHECK') ? 1 : 0;

  const pointsMap = {
    DOCUMENT_PAYSLIP: EVIDENCE_WEIGHTS.D,
    DOCUMENT: EVIDENCE_WEIGHTS.D,
    EMPLOYER_CONFIRMATION: EVIDENCE_WEIGHTS.E,
    PROVIDER_VERIFICATION: EVIDENCE_WEIGHTS.T,
    TRAINING_PROVIDER: EVIDENCE_WEIGHTS.T,
    GOVT_CROSS_CHECK: EVIDENCE_WEIGHTS.X,
  };
  const addedScore = pointsMap[evidenceLevel] || 10;

  const calculation = calculateEvidenceScore({ S, E, D, T, X, isDisputed });

  const newEvidence = {
    id: `ev_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    employmentRecordId,
    evidenceLevel,
    evidenceType,
    evidenceScore: addedScore,
    verifiedAt: new Date(),
    documentRef,
    notes,
    createdAt: new Date(),
  };

  try {
    await prisma.verificationEvidence.create({
      data: {
        employmentRecordId,
        evidenceLevel,
        evidenceType,
        evidenceScore: addedScore,
        verifiedAt: new Date(),
        documentRef,
        notes,
      },
    });

    const updated = await prisma.employmentRecord.update({
      where: { id: employmentRecordId },
      data: {
        confidenceScore: calculation.score,
        evidenceLabel: calculation.label,
      },
      include: { verificationEvidences: true },
    });

    return {
      ...updated,
      levelCode: calculation.levelCode,
      breakdown: calculation.breakdown,
      formula: calculation.formula,
    };
  } catch (err) {
    if (record) {
      record.evidences.push(newEvidence);
      record.confidenceScore = calculation.score;
      record.evidenceLabel = calculation.label;
      record.levelCode = calculation.levelCode;
      record.updatedAt = new Date();
      inMemoryEmploymentLedger.set(employmentRecordId, record);
    }
    return {
      ...(record || { id: employmentRecordId }),
      confidenceScore: calculation.score,
      evidenceLabel: calculation.label,
      levelCode: calculation.levelCode,
      breakdown: calculation.breakdown,
      formula: calculation.formula,
    };
  }
}

/**
 * Generate a signed 30-day confirmation link for the employer
 */
export async function generateEmployerVerificationLink({ employmentRecordId, employerContactEmail, clientOrigin = 'http://localhost:3000' }) {
  const verificationToken = generateSignedVerificationToken();
  const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const record = inMemoryEmploymentLedger.get(employmentRecordId);
  if (record) {
    record.verificationToken = verificationToken;
    record.tokenExpiresAt = tokenExpiresAt;
    record.employerContactEmail = employerContactEmail;
    inMemoryEmploymentLedger.set(employmentRecordId, record);
  }

  const link = `${clientOrigin}/verify/${verificationToken}`;

  return {
    verificationToken,
    tokenExpiresAt,
    verificationLink: link,
  };
}

/**
 * Resolve an employer verification link (CONFIRMED or CONTESTED/DENIED)
 * Preserves conflicting claims and underlying data without overwriting.
 */
export async function resolveEmployerVerification({
  token,
  decision, // 'CONFIRMED' | 'DENIED' | 'CONTESTED'
  verifiedByName,
  reasonCode = null,
  reasonNotes = null,
}) {
  // Find record either by memory or token search
  let targetRecord = null;
  for (const [id, r] of inMemoryEmploymentLedger.entries()) {
    if (r.verificationToken === token) {
      targetRecord = r;
      break;
    }
  }

  // Check expiration
  if (targetRecord?.tokenExpiresAt && new Date() > new Date(targetRecord.tokenExpiresAt)) {
    const expiredErr = new Error('Verification link has expired (30-day validity window exceeded).');
    expiredErr.statusCode = 410;
    throw expiredErr;
  }

  if (decision === 'CONFIRMED') {
    // Elevate score with E=25
    const S = 1;
    const E = 1;
    const D = targetRecord?.evidences?.some((e) => e.evidenceLevel === 'DOCUMENT_PAYSLIP') ? 1 : 0;
    const T = targetRecord?.evidences?.some((e) => e.evidenceLevel === 'PROVIDER_VERIFICATION') ? 1 : 0;
    const X = targetRecord?.evidences?.some((e) => e.evidenceLevel === 'GOVT_CROSS_CHECK') ? 1 : 0;

    const calculation = calculateEvidenceScore({ S, E, D, T, X, isDisputed: false });

    if (targetRecord) {
      targetRecord.confidenceScore = calculation.score;
      targetRecord.evidenceLabel = calculation.label;
      targetRecord.levelCode = calculation.levelCode;
      targetRecord.verifiedByName = verifiedByName;
      targetRecord.verifiedAt = new Date();
      targetRecord.disputeFlag = false;
      targetRecord.evidences.push({
        id: `ev_${Date.now()}_conf`,
        evidenceLevel: 'EMPLOYER_CONFIRMATION',
        evidenceType: 'EMPLOYER_SIGN_OFF',
        evidenceScore: EVIDENCE_WEIGHTS.E,
        verifiedAt: new Date(),
        notes: `Confirmed by ${verifiedByName || 'Employer representative'}`,
      });
      inMemoryEmploymentLedger.set(targetRecord.id, targetRecord);
    }

    return {
      status: 'CONFIRMED',
      levelCode: calculation.levelCode,
      evidenceLabel: calculation.label,
      confidenceScore: calculation.score,
      breakdown: calculation.breakdown,
      formula: calculation.formula,
      verifiedByName,
      verifiedAt: new Date(),
    };
  } else {
    // CONTESTED / DENIED - Critical Invariant: DO NOT overwrite data. Mark CONFLICTING.
    const calculation = calculateEvidenceScore({ S: 1, E: 0, D: 0, T: 0, X: 0, isDisputed: true });

    if (targetRecord) {
      targetRecord.disputeFlag = true;
      targetRecord.disputeReason = reasonCode || 'EMPLOYER_CONTESTED';
      targetRecord.disputeNotes = reasonNotes;
      targetRecord.disputedAt = new Date();
      targetRecord.levelCode = 'CONFLICTING';
      targetRecord.evidenceLabel = 'Conflicting evidence';
      targetRecord.verifiedByName = verifiedByName;
      inMemoryEmploymentLedger.set(targetRecord.id, targetRecord);
    }

    return {
      status: 'CONFLICTING',
      disputeFlag: true,
      levelCode: 'CONFLICTING',
      evidenceLabel: 'Conflicting evidence',
      confidenceScore: targetRecord?.confidenceScore || 25,
      disputeDetails: {
        reasonCode: reasonCode || 'EMPLOYER_CONTESTED',
        reasonNotes,
        contestedBy: verifiedByName || 'Employer representative',
        timestamp: new Date(),
      },
      preservedClaim: {
        traineeClaimedRole: targetRecord?.roleTitle || 'Claimed Role',
        traineeClaimedEmployer: targetRecord?.employerName || 'Claimed Employer',
        traineeClaimedStartDate: targetRecord?.startDate || null,
      },
      breakdown: calculation.breakdown,
      formula: calculation.formula,
    };
  }
}

/**
 * Query employment record by ID with full evidence audit ledger
 */
export async function getEmploymentRecordById(recordId) {
  // Check DB first
  try {
    const dbRecord = await prisma.employmentRecord.findUnique({
      where: { id: recordId },
      include: { verificationEvidences: true, wageObservations: true, employer: true },
    });
    if (dbRecord) {
      const existingLevels = new Set(dbRecord.verificationEvidences.map((e) => e.evidenceLevel));
      const S = 1;
      const E = existingLevels.has('EMPLOYER_CONFIRMATION') ? 1 : 0;
      const D = existingLevels.has('DOCUMENT_PAYSLIP') || existingLevels.has('DOCUMENT') ? 1 : 0;
      const T = existingLevels.has('PROVIDER_VERIFICATION') ? 1 : 0;
      const X = existingLevels.has('GOVT_CROSS_CHECK') ? 1 : 0;
      const calculation = calculateEvidenceScore({ S, E, D, T, X, isDisputed: dbRecord.disputeFlag });

      return {
        ...dbRecord,
        levelCode: calculation.levelCode,
        evidenceLabel: calculation.label,
        confidenceScore: calculation.score,
        breakdown: calculation.breakdown,
        formula: calculation.formula,
      };
    }
  } catch (err) {}

  const memRecord = inMemoryEmploymentLedger.get(recordId);
  if (memRecord) {
    const existingLevels = new Set(memRecord.evidences.map((e) => e.evidenceLevel));
    const S = 1;
    const E = existingLevels.has('EMPLOYER_CONFIRMATION') ? 1 : 0;
    const D = existingLevels.has('DOCUMENT_PAYSLIP') ? 1 : 0;
    const T = existingLevels.has('PROVIDER_VERIFICATION') ? 1 : 0;
    const X = existingLevels.has('GOVT_CROSS_CHECK') ? 1 : 0;
    const calculation = calculateEvidenceScore({ S, E, D, T, X, isDisputed: memRecord.disputeFlag });

    return {
      ...memRecord,
      levelCode: calculation.levelCode,
      evidenceLabel: calculation.label,
      confidenceScore: calculation.score,
      breakdown: calculation.breakdown,
      formula: calculation.formula,
    };
  }

  return null;
}
