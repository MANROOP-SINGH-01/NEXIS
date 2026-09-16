/**
 * FILE: server/routes/admin.js
 * PURPOSE: Admin panel API — RBAC-gated endpoints for whoami, dedup scanning,
 *          candidate review, and merge/reject resolution.
 *
 * All mutating endpoints call logAdminAction() for a full audit trail.
 *
 * Endpoints:
 *   GET  /api/admin/whoami                     — returns caller's AdminUser or 404
 *   POST /api/admin/run-dedup-scan             — requireAdmin("ANALYST"), triggers scan
 *   GET  /api/admin/dedup-candidates           — requireAdmin("REVIEWER"), list PENDING
 *   POST /api/admin/dedup-candidates/:id/resolve — requireAdmin("REVIEWER"), merge or reject
 *   GET  /api/admin/dedup-analytics            — requireAdmin("ANALYST"), dedup metrics
 *
 * DEPENDENCIES: server/lib/prisma, server/utils/adminAuth, server/services/matchingService,
 *               server/utils/auth
 * USED BY: server/index.js
 */

import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { resolveGithubIdentity } from '../utils/auth.js'
import { requireAdmin, logAdminAction } from '../utils/adminAuth.js'
import { findPotentialDuplicates } from '../services/matchingService.js'
import { mergeTrainees } from '../services/mergeService.js'
import { validateOtpVerificationToken } from './otpAuth.js'

const router = Router()

// ── GET /api/admin/whoami ─────────────────────────────────────────────────────
// Returns the caller's AdminUser record, or 404 if they are not an admin.
// Used by the frontend to gate admin UI without exposing the full admin middleware.
// Auth: Authorization: Bearer <github_token>
router.get('/admin/whoami', async (req, res) => {
  let caller
  try {
    caller = await resolveGithubIdentity(req)
  } catch (authErr) {
    res.status(authErr.statusCode || 401).json({ error: authErr.message })
    return
  }

  try {
    const adminUser = await prisma.adminUser.findUnique({
      where: { githubUsername: caller.login },
    })

    if (!adminUser) {
      res.status(404).json({ error: 'Not an admin user' })
      return
    }

    res.json({ adminUser })
  } catch (err) {
    console.error('[admin/whoami GET] error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to resolve admin identity' })
  }
})

// ── POST /api/admin/run-dedup-scan ────────────────────────────────────────────
// Triggers the matching service to find potential duplicate Trainee pairs.
// requireAdmin("ANALYST") — the lowest admin role can initiate a scan.
// Safe to call repeatedly — already-flagged pairs are not re-created.
router.post('/admin/run-dedup-scan', requireAdmin('ANALYST'), async (req, res) => {
  try {
    const result = await findPotentialDuplicates()

    await logAdminAction(
      req.adminUser.id,
      'DEDUP_SCAN',
      'DedupCandidate',
      'batch',
      {
        scanned: result.scanned,
        created: result.created,
        skipped: result.skipped,
        triggeredBy: req.adminUser.githubUsername,
      }
    )

    res.json({
      message: 'Dedup scan complete',
      ...result,
    })
  } catch (err) {
    console.error('[admin/run-dedup-scan POST] error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Dedup scan failed' })
  }
})

// ── GET /api/admin/dedup-candidates ──────────────────────────────────────────
// Returns all PENDING DedupCandidate rows with both Trainees' full details
// side-by-side, sorted by matchScore descending.
// requireAdmin("REVIEWER") — analysts cannot view the candidate list.
router.get('/admin/dedup-candidates', requireAdmin('REVIEWER'), async (req, res) => {
  try {
    const candidates = await prisma.dedupCandidate.findMany({
      where: { status: 'PENDING' },
      include: {
        traineeA: {
          include: {
            enrolments: { orderBy: { enrolmentDate: 'desc' } },
          },
        },
        traineeB: {
          include: {
            enrolments: { orderBy: { enrolmentDate: 'desc' } },
          },
        },
      },
      orderBy: { matchScore: 'desc' },
    })

    // Parse matchReasons from JSON strings to arrays for convenience
    const candidatesWithParsedReasons = candidates.map((c) => ({
      ...c,
      matchReasons: (() => {
        try { return JSON.parse(c.matchReasons) } catch { return [c.matchReasons] }
      })(),
    }))

    res.json({ candidates: candidatesWithParsedReasons, total: candidates.length })
  } catch (err) {
    console.error('[admin/dedup-candidates GET] error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch dedup candidates' })
  }
})

