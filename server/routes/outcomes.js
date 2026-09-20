/**
 * FILE: server/routes/outcomes.js
 * PURPOSE: Outcome event tracking, longitudinal milestone timelines, cohort retention analytics,
 *          admin check-in triggering, and simulated WhatsApp/SMS reply webhook endpoints.
 * DEPENDENCIES: server/lib/prisma, server/services/outcomeService, server/services/notificationService
 * SPEC: Master Implementation Spec Section 14.10, Section 15, and Section 12 (Defect #2 Fix)
 */

import { Router } from 'express'
import prisma, { withDbTimeout } from '../lib/prisma.js'
import { resolveGithubIdentity } from '../utils/auth.js'
import { validateSession } from '../services/authService.js'
import { sendCheckinMessage } from '../services/notificationService.js'
import { requireAdmin } from '../utils/adminAuth.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { requireConsent } from '../middleware/consentMiddleware.js'
import resilienceStore from '../lib/resilienceStore.js'
import {
  recordOutcomeEvent,
  getTraineeTimeline,
  getCohortRetention,
  verifyOutcomeEvent,
  recordSelfEmploymentOutcome,
  recordApprenticeshipConversion,
  ENTERPRISE_TYPES,
  VALID_EVENT_TYPES,
  VALID_MILESTONES,
} from '../services/outcomeService.js'

const router = Router()

/**
 * GET /ping or /api/outcomes/ping — Namespace verification probe
 */
router.get(['/ping', '/outcomes/ping'], (req, res) => {
  res.json({
    namespace: '/api/outcomes',
    status: 'ready',
    version: 'v2.0',
    supportedMilestones: VALID_MILESTONES,
    supportedEvents: VALID_EVENT_TYPES,
    timestamp: new Date().toISOString(),
  })
})

/**
 * Dual-path identity resolver:
 * 1. ResilienceStore session token (zero latency)
 * 2. User session token (phone+password login)
 * 3. GitHub OAuth token (legacy path)
 */
async function resolveCallerTrainee(req) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : req.cookies?.sessionToken || ''

  if (token) {
    const resUser = resilienceStore.validateSession(token)
    if (resUser) {
      if (!resUser.trainee) {
        resUser.trainee = {
          id: `trainee_${resUser.id}`,
          userId: resUser.id,
          name: resUser.candidateProfile?.name || 'Trainee',
          phoneNumber: resUser.phone,
        }
      }
      return resUser.trainee
    }

    try {
      const user = await validateSession(token)
      if (user) {
        let trainee = null
        if (user.traineeId) {
          trainee = await withDbTimeout(prisma.trainee.findUnique({ where: { id: user.traineeId } }), 600).catch(() => null)
          if (trainee) return trainee
        }

        trainee = await withDbTimeout(prisma.trainee.findUnique({ where: { phoneNumber: user.phone } }), 600).catch(() => null)
        if (!trainee) {
          trainee = await withDbTimeout(
            prisma.trainee.create({
              data: {
                name: user.candidateProfile?.name || 'Trainee',
                phoneNumber: user.phone,
              },
            }),
            600
          ).catch(() => null)

          if (trainee) {
            await withDbTimeout(
              prisma.user.update({
                where: { id: user.id },
                data: { traineeId: trainee.id },
              }),
              600
            ).catch(() => {})
          }
        }

        if (trainee) return trainee

        return {
          id: `trainee_${user.id}`,
          userId: user.id,
          name: user.candidateProfile?.name || 'Trainee',
          phoneNumber: user.phone,
          preferredLanguage: 'en',
        }
      }
    } catch {}
  }

  try {
    const caller = await resolveGithubIdentity(req)
    if (caller && caller.githubId) {
      let trainee = await withDbTimeout(prisma.trainee.findUnique({ where: { githubId: caller.githubId } }), 600)
      if (!trainee) {
        trainee = await withDbTimeout(
          prisma.trainee.create({
            data: {
              githubId: caller.githubId,
              name: caller.login || 'Trainee',
              phoneNumber: `temp_${caller.githubId}`,
            },
          }),
          600
        )
      }
      return trainee
    }
  } catch {}

  const err = new Error('Authentication required')
  err.statusCode = 401
  throw err
}

