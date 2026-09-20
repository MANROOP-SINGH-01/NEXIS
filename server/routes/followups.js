/**
 * FILE: server/routes/followups.js
 * PURPOSE: Multichannel follow-up scheduling, execution queue, and respondent tracking.
 * NAMESPACE: /api/followups/*
 * SPEC: Master Implementation Spec Section 14.3, Phase 1 & Phase 5
 */

import { Router } from 'express'
import { requireFeatureFlag } from '../utils/featureFlags.js'
import { requireAuth } from '../middleware/authMiddleware.js'

const router = Router()

// Apply feature flag check for the entire followups namespace
router.use(requireFeatureFlag('FOLLOWUP_ORCHESTRATION'))

/**
 * GET /api/followups/ping — Health & contract verification probe
 */
router.get('/ping', (req, res) => {
  res.json({
    namespace: '/api/followups',
    status: 'ready',
    checkpoints: ['T_0', 'T_30', 'T_90', 'T_180', 'T_365'],
    timestamp: new Date().toISOString(),
  })
})

/**
 * GET /api/followups/queue — Follow-up operator outreach queue
 * Stub for Phase 1; full implementation lands in Phase 5.
 */
router.get('/queue', requireAuth, async (req, res) => {
  res.json({
    queue: [],
    totalPending: 0,
    assistedCallsDue: 0,
    dormantCount: 0,
    mode: 'foundation_ready',
  })
})

export default router