// ── POST /api/admin/dedup-candidates/:id/resolve ─────────────────────────────
// Resolves a DedupCandidate as either MERGE or REJECT.
// requireAdmin("REVIEWER")
//
// Body: {
//   action: "MERGE" | "REJECT",
//   otpVerificationToken?: string  // required for MERGE
// }
//
// REJECT: updates status + reviewedByAdminId + reviewedAt, logs action.
// MERGE:  runs a DB transaction —
//   1. Reassigns all Enrolments from traineeIdB → traineeIdA
//   2. Reassigns all ConsentRecords from traineeIdB → traineeIdA
//   3. Reassigns all OutcomeCheckIns from traineeIdB → traineeIdA
//   4. Sets traineeB.mergedIntoId = traineeIdA (soft-delete; NEVER hard-deletes)
//   5. Updates DedupCandidate to CONFIRMED_MERGE
//   Logs with full before/after details in AdminActionLog.
router.post('/admin/dedup-candidates/:id/resolve', requireAdmin('REVIEWER'), async (req, res) => {
  const { id } = req.params
  const { action, otpVerificationToken } = req.body ?? {}
  let otpVerified = false

  // Validate action
  if (!action || !['MERGE', 'REJECT'].includes(String(action).toUpperCase())) {
    res.status(400).json({ error: 'Invalid action. Expected "MERGE" or "REJECT".' })
    return
  }
  const resolvedAction = String(action).toUpperCase()

  if (resolvedAction === 'MERGE' && !otpVerificationToken) {
    res.status(400).json({ error: 'otpVerificationToken is required to confirm a merge.' })
    return
  }

  try {
    // Fetch the candidate
    const candidate = await prisma.dedupCandidate.findUnique({
      where: { id },
      include: {
        traineeA: { include: { enrolments: true, consentRecords: true, outcomeCheckIns: true } },
        traineeB: { include: { enrolments: true, consentRecords: true, outcomeCheckIns: true } },
      },
    })

    if (!candidate) {
      res.status(404).json({ error: `No DedupCandidate found with id: ${id}` })
      return
    }
    if (candidate.status !== 'PENDING') {
      res.status(409).json({
        error: `Candidate is already "${candidate.status}". Only PENDING candidates can be resolved.`,
      })
      return
    }

    if (resolvedAction === 'MERGE') {
      const verifiedPhone = validateOtpVerificationToken(otpVerificationToken);
      if (!verifiedPhone || verifiedPhone !== candidate.traineeA.phoneNumber) {
        res.status(401).json({ error: 'Invalid or expired OTP verification token for the canonical trainee (Record A).' });
        return;
      }
      otpVerified = true;
    }


    const now = new Date()

    // ── REJECT ────────────────────────────────────────────────────────────────
    if (resolvedAction === 'REJECT') {
      await prisma.dedupCandidate.update({
        where: { id },
        data: {
          status: 'REJECTED',
          reviewedByAdminId: req.adminUser.id,
          reviewedAt: now,
        },
      })

      await logAdminAction(req.adminUser.id, 'REJECT_CANDIDATE', 'DedupCandidate', id, {
        candidateId: id,
        traineeIdA: candidate.traineeIdA,
        traineeIdB: candidate.traineeIdB,
        matchScore: candidate.matchScore,
        otpVerified,
        reviewedBy: req.adminUser.githubUsername,
        reviewedAt: now.toISOString(),
      })

      res.json({ message: 'Candidate rejected', candidateId: id })
      return
    }

    // ── MERGE ─────────────────────────────────────────────────────────────────
    // Canonical record = traineeA (always the lexicographically smaller id).
    // All of traineeB's linked records are reassigned to traineeA in one transaction.
    const canonicalId = candidate.traineeIdA
    const mergedId = candidate.traineeIdB

    // Capture before-state for audit log
    const beforeState = {
      traineeB: {
        id: candidate.traineeB.id,
        name: candidate.traineeB.name,
        phoneNumber: candidate.traineeB.phoneNumber,
        enrolmentCount: candidate.traineeB.enrolments.length,
        consentRecordCount: candidate.traineeB.consentRecords.length,
        outcomeCheckInCount: candidate.traineeB.outcomeCheckIns.length,
      },
      traineeA: {
        id: candidate.traineeA.id,
        name: candidate.traineeA.name,
        phoneNumber: candidate.traineeA.phoneNumber,
        enrolmentCount: candidate.traineeA.enrolments.length,
        consentRecordCount: candidate.traineeA.consentRecords.length,
        outcomeCheckInCount: candidate.traineeA.outcomeCheckIns.length,
      },
    }

    const mergeSummary = await mergeTrainees(canonicalId, mergedId, req.adminUser.id)

    // Update DedupCandidate to CONFIRMED_MERGE
    await prisma.dedupCandidate.update({
      where: { id },
      data: {
        status: 'CONFIRMED_MERGE',
        reviewedByAdminId: req.adminUser.id,
        reviewedAt: now,
      },
    })

    // Capture after-state counts for audit
    const afterTraineeA = await prisma.trainee.findUnique({
      where: { id: canonicalId },
      include: {
        _count: { select: { enrolments: true, consentRecords: true, outcomeCheckIns: true } },
      },
    })

    const afterState = {
      traineeA: {
        id: canonicalId,
        enrolmentCount: afterTraineeA?._count?.enrolments ?? '?',
        consentRecordCount: afterTraineeA?._count?.consentRecords ?? '?',
        outcomeCheckInCount: afterTraineeA?._count?.outcomeCheckIns ?? '?',
      },
      traineeB: {
        id: mergedId,
        mergedIntoId: canonicalId,
        softDeleted: true,
      },
    }

    await logAdminAction(req.adminUser.id, 'MERGE_TRAINEE', 'DedupCandidate', id, {
      candidateId: id,
      canonicalTraineeId: canonicalId,
      mergedTraineeId: mergedId,
      matchScore: candidate.matchScore,
      otpVerified,
      reviewedBy: req.adminUser.githubUsername,
      reviewedAt: now.toISOString(),
      before: beforeState,
      after: afterState,
      summary: mergeSummary,
    })

    res.json({
      message: 'Trainee records merged successfully',
      canonicalTraineeId: canonicalId,
      mergedTraineeId: mergedId,
      candidateId: id,
      summary: mergeSummary,
    })
  } catch (err) {
    console.error('[admin/dedup-candidates/:id/resolve POST] error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to resolve candidate' })
  }
})

