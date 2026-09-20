/**
 * FILE: server/routes/roleViews.js
 * PURPOSE: Express API routes for Government Dashboard & Role Views (District Officers, State Policy, Employers).
 * SPECIFICATION: Master Spec Section 7, 14.6, 20, 21.2 & 27 (Phase 14).
 * MOUNTED AT: /api/role-views
 */

import { Router } from 'express'
import { validateSession } from '../services/authService.js'
import resilienceStore from '../lib/resilienceStore.js'
import {
  resolveUserRoleScope,
  getDistrictOfficerView,
  getStatePolicyView,
  runPolicySimulator,
  registerEmployerDemandSignal,
  getEmployerDemandSignals,
  MAHARASHTRA_SKILLING_SCHEMES,
} from '../services/roleViewsService.js'

const router = Router()

// Helper to authenticate user session
async function resolveAuthUser(req) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!token) return null

  // 0. Resilience session validation
  const resilienceUser = resilienceStore.validateSession(token)
  if (resilienceUser) {
    return resilienceUser
  }

  // 1. Primary database session validation
  try {
    const user = await validateSession(token)
    if (user) return user
  } catch (err) {
    console.error('[roleViews] session validation error:', err)
  }

  return null
}

/**
 * GET /api/role-views/ping
 * Readiness probe for government role views
 */
router.get('/ping', (req, res) => {
  res.json({
    status: 'ready',
    namespace: '/api/role-views',
    phase: 14,
    supportedPersonas: [
      'DISTRICT_OFFICER',
      'STATE_ADMIN',
      'POLICY_ANALYST',
      'PROVIDER',
      'EMPLOYER',
      'CANDIDATE',
    ],
    rowLevelAccessEnforced: true,
    policySimulatorEnabled: true,
    disclaimerInvariant: 'Section 20: Policy simulator outputs strictly marked with assumption disclaimers.',
  })
})

/**
 * GET /api/role-views/me
 * Returns the resolved role scope, district assignment, and authorized capabilities for the authenticated session.
 */
router.get('/me', async (req, res) => {
  const user = await resolveAuthUser(req)
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Session token required' })
  }

  const scope = resolveUserRoleScope(user)
  res.json({
    success: true,
    userId: user.id,
    userRole: scope.role,
    isStateWide: scope.isStateWide,
    assignedDistrict: scope.assignedDistrict || null,
    allowedDistricts: scope.allowedDistricts,
    allowedProviders: scope.allowedProviders,
  })
})

/**
 * GET /api/role-views/district-officer
 * Row-level scoped district officer intelligence: demand-supply ratio, trade deficits,
 * remedial intervention queue, and local provider comparisons with 95% CI.
 */
router.get('/district-officer', async (req, res) => {
  const user = await resolveAuthUser(req)
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Session required for District Officer view' })
  }

  const scope = resolveUserRoleScope(user)
  const requestedDistrict = req.query.district ? String(req.query.district) : undefined

  // Enforce Row-Level Security: If District Officer attempts to view an unassigned district, enforce assigned district
  if (!scope.isStateWide && requestedDistrict && scope.assignedDistrict && requestedDistrict.toLowerCase() !== scope.assignedDistrict.toLowerCase()) {
    // Row-level guard: Clamp query to assigned district
    const view = await getDistrictOfficerView({ user, requestedDistrict: scope.assignedDistrict })
    return res.json({
      ...view,
      rowLevelNotice: `Access scoped to assigned district: ${scope.assignedDistrict}`,
    })
  }

  const view = await getDistrictOfficerView({ user, requestedDistrict })
  res.json(view)
})

/**
 * GET /api/role-views/state-policy
 * State administrator and policy analyst portfolio overview: PMKVY/MSSDS/NAPS schemes,
 * 36-district disparity index, equity indicators, and data completeness.
 */
router.get('/state-policy', async (req, res) => {
  const user = await resolveAuthUser(req)
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Session required for State Policy view' })
  }

  const scope = resolveUserRoleScope(user)
  // Non-administrative / non-analyst candidates are prohibited from accessing statewide confidential portfolio
  if (['CANDIDATE', 'TRAINEE'].includes(scope.role)) {
    return res.status(403).json({
      error: 'Forbidden: Statewide policy dashboard is restricted to state administrators and analysts.',
    })
  }

  const view = await getStatePolicyView({ user })
  res.json(view)
})

/**
 * POST /api/role-views/policy-simulator
 * Interactive scenario analysis and What-If simulator.
 * Invariant: Outputs must include isSimulation: true and explicit assumption disclaimers.
 */
router.post('/policy-simulator', async (req, res) => {
  const user = await resolveAuthUser(req)
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Session required for Policy Simulator' })
  }

  const {
    budgetAdjustmentPercent = 0,
    targetDistricts = [],
    targetSectors = [],
    enforceRetentionMandate = false,
    reallocateSeatsToDeficitTrades = false,
  } = req.body || {}

  const result = runPolicySimulator({
    budgetAdjustmentPercent: Number(budgetAdjustmentPercent || 0),
    targetDistricts: Array.isArray(targetDistricts) ? targetDistricts : [],
    targetSectors: Array.isArray(targetSectors) ? targetSectors : [],
    enforceRetentionMandate: Boolean(enforceRetentionMandate),
    reallocateSeatsToDeficitTrades: Boolean(reallocateSeatsToDeficitTrades),
  })

  res.json(result)
})

/**
 * GET /api/role-views/employer/demand-signals
 * Returns verified employer hiring demand signals and skill requirements
 */
router.get('/employer/demand-signals', async (req, res) => {
  const user = await resolveAuthUser(req)
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Session required' })
  }

  const district = req.query.district ? String(req.query.district) : null
  const signals = getEmployerDemandSignals(district)

  res.json({
    success: true,
    count: signals.length,
    districtFilter: district,
    demandSignals: signals,
  })
})

/**
 * POST /api/role-views/employer/demand-signals
 * Allows employers to post hiring demand signals with wage bands and skill requirements
 */
router.post('/employer/demand-signals', async (req, res) => {
  const user = await resolveAuthUser(req)
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Session required' })
  }

  const { employerName, district, sector, requiredSkills, openingsCount, minWageInr, maxWageInr, experienceRequired } = req.body || {}

  if (!sector || !district) {
    return res.status(400).json({ error: 'district and sector are required for employer demand signal.' })
  }

  const created = registerEmployerDemandSignal({
    employerName: employerName || user.candidateProfile?.name || 'Partner Employer',
    district,
    sector,
    requiredSkills,
    openingsCount,
    minWageInr,
    maxWageInr,
    experienceRequired,
  })

  res.status(201).json({
    success: true,
    message: 'Employer demand signal registered successfully.',
    demandSignal: created,
  })
})

export default router
