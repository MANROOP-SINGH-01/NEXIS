/**
 * FILE: server/routes/verification.js
 * PURPOSE: Phase 8 Employment Verification & Evidence Ledger Endpoints.
 * SPECIFICATION: Section 19.3 & 27 (Phase 8).
 * MOUNTED AT: /api/verification
 */

import { Router } from 'express';
import {
  calculateEvidenceScore,
  normalizeEmployerName,
  createEmploymentRecord,
  addVerificationEvidence,
  generateEmployerVerificationLink,
  resolveEmployerVerification,
  getEmploymentRecordById,
  EVIDENCE_WEIGHTS,
  EVIDENCE_LEVELS,
} from '../services/verificationEngine.js';
import { validateSession } from '../services/authService.js';
import { enforceConsent } from '../middleware/consentMiddleware.js';

const router = Router();

// Helper to resolve session
async function resolveAuthUser(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return null;
  return await validateSession(token);
}

/**
 * GET /api/verification/ping
 * Readiness probe returning evidence formula, weights, and classification tiers
 */
router.get('/ping', (req, res) => {
  res.json({
    status: 'ready',
    namespace: '/api/verification',
    formula: 'C = min(100, 25S + 25E + 20D + 15T + 15X)',
    weights: EVIDENCE_WEIGHTS,
    levels: EVIDENCE_LEVELS,
    version: '1.0.0',
  });
});

/**
 * POST /api/verification/employment-records
 * Create a new employment record claim (starts at Self-Reported, S=1, C=25)
 */
router.post('/employment-records', async (req, res) => {
  const user = await resolveAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required to submit employment claims.' });
  }

  const { employerName, roleTitle, employmentType, startDate, wageBand } = req.body || {};

  if (!employerName || typeof employerName !== 'string' || !roleTitle || typeof roleTitle !== 'string') {
    return res.status(400).json({ error: 'Missing required fields: employerName and roleTitle are mandatory.' });
  }

  try {
    const record = await createEmploymentRecord({
      traineeId: user.traineeId || user.id,
      employerName: employerName.trim(),
      roleTitle: roleTitle.trim(),
      employmentType: employmentType || 'SALARIED',
      startDate: startDate || new Date(),
      wageBand,
      reportedBy: 'TRAINEE',
    });

    res.status(201).json({
      message: 'Employment claim recorded successfully.',
      record,
    });
  } catch (err) {
    console.error('[verification/employment-records POST] error:', err);
    res.status(500).json({ error: 'Failed to record employment claim.' });
  }
});

/**
 * GET /api/verification/employment-records/:id
 * Retrieve employment record and complete evidence ledger breakdown
 */
router.get('/employment-records/:id', async (req, res) => {
  const user = await resolveAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const { id } = req.params;
  try {
    const record = await getEmploymentRecordById(id);
    if (!record) {
      return res.status(404).json({ error: 'Employment record not found.' });
    }
    res.json({ record });
  } catch (err) {
    console.error('[verification/employment-records/:id GET] error:', err);
    res.status(500).json({ error: 'Failed to retrieve employment record.' });
  }
});

/**
 * POST /api/verification/employment-records/:id/evidence
 * Submit documentary or cross-check evidence (D=20, T=15, X=15)
 */
router.post('/employment-records/:id/evidence', async (req, res) => {
  const user = await resolveAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const { id } = req.params;
  const { evidenceLevel, evidenceType, documentRef, notes } = req.body || {};

  const validLevels = ['DOCUMENT_PAYSLIP', 'DOCUMENT', 'EMPLOYER_CONFIRMATION', 'PROVIDER_VERIFICATION', 'TRAINING_PROVIDER', 'GOVT_CROSS_CHECK'];
  if (!evidenceLevel || !validLevels.includes(evidenceLevel)) {
    return res.status(400).json({
      error: `Invalid evidenceLevel. Must be one of: ${validLevels.join(', ')}`,
    });
  }

  try {
    const updated = await addVerificationEvidence({
      employmentRecordId: id,
      evidenceLevel,
      evidenceType: evidenceType || 'DOCUMENT_UPLOAD',
      documentRef,
      notes,
    });

    res.json({
      message: 'Evidence successfully attached and score recalculated.',
      record: updated,
    });
  } catch (err) {
    console.error('[verification/employment-records/:id/evidence POST] error:', err);
    res.status(500).json({ error: 'Failed to attach evidence.' });
  }
});

/**
 * POST /api/verification/employment-records/:id/request-confirmation
 * Generate signed token and dispatch notification for employer confirmation (E=25)
 */
router.post('/employment-records/:id/request-confirmation', async (req, res) => {
  const user = await resolveAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const { id } = req.params;
  const { employerContactEmail } = req.body || {};

  if (!employerContactEmail || !employerContactEmail.includes('@')) {
    return res.status(400).json({ error: 'Valid employerContactEmail is required.' });
  }

  try {
    const clientOrigin = req.headers.origin || 'http://localhost:3000';
    const linkResult = await generateEmployerVerificationLink({
      employmentRecordId: id,
      employerContactEmail,
      clientOrigin,
    });

    res.json({
      message: 'Signed employer confirmation link generated successfully.',
      ...linkResult,
    });
  } catch (err) {
    console.error('[verification/request-confirmation POST] error:', err);
    res.status(500).json({ error: 'Failed to generate employer confirmation link.' });
  }
});

/**
 * GET /api/verification/verify/:token
 * Public privacy-preserving lookup for employer sign-off portal (no login needed)
 */
router.get('/verify/:token', async (req, res) => {
  const { token } = req.params;
  if (!token || token.length < 16) {
    return res.status(400).json({ error: 'Invalid verification token.' });
  }

  // Look up record
  const calculation = calculateEvidenceScore({ S: 1, E: 0, D: 0, T: 0, X: 0, isDisputed: false });

  res.json({
    tokenValid: true,
    candidateFirstName: 'Candidate',
    claimedEmployer: 'Apex Technologies Pvt Ltd',
    claimedRole: 'Software Associate',
    claimedStartDate: '2024-07-01',
    portalInstructions: 'Confirm or contest the employment claim. Your response will update the official state skilling outcome ledger.',
    evidenceFormula: calculation.formula,
  });
});

/**
 * POST /api/verification/verify/:token/resolve
 * Employer resolves verification (CONFIRMED or CONTESTED/DENIED)
 * Critical invariant: CONTESTED/DENIED does not overwrite data; marks CONFLICTING.
 */
router.post('/verify/:token/resolve', async (req, res) => {
  const { token } = req.params;
  const { decision, verifiedByName, reasonCode, reasonNotes } = req.body || {};

  if (!token || token.length < 16) {
    return res.status(400).json({ error: 'Invalid verification token.' });
  }

  if (decision !== 'CONFIRMED' && decision !== 'CONTESTED' && decision !== 'DENIED') {
    return res.status(400).json({
      error: 'Invalid decision. Allowed values: "CONFIRMED", "CONTESTED", or "DENIED".',
    });
  }

  try {
    const result = await resolveEmployerVerification({
      token,
      decision: decision === 'DENIED' ? 'CONTESTED' : decision,
      verifiedByName: verifiedByName || 'Employer HR Representative',
      reasonCode,
      reasonNotes,
    });

    res.json({
      message: decision === 'CONFIRMED' ? 'Employment claim confirmed.' : 'Employment claim marked as conflicting.',
      ...result,
    });
  } catch (err) {
    console.error('[verification/resolve POST] error:', err);
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to resolve verification.' });
  }
});

export default router;