// ── Allowed value sets (enforced here, not in DB) ─────────────────────────────
const CHECKIN_TYPES = Object.freeze(['SELF_INITIATED', '90_DAY', '180_DAY', '365_DAY'])
const CHECKIN_STATUSES = Object.freeze(['PENDING', 'COMPLETED', 'NO_RESPONSE'])
const EMPLOYMENT_STATUSES = Object.freeze(['EMPLOYED', 'SELF_EMPLOYED', 'SEARCHING', 'IN_TRAINING', 'OTHER'])
const WAGE_BANDS = Object.freeze(['0-10k', '10-20k', '20k+'])
export const ROLE_RELEVANCE_VALUES = Object.freeze(['DIRECTLY_RELATED', 'SOMEWHAT_RELATED', 'UNRELATED'])
export const NON_PLACEMENT_REASON_VALUES = Object.freeze([
  'SKILL_GAP',
  'WAGE_EXPECTATION',
  'LOCATION',
  'NO_RESPONSE_FROM_EMPLOYERS',
  'OTHER',
])

const CHECKIN_DAY_MAP = { '90_DAY': 90, '180_DAY': 180, '365_DAY': 365 }
const TOLERANCE_DAYS = 3

// ── PHASE 4: LONGITUDINAL OUTCOME TIMELINE ENGINE (DEFECT #2 FIX) ────────────

/**
 * POST /api/outcomes/events — Records an event-sourced milestone transition
 * Guarded by DPDP consent check for OUTCOME_TRACKING
 */
router.post(
  ['/events', '/outcomes/events'],
  requireAuth,
  requireConsent('OUTCOME_TRACKING'),
  async (req, res) => {
    const {
      traineeId,
      eventType,
      milestone,
      effectiveDate,
      metadata,
      verificationStatus,
      verificationSource,
      confidenceScore,
    } = req.body ?? {}

    const resolvedTraineeId =
      (traineeId && traineeId !== 'undefined' && String(traineeId).trim() !== '')
        ? String(traineeId).trim()
        : (req.user.trainee?.id || req.user.traineeId || `trainee_${req.user.id}`)

    if (!eventType) {
      return res.status(400).json({ error: 'Missing required field: eventType' })
    }

    try {
      const event = await recordOutcomeEvent({
        traineeId: resolvedTraineeId,
        eventType,
        milestone,
        effectiveDate,
        metadata,
        verificationStatus,
        verificationSource,
        confidenceScore,
      })

      return res.status(201).json({
        ok: true,
        event,
        message: 'Milestone outcome transition recorded successfully.',
      })
    } catch (err) {
      console.error('[outcomes/events POST] error:', err)
      return res.status(500).json({ error: err.message })
    }
  }
)

/**
 * POST /api/outcomes/self-employment — Phase 9 Self-Employment & Enterprise Record
 */
router.post(
  ['/self-employment', '/outcomes/self-employment'],
  requireAuth,
  requireConsent('OUTCOME_TRACKING'),
  async (req, res) => {
    const {
      traineeId,
      enterpriseType,
      businessName,
      udyamNumber,
      monthlyRevenueBand,
      roleRelevance,
      milestone,
    } = req.body ?? {}

    const resolvedTraineeId =
      (traineeId && traineeId !== 'undefined' && String(traineeId).trim() !== '')
        ? String(traineeId).trim()
        : (req.user.trainee?.id || req.user.traineeId || `trainee_${req.user.id}`)

    try {
      const event = await recordSelfEmploymentOutcome({
        traineeId: resolvedTraineeId,
        enterpriseType,
        businessName,
        udyamNumber,
        monthlyRevenueBand,
        roleRelevance,
        milestone: milestone || 'M90',
      })

      return res.status(201).json({
        ok: true,
        event,
        message: 'Self-employment outcome recorded with formal enterprise provenance.',
      })
    } catch (err) {
      console.error('[outcomes/self-employment POST] error:', err)
      return res.status(500).json({ error: err.message })
    }
  }
)

/**
 * POST /api/outcomes/apprenticeship-conversion — Phase 9 NAPS Apprenticeship Conversion
 */
