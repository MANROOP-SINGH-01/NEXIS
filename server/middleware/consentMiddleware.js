/**
 * FILE: server/middleware/consentMiddleware.js
 * PURPOSE: Enforces DPDP Act 2023 granular consent verification on sensitive routes.
 *          If caller lacks active consent for the specified purpose, returns 403 Forbidden.
 * DEPENDENCIES: server/lib/prisma, server/lib/resilienceStore, server/utils/consent
 * SPEC: Master Spec Section 14.9, Section 15, and Section 12 (Defect #1 Remediation)
 */

import prisma, { withDbTimeout } from '../lib/prisma.js';
import resilienceStore from '../lib/resilienceStore.js';
import { DPDP_PURPOSES, SCOPE_TO_PURPOSE_MAP } from '../utils/consent.js';

/**
 * Middleware factory requiring that the authenticated trainee has granted active,
 * non-revoked consent for the specified operational purpose.
 *
 * @param {string} purpose - One of the canonical DPDP_PURPOSES or mapped legacy scopes
 * @returns {import('express').RequestHandler}
 */
export function requireConsent(purpose) {
  return async (req, res, next) => {
    // Caller must be authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    // Allow SUPER_ADMIN / ADMIN override for audit & governance
    if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN') {
      return next();
    }

    const traineeId = req.user.trainee?.id || req.user.traineeId || `trainee_${req.user.id}`;
    const canonicalPurpose = SCOPE_TO_PURPOSE_MAP[purpose] || purpose;

    // 1. Fast path: check resilience store
    if (resilienceStore.hasConsent(traineeId, canonicalPurpose) || resilienceStore.hasConsent(traineeId, purpose)) {
      return next();
    }

    // 2. Database path: check additive Consent table (with timeout guard)
    try {
      if (prisma && prisma.consent && typeof prisma.consent.findFirst === 'function') {
        const consentRow = await withDbTimeout(
          prisma.consent.findFirst({
            where: {
              traineeId,
              purpose: canonicalPurpose,
              granted: true,
              revokedAt: null,
            },
          }),
          500
        );

        if (consentRow) {
          // Warm the resilience store cache
          resilienceStore.grantConsent(traineeId, canonicalPurpose, consentRow.noticeVersion);
          return next();
        }
      }
    } catch (err) {
      // Remote DB unreachable or timed out
    }

    // 3. Fallback: check legacy ConsentRecord
    try {
      if (prisma && prisma.consentRecord && typeof prisma.consentRecord.findFirst === 'function') {
        const legacyRow = await withDbTimeout(
          prisma.consentRecord.findFirst({
            where: {
              traineeId,
              scope: purpose,
            },
            orderBy: { createdAt: 'desc' },
          }),
          500
        );

        if (legacyRow && legacyRow.granted && !legacyRow.revokedAt) {
          return next();
        }
      }
    } catch (err) {
      // Remote DB unreachable or timed out
    }

    // DPDP Active Consent Missing: Reject with 403 Forbidden and explicit remediation metadata
    return res.status(403).json({
      error: `Access denied: Active consent for '${purpose}' is required under DPDP Act 2023.`,
      code: 'DPDP_CONSENT_REQUIRED',
      requiredPurpose: purpose,
      traineeId,
      remediationUrl: '/profile/consent',
    });
  };
}

export const enforceConsent = requireConsent;

