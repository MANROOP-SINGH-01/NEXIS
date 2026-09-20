/**
 * FILE: server/routes/dataQuality.js
 * PURPOSE: REST API routes for Data Quality & Anomaly Detection (Phase 18)
 * Specification: Sections 14.6, 20, 27 Phase 18
 */

import { Router } from 'express'
import {
  getDataQualityIssues,
  runFullDataQualityScan,
  resolveDataQualityIssue,
  getDataQualitySummary,
  evaluateTraineeDataQuality
} from '../services/dataQualityService.js'

const router = Router()

/**
 * GET /api/data-quality/issues
 * Returns filtered list of data quality and anomaly issues.
 */
router.get('/data-quality/issues', (req, res) => {
  try {
    const { status, severity, category, district, q } = req.query
    const issues = getDataQualityIssues({
      status: status ? String(status).toUpperCase() : undefined,
      severity: severity ? String(severity).toUpperCase() : undefined,
      category: category ? String(category).toUpperCase() : undefined,
      district: district ? String(district) : undefined,
      query: q ? String(q) : undefined
    })

    res.json({
      issues,
      total: issues.length,
      filtersApplied: { status, severity, category, district, q }
    })
  } catch (err) {
    console.error('[data-quality/issues GET] error:', err)
    res.status(500).json({ error: err.message || 'Failed to fetch data quality issues' })
  }
})

/**
 * GET /api/data-quality/summary
 * Returns overall statistics and health score.
 */
router.get('/data-quality/summary', (req, res) => {
  try {
    const summary = getDataQualitySummary()
    res.json(summary)
  } catch (err) {
    console.error('[data-quality/summary GET] error:', err)
    res.status(500).json({ error: err.message || 'Failed to fetch data quality summary' })
  }
})

/**
 * POST /api/data-quality/scan
 * Initiates complete registry anomaly scan across trainees and providers.
 */
router.post('/data-quality/scan', async (req, res) => {
  try {
    const result = await runFullDataQualityScan()
    res.json({
      success: true,
      message: 'Data quality scan completed successfully',
      ...result
    })
  } catch (err) {
    console.error('[data-quality/scan POST] error:', err)
    res.status(500).json({ error: err.message || 'Data quality scan failed' })
  }
})

/**
 * POST /api/data-quality/issues/:id/resolve
 * Resolves or acknowledges a data quality issue.
 */
router.post('/data-quality/issues/:id/resolve', (req, res) => {
  const { id } = req.params
  const { action, reviewerName, notes } = req.body

  if (!action || !['RESOLVE', 'ACKNOWLEDGE', 'FALSE_POSITIVE'].includes(action.toUpperCase())) {
    return res.status(400).json({
      error: 'action is required and must be one of: RESOLVE, ACKNOWLEDGE, FALSE_POSITIVE'
    })
  }

  try {
    const resolvedIssue = resolveDataQualityIssue(
      id,
      action.toUpperCase(),
      reviewerName || 'Data Quality Operator',
      notes || ''
    )

    res.json({
      success: true,
      message: `Issue ${id} marked as ${action.toUpperCase()}`,
      issue: resolvedIssue
    })
  } catch (err) {
    console.error(`[data-quality/issues/${id}/resolve] error:`, err)
    res.status(404).json({ error: err.message || 'Issue not found' })
  }
})

/**
 * POST /api/data-quality/evaluate-record
 * Real-time validation of a candidate event record before submission.
 */
router.post('/data-quality/evaluate-record', (req, res) => {
  try {
    const record = req.body
    if (!record || !record.traineeId) {
      return res.status(400).json({ error: 'traineeId is required' })
    }

    const violations = evaluateTraineeDataQuality(record)
    res.json({
      traineeId: record.traineeId,
      isClean: violations.length === 0,
      violationsCount: violations.length,
      violations
    })
  } catch (err) {
    console.error('[data-quality/evaluate-record POST] error:', err)
    res.status(500).json({ error: err.message || 'Evaluation failed' })
  }
})

export default router