// ── GET /api/admin/dedup-analytics ───────────────────────────────────────────
// Returns analytics on the dedup process, specifically top reasons for rejection.
// requireAdmin("ANALYST")
router.get('/admin/dedup-analytics', requireAdmin('ANALYST'), async (req, res) => {
  try {
    const candidates = await prisma.dedupCandidate.findMany({
      select: { status: true, matchReasons: true },
    })

    let scanned = 0 // Actually we don't store scanned total, only in logs.
    let merged = 0
    let rejected = 0
    let pending = 0

    const rejectionReasonsCount = {}

    for (const c of candidates) {
      if (c.status === 'CONFIRMED_MERGE') merged++
      if (c.status === 'REJECTED') {
        rejected++
        try {
          const reasons = JSON.parse(c.matchReasons)
          if (Array.isArray(reasons)) {
            for (const r of reasons) {
              const prefix = r.split(':')[0] // Group variations like phone_last6_match:123456
              rejectionReasonsCount[prefix] = (rejectionReasonsCount[prefix] || 0) + 1
            }
          }
        } catch {}
      }
      if (c.status === 'PENDING') pending++
    }

    const topRejectionPatterns = Object.entries(rejectionReasonsCount)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)

    res.json({
      totalCandidates: candidates.length,
      merged,
      rejected,
      pending,
      topRejectionPatterns,
      falsePositiveRate: candidates.length > 0 ? (rejected / candidates.length) : 0,
    })
  } catch (err) {
    console.error('[admin/dedup-analytics GET] error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch dedup analytics' })
  }
})

