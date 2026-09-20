/**
 * FILE: server/routes/followups.js
 * PURPOSE: Multichannel follow-up scheduling, operator queue, dispatching, and escalation endpoints.
 * NAMESPACE: /api/followups/*
 * SPEC: Master Implementation Spec Section 14.3, Section 19.4, and Phase 5
 */

import { Router } from 'express';
import { requireFeatureFlag } from '../utils/featureFlags.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  scheduleFollowUps,
  getFollowUpQueue,
  dispatchFollowUp,
  recordResponse,
  escalateAttempt,
} from '../services/followupService.js';
import {
  CHECKPOINTS,
  CHANNELS,
  SUPPORTED_LANGUAGES,
  FOLLOWUP_TEMPLATES,
  renderTemplate,
} from '../services/followupTemplates.js';

const router = Router();

// Apply feature flag check for the entire followups namespace
router.use(requireFeatureFlag('FOLLOWUP_ORCHESTRATION'));

/**
 * GET /api/followups/ping — Health & contract verification probe
 */
router.get(['/ping', '/followups/ping'], (req, res) => {
  res.json({
    namespace: '/api/followups',
    status: 'ready',
    version: 'v2.0',
    checkpoints: CHECKPOINTS,
    channels: CHANNELS,
    supportedLanguages: SUPPORTED_LANGUAGES,
    escalationPolicy: 'Non-response is never treated as unemployment; 3 failed attempts escalate to UNREACHABLE',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/followups/templates — Catalog of multilingual templates and scripts
 */
router.get(['/templates', '/followups/templates'], (req, res) => {
  res.json({
    ok: true,
    checkpoints: CHECKPOINTS,
    languages: SUPPORTED_LANGUAGES,
    templates: FOLLOWUP_TEMPLATES,
  });
});

/**
 * POST /api/followups/schedule — Schedule 5 longitudinal follow-up checkpoints
 */
router.post(['/schedule', '/followups/schedule'], requireAuth, async (req, res) => {
  const {
    traineeId,
    completionDate,
    preferredLanguage,
    phone,
    district,
    traineeName,
  } = req.body ?? {};

  const resolvedTraineeId =
    (traineeId && traineeId !== 'undefined')
      ? traineeId
      : (req.user.trainee?.id || req.user.traineeId || `trainee_${req.user.id}`);

  try {
    const attempts = await scheduleFollowUps({
      traineeId: resolvedTraineeId,
      completionDate,
      preferredLanguage: preferredLanguage || req.user.trainee?.preferredLanguage || 'mr',
      phone: phone || req.user.phone,
      district: district || req.user.trainee?.district || 'Pune',
      traineeName: traineeName || req.user.candidateProfile?.name || req.user.trainee?.name || 'Trainee',
    });

    return res.status(201).json({
      ok: true,
      traineeId: resolvedTraineeId,
      scheduledCount: attempts.length,
      attempts,
      message: `Successfully scheduled ${attempts.length} longitudinal checkpoints (T_0, T_30, T_90, T_180, T_365).`,
    });
  } catch (err) {
    console.error('[followups/schedule POST] error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/followups/queue — Follow-up operator outreach queue with filters
 */
router.get(['/queue', '/followups/queue'], requireAuth, async (req, res) => {
  const { status, channel, checkpoint, district, limit, offset } = req.query;

  try {
    const queueData = await getFollowUpQueue({
      status: status ? String(status) : undefined,
      channel: channel ? String(channel) : undefined,
      checkpoint: checkpoint ? String(checkpoint) : undefined,
      district: district ? String(district) : undefined,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    return res.json({
      ok: true,
      ...queueData,
      mode: 'operational',
    });
  } catch (err) {
    console.error('[followups/queue GET] error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/followups/trainees/:id — Get all follow-ups for a specific trainee
 */
router.get(['/trainees/:id', '/followups/trainees/:id'], requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'Missing trainee id' });

  try {
    const queueData = await getFollowUpQueue({ limit: 500 });
    const traineeAttempts = queueData.queue.filter((a) => a.traineeId === id);

    return res.json({
      ok: true,
      traineeId: id,
      total: traineeAttempts.length,
      attempts: traineeAttempts,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/followups/:id/dispatch — Dispatches mock SMS / WhatsApp or starts Assisted Call
 */
router.post(['/:id/dispatch', '/followups/:id/dispatch'], requireAuth, async (req, res) => {
  const { id } = req.params;
  const { operator, variables } = req.body ?? {};

  try {
    const result = await dispatchFollowUp(id, {
      operator: operator || req.user.candidateProfile?.name || 'MSSDS Operator',
      variables,
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('[followups/:id/dispatch POST] error:', err);
    return res.status(err.message.includes('not found') ? 404 : 500).json({ error: err.message });
  }
});

/**
 * POST /api/followups/:id/respond — Logs trainee or operator response and links to OutcomeEvent
 */
router.post(['/:id/respond', '/followups/:id/respond'], requireAuth, async (req, res) => {
  const { id } = req.params;
  const {
    employmentStatus,
    employerName,
    wageBand,
    notes,
    operatorNotes,
  } = req.body ?? {};

  try {
    const result = await recordResponse(id, {
      employmentStatus,
      employerName,
      wageBand,
      notes,
      operatorNotes,
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('[followups/:id/respond POST] error:', err);
    return res.status(err.message.includes('not found') ? 404 : 500).json({ error: err.message });
  }
});

/**
 * POST /api/followups/:id/escalate — Escalates to next channel or marks UNREACHABLE
 */
router.post(['/:id/escalate', '/followups/:id/escalate'], requireAuth, async (req, res) => {
  const { id } = req.params;
  const { reason, operator } = req.body ?? {};

  try {
    const result = await escalateAttempt(id, {
      reason,
      operator: operator || req.user.candidateProfile?.name || 'MSSDS Reviewer',
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('[followups/:id/escalate POST] error:', err);
    return res.status(err.message.includes('not found') ? 404 : 500).json({ error: err.message });
  }
});

export default router;
