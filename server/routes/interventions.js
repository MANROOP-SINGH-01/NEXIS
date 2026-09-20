/**
 * FILE: server/routes/interventions.js
 * PURPOSE: Phase 10 Root-Cause & Intervention Engine Endpoints.
 * SPECIFICATION: Section 14.5, 15.3, 19.5 & 27 (Phase 10).
 * MOUNTED AT: /api/interventions
 */

import { Router } from 'express';
import {
  ROOT_CAUSES,
  INTERVENTION_TYPES,
  diagnoseRootCauses,
} from '../services/rootCauseEngine.js';
import {
  createIntervention,
  approveIntervention,
  deliverIntervention,
  reassessIntervention,
  getTraineeInterventions,
  getPendingInterventionsQueue,
} from '../services/interventionService.js';
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
 * GET /api/interventions/ping
 * Readiness probe exposing root-cause taxonomy and approval policy
 */
router.get('/ping', (req, res) => {
  res.json({
    status: 'ready',
    namespace: '/api/interventions',
    phase: 10,
    rootCausesCount: Object.keys(ROOT_CAUSES).length,
    interventionTypes: INTERVENTION_TYPES,
    humanApprovalGateRequired: true,
    policyContract: 'Section 15.3: Intervention.approvedBy mandatory before DELIVERED',
  });
});

/**
 * GET /api/interventions/taxonomy
 * Exposes full 10-cause root-cause and intervention taxonomy
 */
router.get('/taxonomy', (req, res) => {
  res.json({
    rootCauses: ROOT_CAUSES,
    interventionTypes: INTERVENTION_TYPES,
  });
});

/**
 * POST /api/interventions/diagnose
 * Evaluates candidate signals deterministically without mutating database
 */
router.post('/diagnose', async (req, res) => {
  const user = await resolveAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Session required for root-cause diagnosis' });
  }

  const signals = req.body.signals || req.body || {};
  const diagnoses = diagnoseRootCauses(signals);

  res.json({
    success: true,
    count: diagnoses.length,
    diagnoses,
  });
});

/**
 * POST /api/interventions/recommend
 * Diagnoses candidate signals and records recommended interventions in PENDING_APPROVAL status
 */
router.post('/recommend', async (req, res) => {
  const user = await resolveAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Session required to recommend interventions' });
  }

  const traineeId = req.body.traineeId || user.traineeProfile?.id || user.id;
  const signals = req.body.signals || {};
  const diagnoses = diagnoseRootCauses(signals);

  const createdInterventions = [];
  for (const diag of diagnoses) {
    const intervention = await createIntervention({
      traineeId,
      rootCause: diag.rootCause,
      interventionType: diag.recommendedIntervention.type,
      recommendedAction: diag.recommendedIntervention.action,
      evidenceRefs: diag.evidenceRefs,
      metadata: {
        priority: diag.priority,
        confidence: diag.confidence,
        targetAgent: diag.recommendedIntervention.targetAgent,
        title: diag.recommendedIntervention.title,
      },
    });
    createdInterventions.push(intervention);
  }

  res.status(201).json({
    success: true,
    count: createdInterventions.length,
    interventions: createdInterventions,
  });
});

/**
 * GET /api/interventions/queue
 * Human reviewer queue for pending interventions
 */
router.get('/queue', async (req, res) => {
  const user = await resolveAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Reviewer session required' });
  }

  const queue = await getPendingInterventionsQueue();
  res.json({
    success: true,
    count: queue.length,
    queue,
  });
});

/**
 * GET /api/interventions/trainee/:traineeId
 * Retrieves all interventions for a specific trainee
 */
router.get('/trainee/:traineeId', async (req, res) => {
  const user = await resolveAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { traineeId } = req.params;
  const interventions = await getTraineeInterventions(traineeId);
  res.json({
    success: true,
    traineeId,
    count: interventions.length,
    interventions,
  });
});

/**
 * POST /api/interventions/:id/approve
 * Human reviewer stamps approval on an intervention
 */
router.post('/:id/approve', async (req, res) => {
  const user = await resolveAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Reviewer session required' });
  }

  const { approvedBy, notes } = req.body;
  const approver = approvedBy || user.name || user.email || user.id;

  try {
    const approved = await approveIntervention(req.params.id, {
      approvedBy: approver,
      notes,
    });
    res.json({
      success: true,
      message: 'Intervention approved by human officer',
      intervention: approved,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      error: err.message,
      code: err.code || 'APPROVAL_FAILED',
    });
  }
});

/**
 * POST /api/interventions/:id/deliver
 * Delivers an approved intervention to the trainee
 * 
 * ENFORCES SECTION 15.3 HUMAN APPROVAL GATE:
 * Returns 403 Forbidden if unapproved or approvedBy is missing.
 */
router.post('/:id/deliver', async (req, res) => {
  const user = await resolveAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { deliveryChannel = 'IN_APP' } = req.body;

  try {
    const delivered = await deliverIntervention(req.params.id, {
      deliveryChannel,
      deliveredBy: user.email || user.name || 'OFFICER',
    });
    res.json({
      success: true,
      message: 'Intervention successfully delivered to trainee',
      intervention: delivered,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      error: err.message,
      code: err.code || 'DELIVERY_FAILED',
    });
  }
});

/**
 * POST /api/interventions/:id/reassess
 * Reassesses outcome after delivery
 */
router.post('/:id/reassess', async (req, res) => {
  const user = await resolveAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { outcomeStatus, notes } = req.body;

  try {
    const reassessed = await reassessIntervention(req.params.id, {
      outcomeStatus,
      notes,
    });
    res.json({
      success: true,
      message: 'Intervention outcome reassessed',
      intervention: reassessed,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      error: err.message,
      code: err.code || 'REASSESSMENT_FAILED',
    });
  }
});

export default router;