// ── GET /api/admin/audit-export ──────────────────────────────────────────────
// Phase 6 (P1.11): CSV export of admin action log + audit events.
// ponytail: build CSV inline, no library needed.
router.get('/admin/audit-export', requireAdmin('ANALYST'), async (req, res) => {
  try {
    const [adminLogs, auditEvents] = await Promise.all([
      prisma.adminActionLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5000,
        include: { admin: { select: { name: true, role: true } } },
      }),
      prisma.auditEvent.findMany({
        orderBy: { timestamp: 'desc' },
        take: 5000,
      }),
    ])

    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`

    // Admin action logs
    const adminCsv = [
      'Timestamp,Admin,Role,Action,TargetType,TargetId,Details',
      ...adminLogs.map((l) =>
        [l.createdAt.toISOString(), escape(l.admin?.name), escape(l.admin?.role), escape(l.action), escape(l.targetType), escape(l.targetId), escape(l.details)].join(',')
      ),
    ].join('\n')

    // Audit events
    const auditCsv = [
      'Timestamp,UserId,Action,ActorRole,TargetType,TargetId,Details',
      ...auditEvents.map((e) =>
        [e.timestamp.toISOString(), escape(e.userId), escape(e.action), escape(e.actorRole), escape(e.targetType), escape(e.targetId), escape(e.details)].join(',')
      ),
    ].join('\n')

    const combined = `=== ADMIN ACTION LOG ===\n${adminCsv}\n\n=== AUDIT EVENTS ===\n${auditCsv}`

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="nexis-audit-${new Date().toISOString().slice(0, 10)}.csv"`)
    res.send(combined)
  } catch (err) {
    console.error('[admin/audit-export GET] error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to export audit log' })
  }
})

// ── POST /api/admin/dedup-feedback ───────────────────────────────────────────
// Phase 6 (P1.10): Dedup feedback loop — admins can flag false positives/negatives
// to tune future matching thresholds.
router.post('/admin/dedup-feedback', requireAdmin('REVIEWER'), async (req, res) => {
  try {
    const { candidateId, feedback, notes } = req.body
    if (!candidateId || !['FALSE_POSITIVE', 'CONFIRMED_CORRECT', 'NEEDS_REVIEW'].includes(feedback)) {
      return res.status(400).json({ error: 'candidateId and valid feedback (FALSE_POSITIVE|CONFIRMED_CORRECT|NEEDS_REVIEW) required' })
    }

    const candidate = await prisma.dedupCandidate.findUnique({ where: { id: candidateId } })
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' })

    // Store feedback as a detail on the admin action log
    await logAdminAction(req, {
      action: 'DEDUP_FEEDBACK',
      targetType: 'DedupCandidate',
      targetId: candidateId,
      details: JSON.stringify({ feedback, notes: notes || '', matchScore: candidate.matchScore }),
    })

    res.json({ ok: true, feedback })
  } catch (err) {
    console.error('[admin/dedup-feedback POST] error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to save feedback' })
  }
})

export default router
