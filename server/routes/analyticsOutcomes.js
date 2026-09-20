/**
 * FILE: server/routes/analyticsOutcomes.js
 * PURPOSE: Phase 11 Provider and District Longitudinal Outcome Analytics.
 * SPECIFICATION: Master Spec Section 14.6, 20 & 27 (Phase 11).
 * MOUNTED AT: /api/analytics
 */

import { Router } from 'express';
import {
  computeProviderAnalytics,
  computeDistrictAnalytics,
  formatDenominatorMetric,
  MAHARASHTRA_DISTRICTS,
} from '../services/analyticsService.js';
import { validateSession } from '../services/authService.js';

const router = Router();

// Helper to resolve session
async function resolveAuthUser(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return null;
  return await validateSession(token);
}

/**
 * GET /api/analytics/ping
 * Readiness probe for outcome analytics
 */
router.get('/ping', (req, res) => {
  res.json({
    status: 'ready',
    namespace: '/api/analytics',
    phase: 11,
    antiOverrankingGuaranteed: true,
    smallCellSuppressionThreshold: 5,
    supportedDistrictsCount: MAHARASHTRA_DISTRICTS.length,
    policyContract: 'Section 20: Every metric renders sample size N and 95% confidence interval.',
  });
});

/**
 * GET /api/analytics/providers
 * Provider cohort analytics with denominator transparency, confidence intervals, and small cell suppression
 */
router.get('/providers', async (req, res) => {
  const user = await resolveAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Session required to view provider analytics' });
  }

  const { district, sector } = req.query;
  const data = await computeProviderAnalytics({
    district: typeof district === 'string' ? district : undefined,
    sector: typeof sector === 'string' ? sector : undefined,
  });

  res.json(data);
});

/**
 * GET /api/analytics/districts
 * District-level demand-supply imbalance ratio and trade deficits across Maharashtra
 */
router.get('/districts', async (req, res) => {
  const user = await resolveAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Session required to view district intelligence' });
  }

  const { region } = req.query;
  const data = await computeDistrictAnalytics({
    region: typeof region === 'string' ? region : undefined,
  });

  res.json(data);
});

/**
 * GET /api/analytics/policy-summary
 * State-level summary for policy planners and administrators
 */
router.get('/policy-summary', async (req, res) => {
  const user = await resolveAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Session required' });
  }

  const districtData = await computeDistrictAnalytics();
  const providerData = await computeProviderAnalytics();

  res.json({
    success: true,
    state: 'Maharashtra',
    stateWideSummary: districtData.stateWideSummary,
    providerCount: providerData.count,
    districtCount: districtData.count,
    principlesEnforced: [
      'Denominator transparency on all percentages',
      'Small cell suppression (< 5 masked)',
      'Coverage-adjusted retention instead of naked leaderboards',
      '95% confidence intervals on cohort point estimates',
    ],
  });
});

export default router;
