/**
 * FILE: server/routes/consent.js
 * PURPOSE: Consent recording (audit-trail style) and current-state retrieval endpoints.
 * AUTH: Dual-path — tries User bearer-token auth first (requireAuth), falls back to
 *       GitHub OAuth (resolveGithubIdentity) for backward compatibility.
 * DEPENDENCIES: server/lib/prisma, server/middleware/authMiddleware, server/utils/auth, server/utils/consent
 * USED BY: server/index.js
 */

import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { validateSession } from '../services/authService.js'
import { resolveGithubIdentity } from '../utils/auth.js'
import { ALLOWED_SCOPES, resolveCurrentConsent } from '../utils/consent.js'

const router = Router()

/**
 * Dual-path identity resolver:
 * 1. Try User session token (newer phone+password auth)
 * 2. Fall back to GitHub OAuth token (legacy path)
 * Returns { trainee, source } or throws an error.
 */
async function resolveCallerTrainee(req) {
  // ── Path 1: User session token ──
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''

  if (token) {
    const user = await validateSession(token)
    if (user) {
      // User is authenticated via the newer auth system.
      // Find or create a linked Trainee record.
      if (user.traineeId) {
        const trainee = await prisma.trainee.findUnique({ where: { id: user.traineeId } })
        if (trainee) return { trainee, source: 'user-session' }
      }

      // No linked Trainee yet — auto-create one and link it
      const trainee = await prisma.trainee.create({
        data: {
          name: user.candidateProfile?.name || 'User',
          phoneNumber: user.phone,
          user: { connect: { id: user.id } },
        },
      })
      return { trainee, source: 'user-session-created' }
    }
  }

  // ── Path 2: GitHub OAuth token (legacy) ──
  try {
    const caller = await resolveGithubIdentity(req)
    let trainee = await prisma.trainee.findUnique({
      where: { githubId: caller.githubId },
    })

    if (!trainee) {
      trainee = await prisma.trainee.create({
        data: {
          githubId: caller.githubId,
          name: caller.login || 'Trainee',
          phoneNumber: `temp_${caller.githubId}`,
        },
      })
    }
    return { trainee, source: 'github-oauth' }
  } catch {
    // Both paths failed
  }

  const err = new Error('Authentication required. Please log in.')
  err.statusCode = 401
  throw err
}

// ── POST /api/consent ─────────────────────────────────────────────────────────
// Records a new consent event (grant or revoke) for the calling user's Trainee record.
// Each call appends a new ConsentRecord row — existing rows are never mutated.
// Auth: User session token OR GitHub OAuth token
// Body: { scope: string, granted: boolean, version?: string }
router.post('/consent', async (req, res) => {
  // 1. Resolve caller identity (dual-path)
  let resolved
  try {
    resolved = await resolveCallerTrainee(req)
  } catch (authErr) {
    res.status(authErr.statusCode || 401).json({ error: authErr.message })
    return
  }

  const { trainee } = resolved

  // 2. Validate body fields
  const { scope, granted, version } = req.body ?? {}

  if (!scope || String(scope).trim() === '') {
    res.status(400).json({ error: 'Missing required field: scope' })
    return
  }
  if (!ALLOWED_SCOPES.includes(String(scope).trim())) {
    res.status(400).json({
      error: `Unknown consent scope: "${scope}". Allowed values: ${ALLOWED_SCOPES.join(', ')}`,
    })
    return
  }
  if (typeof granted !== 'boolean') {
    res.status(400).json({
      error: 'Field "granted" must be a boolean (true or false)',
    })
    return
  }

  const consentVersion = String(version || 'v1').trim() || 'v1'

  try {
    // 3. Append a new ConsentRecord (audit-trail style — never update existing rows)
    const consentRecord = await prisma.consentRecord.create({
      data: {
        traineeId: trainee.id,
        scope: String(scope).trim(),
        granted,
        grantedAt: new Date(),
        revokedAt: granted ? null : new Date(),
        version: consentVersion,
      },
    })

    // 4. Log immutable AuditEvent for DPDP compliance (Section 4.3 / 12.1)
    try {
      await prisma.auditEvent.create({
        data: {
          userId: trainee.userId || undefined,
          action: granted ? 'CONSENT_GRANTED' : 'CONSENT_REVOKED',
          actorRole: 'TRAINEE',
          targetType: 'CONSENT_SCOPE',
          targetId: String(scope).trim(),
          details: JSON.stringify({
            scope: String(scope).trim(),
            granted,
            version: consentVersion,
            traineeId: trainee.id,
            timestamp: new Date().toISOString(),
          }),
        },
      })
    } catch (auditErr) {
      console.warn('[consent POST] audit log warning:', auditErr.message)
    }

    res.status(201).json({ consentRecord })
  } catch (err) {
    console.error('[consent POST] error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to record consent' })
  }
})

// ── GET /api/consent/audit-trail ──────────────────────────────────────────────
// Returns the complete immutable audit trail of consent events and actions for the caller.
router.get('/consent/audit-trail', async (req, res) => {
  let resolved
  try {
    resolved = await resolveCallerTrainee(req)
  } catch (authErr) {
    res.status(authErr.statusCode || 401).json({ error: authErr.message })
    return
  }

  const { trainee } = resolved

  try {
    const records = await prisma.consentRecord.findMany({
      where: { traineeId: trainee.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const auditEvents = await prisma.auditEvent.findMany({
      where: {
        OR: [
          { targetType: 'CONSENT_SCOPE' },
          { userId: trainee.userId || undefined },
        ],
      },
      orderBy: { timestamp: 'desc' },
      take: 50,
    })

    res.json({
      traineeId: trainee.id,
      consentRecords: records,
      auditEvents,
    })
  } catch (err) {
    console.error('[consent/audit-trail GET] error:', err)
    res.status(500).json({ error: 'Failed to retrieve audit trail' })
  }
})

// ── GET /api/consent ──────────────────────────────────────────────────────────
// Returns the current consent state for the authenticated caller.
// Auth: User session token OR GitHub OAuth token
router.get('/consent', async (req, res) => {
  let resolved
  try {
    resolved = await resolveCallerTrainee(req)
  } catch (authErr) {
    res.status(authErr.statusCode || 401).json({ error: authErr.message })
    return
  }

  const { trainee } = resolved

  try {
    const consent = await resolveCurrentConsent(trainee.id, prisma)
    res.json({ traineeId: trainee.id, trainee, consent })
  } catch (err) {
    console.error('[consent GET] error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to retrieve consent state' })
  }
})

// ── GET /api/consent/:traineeId ───────────────────────────────────────────────
// Returns the current (most-recent per scope) consent state for a given trainee.
// This endpoint is intentionally unauthenticated — employer/government verification
// portals will call it with just the traineeId.
router.get('/consent/:traineeId', async (req, res) => {
  const { traineeId } = req.params

  if (!traineeId || traineeId.trim() === '') {
    res.status(400).json({ error: 'Missing traineeId parameter' })
    return
  }

  try {
    const trainee = await prisma.trainee.findUnique({
      where: { id: traineeId },
      select: { id: true, name: true, preferredLanguage: true },
    })

    if (!trainee) {
      res.status(404).json({ error: `No trainee found with id: ${traineeId}` })
      return
    }

    const consent = await resolveCurrentConsent(traineeId, prisma)
    res.json({ traineeId, trainee, consent })
  } catch (err) {
    console.error('[consent/:traineeId GET] error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to retrieve consent state' })
  }
})

export default router