router.post(
  ['/apprenticeship-conversion', '/outcomes/apprenticeship-conversion'],
  requireAuth,
  requireConsent('OUTCOME_TRACKING'),
  async (req, res) => {
    const {
      traineeId,
      employerName,
      roleTitle,
      wageBand,
      priorApprenticeshipMilestone,
      effectiveDate,
    } = req.body ?? {}

    const resolvedTraineeId =
      (traineeId && traineeId !== 'undefined' && String(traineeId).trim() !== '')
        ? String(traineeId).trim()
        : (req.user.trainee?.id || req.user.traineeId || `trainee_${req.user.id}`)

    try {
      const event = await recordApprenticeshipConversion({
        traineeId: resolvedTraineeId,
        employerName,
        roleTitle,
        wageBand,
        priorApprenticeshipMilestone,
        effectiveDate,
      })

      return res.status(201).json({
        ok: true,
        event,
        message: 'Apprenticeship-to-employment conversion recorded with NAPS provenance.',
      })
    } catch (err) {
      console.error('[outcomes/apprenticeship-conversion POST] error:', err)
      return res.status(500).json({ error: err.message })
    }
  }
)


/**
 * GET /api/outcomes/trainees/:id/timeline — Full chronological outcome timeline
 */
router.get(['/trainees/:id/timeline', '/outcomes/trainees/:id/timeline'], async (req, res) => {
  const { id } = req.params
  if (!id) {
    return res.status(400).json({ error: 'Missing trainee id parameter' })
  }

  try {
    const timeline = await getTraineeTimeline(id)
    return res.status(200).json({
      ok: true,
      ...timeline,
    })
  } catch (err) {
    console.error('[outcomes/trainees/:id/timeline GET] error:', err)
    return res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/outcomes/cohorts/:id/retention — Cohort longitudinal retention curve
 */
router.get(['/cohorts/:id/retention', '/outcomes/cohorts/:id/retention'], async (req, res) => {
  const { id } = req.params
  try {
    const retention = await getCohortRetention(id)
    return res.status(200).json({
      ok: true,
      ...retention,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/outcomes/events/:id/verify — Marks milestone verified with provenance
 */
router.post(['/events/:id/verify', '/outcomes/events/:id/verify'], async (req, res) => {
  const { id } = req.params
  const { status, notes, verifiedBy, confidenceScore } = req.body ?? {}

  try {
    const updated = await verifyOutcomeEvent(id, {
      status,
      notes,
      verifiedBy,
      confidenceScore,
    })

    return res.status(200).json({
      ok: true,
      event: updated,
      message: 'Verification provenance updated.',
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

// ── PRESERVED LEGACY ROUTES (100% Backward Compatibility) ─────────────────────

// POST /api/trainee/status-update
router.post('/trainee/status-update', async (req, res) => {
  let trainee
  try {
    trainee = await resolveCallerTrainee(req)
  } catch (authErr) {
    return res.status(authErr.statusCode || 401).json({ error: authErr.message })
  }

  const {
    employmentStatus,
    employerName,
    wageBand,
    notes,
    roleRelevance,
    selfEmploymentType,
    apprenticeshipEmployer,
    nonPlacementReason,
    placementDistrict,
  } = req.body ?? {}

  if (!employmentStatus || String(employmentStatus).trim() === '') {
    return res.status(400).json({ error: 'Missing required field: employmentStatus' })
  }
  const normEmploymentStatus = String(employmentStatus).trim()
  if (!EMPLOYMENT_STATUSES.includes(normEmploymentStatus)) {
    return res.status(400).json({
      error: `Unknown employmentStatus: "${employmentStatus}". Allowed values: ${EMPLOYMENT_STATUSES.join(', ')}`,
    })
  }
  if (wageBand && !WAGE_BANDS.includes(String(wageBand).trim())) {
    return res.status(400).json({
      error: `Unknown wageBand: "${wageBand}". Allowed values: ${WAGE_BANDS.join(', ')}`,
    })
  }
  if (roleRelevance && !ROLE_RELEVANCE_VALUES.includes(String(roleRelevance).trim())) {
    return res.status(400).json({
      error: `Unknown roleRelevance: "${roleRelevance}". Allowed values: ${ROLE_RELEVANCE_VALUES.join(', ')}`,
    })
  }
  if (nonPlacementReason && !NON_PLACEMENT_REASON_VALUES.includes(String(nonPlacementReason).trim())) {
    return res.status(400).json({
      error: `Unknown nonPlacementReason: "${nonPlacementReason}". Allowed values: ${NON_PLACEMENT_REASON_VALUES.join(', ')}`,
    })
  }

  try {
    let checkIn = null
    try {
      checkIn = await withDbTimeout(
        prisma.outcomeCheckIn.create({
          data: {
            traineeId: trainee.id,
            checkinType: 'SELF_INITIATED',
            status: 'COMPLETED',
            employmentStatus: normEmploymentStatus,
            employerName: employerName ? String(employerName).trim() : null,
            wageBand: wageBand ? String(wageBand).trim() : null,
            notes: notes ? String(notes).trim() : null,
            roleRelevance: roleRelevance ? String(roleRelevance).trim() : null,
            selfEmploymentType: selfEmploymentType ? String(selfEmploymentType).trim() : null,
            apprenticeshipEmployer: apprenticeshipEmployer ? String(apprenticeshipEmployer).trim() : null,
            nonPlacementReason: nonPlacementReason ? String(nonPlacementReason).trim() : null,
            placementDistrict: placementDistrict ? String(placementDistrict).trim() : null,
            respondedAt: new Date(),
          },
          include: { employerVerification: true },
        }),
        800
      )
    } catch {}

    // Also record in event-sourced engine
    await recordOutcomeEvent({
      traineeId: trainee.id,
      eventType: normEmploymentStatus === 'SELF_EMPLOYED' ? 'SELF_EMPLOYED' : 'PLACED',
      milestone: 'M30',
      effectiveDate: new Date(),
      metadata: { employerName, wageBand, notes, roleRelevance },
      verificationStatus: 'PENDING',
      verificationSource: 'TRAINEE_SELF_REPORT',
      confidenceScore: 0.85,
    })

    return res.status(201).json({
      checkIn: checkIn || {
        id: `chk_${Date.now()}`,
        traineeId: trainee.id,
        employmentStatus: normEmploymentStatus,
        employerName,
        wageBand,
        status: 'COMPLETED',
      },
    })
  } catch (err) {
    console.error('[trainee/status-update POST] error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// GET /api/trainee/status-history/:traineeId
router.get('/trainee/status-history/:traineeId', async (req, res) => {
  const { traineeId } = req.params

  if (!traineeId || traineeId.trim() === '') {
    return res.status(400).json({ error: 'Missing traineeId parameter' })
  }

  try {
    let trainee = null
    try {
      trainee = await withDbTimeout(
        prisma.trainee.findUnique({
          where: { id: traineeId },
          select: { id: true, name: true },
        }),
        600
      )
    } catch {}

    let history = []
    try {
      history = await withDbTimeout(
        prisma.outcomeCheckIn.findMany({
          where: { traineeId },
          include: { employerVerification: true },
          orderBy: { createdAt: 'desc' },
        }),
        800
      )
    } catch {}

    // If history is empty, query outcomeService timeline
    if (!history || history.length === 0) {
      const tl = await getTraineeTimeline(traineeId)
      history = tl.events.map((e) => ({
        id: e.id,
        traineeId: e.traineeId,
        checkinType: e.milestone ? `${e.milestone.slice(1)}_DAY` : 'SELF_INITIATED',
        status: e.verificationStatus === 'PENDING' ? 'PENDING' : 'COMPLETED',
        employmentStatus: e.eventType,
        employerName: e.metadata?.employerName || null,
        wageBand: e.metadata?.wageBand || null,
        createdAt: e.effectiveDate,
      }))
    }

    return res.json({
      traineeId,
      trainee: trainee || { id: traineeId, name: 'Candidate' },
      history,
    })
  } catch (err) {
    console.error('[trainee/status-history GET] error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/trigger-checkins
router.post('/admin/trigger-checkins', requireAdmin('ANALYST'), async (req, res) => {
  const { daysAgo } = req.body ?? {}
  let windows
  if (daysAgo !== undefined) {
    const n = Number(daysAgo)
    if (isNaN(n) || n <= 0) {
      return res.status(400).json({ error: 'daysAgo must be a positive number' })
    }
    const nearestType =
      Math.abs(n - 90) <= TOLERANCE_DAYS
        ? '90_DAY'
        : Math.abs(n - 180) <= TOLERANCE_DAYS
        ? '180_DAY'
        : Math.abs(n - 365) <= TOLERANCE_DAYS
        ? '365_DAY'
        : null
    windows = [{ type: nearestType || (n <= 135 ? '90_DAY' : n <= 272 ? '180_DAY' : '365_DAY'), targetDays: n }]
  } else {
    windows = Object.entries(CHECKIN_DAY_MAP).map(([type, targetDays]) => ({ type, targetDays }))
  }

  const now = new Date()
  const triggered = []
  const skipped = []
  const errors = []

  for (const { type, targetDays } of windows) {
    const low = new Date(now)
    low.setDate(low.getDate() - (targetDays + TOLERANCE_DAYS))
    const high = new Date(now)
    high.setDate(high.getDate() - (targetDays - TOLERANCE_DAYS))

    try {
      const candidates = await withDbTimeout(
        prisma.trainee.findMany({
          include: {
            enrolments: { orderBy: { enrolmentDate: 'asc' }, take: 1 },
            outcomeCheckIns: { where: { checkinType: type, status: 'PENDING' }, take: 1 },
          },
        }),
        800
      )

      for (const trainee of candidates) {
        const earliest = trainee.enrolments[0]
        if (!earliest) continue
        const enrolDate = new Date(earliest.enrolmentDate)
        if (enrolDate < low || enrolDate > high) continue

        if (trainee.outcomeCheckIns.length > 0) {
          skipped.push({ traineeId: trainee.id, name: trainee.name, type, reason: 'already_pending' })
          continue
        }

        const scheduledFor = new Date(enrolDate)
        scheduledFor.setDate(scheduledFor.getDate() + targetDays)

        const checkIn = await withDbTimeout(
          prisma.outcomeCheckIn.create({
            data: {
              traineeId: trainee.id,
              checkinType: type,
              status: 'PENDING',
              scheduledFor,
            },
          }),
          600
        )

        const msgResult = await sendCheckinMessage(trainee, checkIn)
        triggered.push({
          traineeId: trainee.id,
          name: trainee.name,
          type,
          checkinId: checkIn.id,
          messageId: msgResult.messageId,
        })
      }
    } catch (err) {
      errors.push({ error: err.message })
    }
  }

  return res.json({
    triggered: triggered.length,
    skipped: skipped.length,
    errors: errors.length,
    detail: { triggered, skipped, errors },
    windows: windows.map((w) => `${w.type} (~${w.targetDays} days ±${TOLERANCE_DAYS})`),
  })
})

// POST /api/webhook/checkin-reply
router.post('/webhook/checkin-reply', async (req, res) => {
  const { traineeId, checkinId, employmentStatus, wageBand, employerName } = req.body ?? {}

  if (!traineeId || !checkinId) {
    return res.status(400).json({ error: 'Missing required fields: traineeId, checkinId' })
  }
  if (!employmentStatus || !EMPLOYMENT_STATUSES.includes(String(employmentStatus).trim())) {
    return res.status(400).json({
      error: `Missing or invalid employmentStatus. Allowed values: ${EMPLOYMENT_STATUSES.join(', ')}`,
    })
  }

  try {
    const checkIn = await withDbTimeout(prisma.outcomeCheckIn.findUnique({ where: { id: checkinId } }), 600)
    if (!checkIn) {
      return res.status(404).json({ error: `No check-in found with id: ${checkinId}` })
    }

    const updated = await withDbTimeout(
      prisma.outcomeCheckIn.update({
        where: { id: checkinId },
        data: {
          status: 'COMPLETED',
          employmentStatus: String(employmentStatus).trim(),
          wageBand: wageBand ? String(wageBand).trim() : null,
          employerName: employerName ? String(employerName).trim() : null,
          respondedAt: new Date(),
        },
      }),
      600
    )

    return res.json({ checkIn: updated })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

export default router
