/**
 * FILE: server/routes/skills.js
 * PURPOSE: Explainable skill extraction, taxonomy crosswalk, and evidence-grounded gap analysis.
 * NAMESPACE: /api/skills/*
 * SPEC: Master Implementation Spec Section 14.5, Phase 1 & Phase 6
 */

import { Router } from 'express'
import { requireFeatureFlag } from '../utils/featureFlags.js'
import { requireAuth } from '../middleware/authMiddleware.js'

const router = Router()

// Apply feature flag check for the skills namespace
router.use(requireFeatureFlag('EXPLAINABLE_SKILL_INTELLIGENCE'))

/**
 * GET /api/skills/ping — Health & contract verification probe
 */
router.get('/ping', (req, res) => {
  res.json({
    namespace: '/api/skills',
    status: 'ready',
    evidenceClasses: [
      'ASSESSMENT_SCORE',
      'EMPLOYER_CONFIRMED_USE',
      'COMPLETED_PROJECT',
      'CERTIFICATION',
      'RESUME_MENTION',
      'SELF_REPORT',
    ],
    timestamp: new Date().toISOString(),
  })
})

/**
 * POST /api/skills/extract — Skill extraction scaffold
 * Stub for Phase 1; full implementation lands in Phase 6.
 */
router.post('/extract', requireAuth, async (req, res) => {
  const text = String(req.body?.text || '').trim()
  const sourceType = String(req.body?.sourceType || 'RESUME').toUpperCase()

  if (!text) {
    return res.status(400).json({ error: 'Missing required field: text' })
  }

  res.json({
    extractedSkills: [],
    sourceType,
    totalExtracted: 0,
    mode: 'foundation_ready',
  })
})

export default router
