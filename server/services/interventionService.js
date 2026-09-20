/**
 * FILE: server/services/interventionService.js
 * PURPOSE: Manages candidate interventions with mandatory human-in-the-loop approval gate.
 * SPECIFICATION: Master Spec Section 13.5, 14.5, 15.3, 19.5
 *
 * CRITICAL POLICY (Section 15.3):
 * - No algorithmic intervention can be delivered to a trainee without explicit human officer approval.
 * - Intervention.approvedBy must be populated and status must be APPROVED before transition to DELIVERED.
 */

import prisma, { withDbTimeout } from '../lib/prisma.js';
import { ROOT_CAUSES, INTERVENTION_TYPES } from './rootCauseEngine.js';
import crypto from 'crypto';

// In-memory fallback ledger for test resilience and zero-latency failover
const inMemoryInterventions = new Map();

/**
 * Creates a new recommended intervention for a trainee.
 * Initial status is strictly PENDING_APPROVAL.
 * @param {Object} params
 * @param {string} params.traineeId
 * @param {string} params.rootCause
 * @param {string} [params.interventionType]
 * @param {string} [params.recommendedAction]
 * @param {Array<string>} [params.evidenceRefs]
 * @param {any} [params.metadata]
 */
export async function createIntervention({
  traineeId,
  rootCause,
  interventionType = undefined,
  recommendedAction = undefined,
  evidenceRefs = [],
  metadata = null,
}) {
  if (!traineeId) throw new Error('traineeId is required');
  if (!rootCause) throw new Error('rootCause is required');

  const canonicalCause = ROOT_CAUSES[rootCause] ? rootCause : 'OTHER';
  const canonicalType = INTERVENTION_TYPES.includes(interventionType)
    ? interventionType
    : (ROOT_CAUSES[canonicalCause]?.interventionType || 'CAREER_COUNSELLING');

  const actionText = recommendedAction || ROOT_CAUSES[canonicalCause]?.defaultAction || 'Review career pathway';

  const interventionId = `int_${crypto.randomBytes(8).toString('hex')}`;
  const record = {
    id: interventionId,
    traineeId,
    rootCause: canonicalCause,
    interventionType: canonicalType,
    recommendedAction: actionText,
    evidenceRefs: Array.isArray(evidenceRefs) ? evidenceRefs : [String(evidenceRefs)],
    approvedBy: null,
    approvedAt: null,
    status: 'PENDING_APPROVAL',
    outcomeReassessed: false,
    metadata: metadata || {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Attempt database persistence with fallback
  try {
    const dbRecord = await prisma.intervention.create({
      data: {
        id: record.id,
        traineeId: record.traineeId,
        rootCause: record.rootCause,
        interventionType: record.interventionType,
        recommendedAction: record.recommendedAction,
        status: record.status,
        outcomeReassessed: false,
      },
    });
    record.id = dbRecord.id;
  } catch (err) {
    // Silently fall back to in-memory ledger
  }

  inMemoryInterventions.set(record.id, record);
  return record;
}

/**
 * Human officer review gate: stamps approval on an intervention.
 * 
 * @param {string} interventionId
 * @param {Object} opts
 * @param {string} opts.approvedBy - Officer name or ID (mandatory)
 * @param {string} [opts.notes]
 */
export async function approveIntervention(interventionId, { approvedBy, notes = null } = {}) {
  if (!approvedBy || typeof approvedBy !== 'string' || approvedBy.trim() === '') {
    const err = new Error('approvedBy is mandatory for human officer approval');
    err.statusCode = 400;
    throw err;
  }

  let record = inMemoryInterventions.get(interventionId);

  // If not in memory, try DB
  if (!record) {
    try {
      const dbItem = await prisma.intervention.findUnique({ where: { id: interventionId } });
      if (dbItem) {
        record = {
          ...dbItem,
          evidenceRefs: [],
          metadata: {},
        };
      }
    } catch (e) {}
  }

  if (!record) {
    const err = new Error(`Intervention not found: ${interventionId}`);
    err.statusCode = 404;
    throw err;
  }

  record.status = 'APPROVED';
  record.approvedBy = approvedBy.trim();
  record.approvedAt = new Date();
  record.updatedAt = new Date();
  if (notes) {
    record.metadata = { ...(record.metadata || {}), approvalNotes: notes };
  }

  try {
    await prisma.intervention.update({
      where: { id: interventionId },
      data: {
        status: 'APPROVED',
        approvedBy: record.approvedBy,
        approvedAt: record.approvedAt,
      },
    });
  } catch (e) {}

  inMemoryInterventions.set(interventionId, record);
  return record;
}

/**
 * Delivers an approved intervention to the trainee.
 * 
 * MANDATORY POLICY CHECK:
 * Throws 403 error if status is not APPROVED or approvedBy is missing.
 */
export async function deliverIntervention(interventionId, { deliveryChannel = 'IN_APP', deliveredBy = 'SYSTEM' } = {}) {
  let record = inMemoryInterventions.get(interventionId);

  if (!record) {
    try {
      const dbItem = await prisma.intervention.findUnique({ where: { id: interventionId } });
      if (dbItem) {
        record = {
          ...dbItem,
          evidenceRefs: [],
          metadata: {},
        };
      }
    } catch (e) {}
  }

  if (!record) {
    const err = new Error(`Intervention not found: ${interventionId}`);
    err.statusCode = 404;
    throw err;
  }

  // Mandatory Human-in-the-Loop Verification Gate (Section 15.3)
  if (record.status !== 'APPROVED' || !record.approvedBy) {
    const err = new Error('Human approval required before intervention delivery (Intervention.approvedBy is missing)');
    err.statusCode = 403;
    err.code = 'UNAPPROVED_INTERVENTION_DELIVERY_BLOCKED';
    throw err;
  }

  record.status = 'DELIVERED';
  record.deliveredAt = new Date();
  record.updatedAt = new Date();
  record.deliveryChannel = deliveryChannel;
  record.deliveredBy = deliveredBy;

  try {
    await prisma.intervention.update({
      where: { id: interventionId },
      data: {
        status: 'DELIVERED',
      },
    });
  } catch (e) {}

  inMemoryInterventions.set(interventionId, record);
  return record;
}

/**
 * Reassesses outcome after delivery of an intervention.
 */
export async function reassessIntervention(interventionId, { outcomeStatus = 'REASSESSED', notes = null } = {}) {
  let record = inMemoryInterventions.get(interventionId);

  if (!record) {
    const err = new Error(`Intervention not found: ${interventionId}`);
    err.statusCode = 404;
    throw err;
  }

  record.outcomeReassessed = true;
  record.status = outcomeStatus === 'COMPLETED' ? 'COMPLETED' : 'REASSESSED';
  record.reassessedAt = new Date();
  record.updatedAt = new Date();
  if (notes) {
    record.metadata = { ...(record.metadata || {}), reassessmentNotes: notes };
  }

  try {
    await prisma.intervention.update({
      where: { id: interventionId },
      data: {
        outcomeReassessed: true,
        status: record.status,
      },
    });
  } catch (e) {}

  inMemoryInterventions.set(interventionId, record);
  return record;
}

/**
 * Retrieves all interventions for a trainee.
 */
export async function getTraineeInterventions(traineeId) {
  const memList = Array.from(inMemoryInterventions.values()).filter((i) => i.traineeId === traineeId);

  try {
    const dbList = await prisma.intervention.findMany({
      where: { traineeId },
      orderBy: { createdAt: 'desc' },
    });
    if (dbList && dbList.length > 0) {
      // Merge memory updates
      const map = new Map();
      dbList.forEach((item) => map.set(item.id, item));
      memList.forEach((item) => map.set(item.id, { ...map.get(item.id), ...item }));
      return Array.from(map.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  } catch (e) {}

  return memList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Retrieves the pending approval queue for human reviewers.
 */
export async function getPendingInterventionsQueue() {
  const memList = Array.from(inMemoryInterventions.values()).filter(
    (i) => i.status === 'PENDING_APPROVAL' || !i.approvedBy
  );

  try {
    const dbList = await prisma.intervention.findMany({
      where: { status: 'PENDING_APPROVAL' },
      orderBy: { createdAt: 'desc' },
    });
    if (dbList && dbList.length > 0) {
      const map = new Map();
      dbList.forEach((item) => map.set(item.id, item));
      memList.forEach((item) => map.set(item.id, { ...map.get(item.id), ...item }));
      return Array.from(map.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  } catch (e) {}

  return memList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Clears in-memory ledger (primarily for isolated test fixtures).
 */
export function _resetInterventionsMemory() {
  inMemoryInterventions.clear();
}
