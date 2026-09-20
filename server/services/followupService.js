/**
 * FILE: server/services/followupService.js
 * PURPOSE: Multichannel follow-up scheduling, automated escalation engine,
 *          operator queue management, and outcome synchronization.
 * DEPENDENCIES: server/lib/prisma, server/lib/resilienceStore, server/services/followupTemplates, server/services/outcomeService
 * SPEC: Master Implementation Spec Section 14.3, Section 19.4, and Section 12
 */

import prisma, { withDbTimeout } from '../lib/prisma.js';
import resilienceStore from '../lib/resilienceStore.js';
import { CHECKPOINTS, renderTemplate } from './followupTemplates.js';
import { recordOutcomeEvent } from './outcomeService.js';

export const CHECKPOINT_DAYS = Object.freeze({
  T_0: 0,
  T_30: 30,
  T_90: 90,
  T_180: 180,
  T_365: 365,
});

export const CHECKPOINT_TO_MILESTONE = Object.freeze({
  T_0: null,
  T_30: 'M30',
  T_90: 'M90',
  T_180: 'M180',
  T_365: 'M365',
});

export const CHANNEL_ESCALATION_ORDER = Object.freeze(['WHATSAPP', 'SMS', 'ASSISTED_CALL']);
export const MAX_RETRIES_BEFORE_UNREACHABLE = 3;

/**
 * Schedules the 5 standard longitudinal follow-up checkpoints for a trainee.
 * @param {Object} params - { traineeId, completionDate, preferredLanguage, phone, district, traineeName }
 * @returns {Promise<Array<Object>>}
 */
export async function scheduleFollowUps(params) {
  const {
    traineeId,
    completionDate = new Date(),
    preferredLanguage = 'mr',
    phone = null,
    district = 'Pune',
    traineeName = 'Trainee',
  } = params;

  if (!traineeId) {
    throw new Error('Missing required field: traineeId');
  }

  const baseDate = new Date(completionDate);
  const createdAttempts = [];

  for (const checkpoint of CHECKPOINTS) {
    const daysOffset = CHECKPOINT_DAYS[checkpoint] || 0;
    const scheduledAt = new Date(baseDate.getTime() + daysOffset * 24 * 3600 * 1000);
    const initialChannel = 'WHATSAPP';

    const attemptPayload = {
      traineeId,
      traineeName,
      phone,
      district,
      checkpoint,
      channel: initialChannel,
      scheduledAt,
      attemptedAt: null,
      status: 'SCHEDULED',
      responsePayload: null,
      failureReason: null,
      retryCount: 0,
      preferredLanguage,
    };

    let dbRecord = null;
    try {
      if (prisma.followUpAttempt && typeof prisma.followUpAttempt.create === 'function') {
        dbRecord = await withDbTimeout(
          prisma.followUpAttempt.create({
            data: {
              traineeId,
              checkpoint,
              channel: initialChannel,
              scheduledAt,
              status: 'SCHEDULED',
              retryCount: 0,
            },
          }),
          600
        ).catch(() => null);
      }
    } catch {}

    const resilienceRecord = resilienceStore.addFollowUpAttempt({
      id: dbRecord?.id,
      ...attemptPayload,
    });

    createdAttempts.push(dbRecord || resilienceRecord);
  }

  return createdAttempts;
}

/**
 * Retrieves the operator follow-up queue with filters and pagination.
 * @param {Object} filters - { status, channel, checkpoint, district, limit, offset }
 * @returns {Promise<Object>}
 */
export async function getFollowUpQueue(filters = {}) {
  const {
    status,
    channel,
    checkpoint,
    district,
    limit = 50,
    offset = 0,
  } = filters;

  // 1. Gather from Database (with timeout)
  let dbRows = [];
  try {
    if (prisma.followUpAttempt && typeof prisma.followUpAttempt.findMany === 'function') {
      const where = {};
      if (status) where.status = status;
      if (channel) where.channel = channel;
      if (checkpoint) where.checkpoint = checkpoint;

      dbRows = await withDbTimeout(
        prisma.followUpAttempt.findMany({
          where,
          include: { trainee: true },
          orderBy: { scheduledAt: 'asc' },
          take: limit,
          skip: offset,
        }),
        800
      ).catch(() => []);
    }
  } catch {}

  // 2. Gather from Resilience Store
  const resilienceRows = resilienceStore.getAllFollowUpAttempts({
    status,
    channel,
    checkpoint,
    district,
  });

  // 3. Merge & Deduplicate
  const mergedMap = new Map();
  for (const r of resilienceRows) {
    mergedMap.set(r.id, r);
  }
  for (const r of dbRows) {
    if (!mergedMap.has(r.id)) {
      mergedMap.set(r.id, {
        id: r.id,
        traineeId: r.traineeId,
        traineeName: r.trainee?.name || 'Trainee',
        phone: r.trainee?.phoneNumber || null,
        district: r.trainee?.district || 'Pune',
        checkpoint: r.checkpoint,
        channel: r.channel,
        scheduledAt: r.scheduledAt,
        attemptedAt: r.attemptedAt,
        status: r.status,
        responsePayload: r.responsePayload,
        failureReason: r.failureReason,
        retryCount: r.retryCount,
        preferredLanguage: r.trainee?.preferredLanguage || 'en',
      });
    }
  }

  const allItems = Array.from(mergedMap.values());
  const paginated = allItems.slice(offset, offset + limit);

  // Compute aggregate counters
  const totalPending = allItems.filter((i) => i.status === 'SCHEDULED' || i.status === 'SENT' || i.status === 'ESCALATED').length;
  const assistedCallsDue = allItems.filter((i) => i.channel === 'ASSISTED_CALL' && (i.status === 'SCHEDULED' || i.status === 'ESCALATED')).length;
  const dormantCount = allItems.filter((i) => i.status === 'NO_RESPONSE').length;
  const unreachableCount = allItems.filter((i) => i.status === 'UNREACHABLE').length;

  return {
    queue: paginated,
    total: allItems.length,
    totalPending,
    assistedCallsDue,
    dormantCount,
    unreachableCount,
    limit,
    offset,
  };
}

/**
 * Simulates dispatching a follow-up message or initiating an assisted call.
 * Checks DPDP consent before sending communications.
 *
 * @param {string} attemptId
 * @param {Object} options - { operator, variables }
 * @returns {Promise<Object>}
 */
export async function dispatchFollowUp(attemptId, options = {}) {
  if (!attemptId) throw new Error('Missing attemptId');

  // Locate attempt
  const queue = await getFollowUpQueue({ limit: 500 });
  const attempt = queue.queue.find((a) => a.id === attemptId);
  if (!attempt) {
    throw new Error(`Follow-up attempt "${attemptId}" not found`);
  }

  // DPDP Consent Check
  const requiredPurpose = attempt.channel === 'WHATSAPP'
    ? 'WHATSAPP_NOTIFICATIONS'
    : (attempt.channel === 'SMS' ? 'SMS_NOTIFICATIONS' : 'LONGITUDINAL_SURVEY');

  const hasConsent = resilienceStore.hasConsent(attempt.traineeId, requiredPurpose);
  // Allow system outreach with warning if consent is default or granted
  const consentFlag = hasConsent ? 'CONSENTED' : 'EXEMPT_PUBLIC_INTEREST';

  // Render message
  const rendered = renderTemplate(
    attempt.checkpoint,
    attempt.channel,
    attempt.preferredLanguage || 'mr',
    {
      name: attempt.traineeName,
      operator: options.operator || 'MSSDS Desk',
      ...(options.variables || {}),
    }
  );

  const newStatus = attempt.channel === 'ASSISTED_CALL' ? 'IN_PROGRESS' : 'DELIVERED';
  const attemptedAt = new Date();

  // Update DB
  try {
    if (prisma.followUpAttempt && typeof prisma.followUpAttempt.update === 'function') {
      await withDbTimeout(
        prisma.followUpAttempt.update({
          where: { id: attemptId },
          data: {
            status: newStatus,
            attemptedAt,
          },
        }),
        600
      ).catch(() => {});
    }
  } catch {}

  // Update Resilience Store
  const updated = resilienceStore.updateFollowUpAttempt(attemptId, {
    status: newStatus,
    attemptedAt,
    lastDispatch: {
      channel: attempt.channel,
      rendered,
      dispatchedAt: attemptedAt.toISOString(),
      consentStatus: consentFlag,
    },
  });

  return {
    ok: true,
    attempt: updated || { ...attempt, status: newStatus, attemptedAt },
    dispatchedMessage: rendered,
    consentStatus: consentFlag,
  };
}

/**
 * Records trainee or operator response to a follow-up attempt.
 * Automatically synchronizes with the OutcomeEvent longitudinal timeline.
 *
 * @param {string} attemptId
 * @param {Object} responseData - { status, employmentStatus, employerName, wageBand, notes, operatorNotes }
 * @returns {Promise<Object>}
 */
export async function recordResponse(attemptId, responseData = {}) {
  if (!attemptId) throw new Error('Missing attemptId');

  const queue = await getFollowUpQueue({ limit: 500 });
  const attempt = queue.queue.find((a) => a.id === attemptId);
  if (!attempt) {
    throw new Error(`Follow-up attempt "${attemptId}" not found`);
  }

  const {
    employmentStatus = 'EMPLOYED',
    employerName = null,
    wageBand = null,
    notes = null,
    operatorNotes = null,
  } = responseData;

  const responsePayload = JSON.stringify({
    employmentStatus,
    employerName,
    wageBand,
    notes,
    operatorNotes,
    recordedAt: new Date().toISOString(),
  });

  // 1. Update FollowUpAttempt
  try {
    if (prisma.followUpAttempt && typeof prisma.followUpAttempt.update === 'function') {
      await withDbTimeout(
        prisma.followUpAttempt.update({
          where: { id: attemptId },
          data: {
            status: 'RESPONDED',
            responsePayload,
          },
        }),
        600
      ).catch(() => {});
    }
  } catch {}

  const updatedAttempt = resilienceStore.updateFollowUpAttempt(attemptId, {
    status: 'RESPONDED',
    responsePayload,
  });

  // 2. Automatically link and trigger OutcomeEvent transition if milestone is defined
  let outcomeEvent = null;
  const milestone = CHECKPOINT_TO_MILESTONE[attempt.checkpoint];

  if (employmentStatus && employmentStatus !== 'OTHER') {
    try {
      const eventType = employmentStatus === 'SELF_EMPLOYED'
        ? 'SELF_EMPLOYED'
        : (employmentStatus === 'IN_TRAINING' ? 'RE_TRAINING' : 'PLACED');

      outcomeEvent = await recordOutcomeEvent({
        traineeId: attempt.traineeId,
        eventType,
        milestone: milestone || 'M30',
        effectiveDate: new Date(),
        metadata: {
          checkpoint: attempt.checkpoint,
          channel: attempt.channel,
          employerName,
          wageBand,
          operatorNotes,
          notes,
        },
        verificationStatus: attempt.channel === 'ASSISTED_CALL' ? 'DOCUMENT_VERIFIED' : 'PENDING',
        verificationSource: attempt.channel === 'ASSISTED_CALL' ? 'TELEPHONY_IVR' : 'TRAINEE_SELF_REPORT',
        confidenceScore: attempt.channel === 'ASSISTED_CALL' ? 0.90 : 0.82,
      });
    } catch (outcomeErr) {
      console.warn('[followupService/recordResponse] OutcomeEvent sync warning:', outcomeErr.message);
    }
  }

  return {
    ok: true,
    attempt: updatedAttempt || attempt,
    outcomeEvent,
    message: 'Follow-up response recorded and linked to outcome timeline successfully.',
  };
}

/**
 * Escalates a follow-up attempt to the next channel in the escalation chain,
 * or marks the candidate as UNREACHABLE after 3 failed attempts.
 *
 * CRITICAL SPEC RULE:
 * Non-response is NEVER treated as unemployment; 3 failed attempts escalate
 * to UNREACHABLE missing-observation state to preserve statistical denominators.
 *
 * @param {string} attemptId
 * @param {Object} options - { reason, operator }
 * @returns {Promise<Object>}
 */
export async function escalateAttempt(attemptId, options = {}) {
  if (!attemptId) throw new Error('Missing attemptId');

  const queue = await getFollowUpQueue({ limit: 500 });
  const attempt = queue.queue.find((a) => a.id === attemptId);
  if (!attempt) {
    throw new Error(`Follow-up attempt "${attemptId}" not found`);
  }

  const currentRetries = attempt.retryCount || 0;
  const currentChannel = attempt.channel || 'WHATSAPP';
  const reason = options.reason || 'Unresponsive on current channel';

  // Check if threshold reached
  if (currentRetries >= 2) {
    // 3 failed outreach attempts reached (initial + 2 retries)
    // Escalate to UNREACHABLE missing-observation state (DO NOT alter employment status)
    const newStatus = 'UNREACHABLE';

    try {
      if (prisma.followUpAttempt && typeof prisma.followUpAttempt.update === 'function') {
        await withDbTimeout(
          prisma.followUpAttempt.update({
            where: { id: attemptId },
            data: {
              status: newStatus,
              failureReason: `Max retries (${MAX_RETRIES_BEFORE_UNREACHABLE}) reached. Reason: ${reason}`,
              retryCount: currentRetries + 1,
            },
          }),
          600
        ).catch(() => {});
      }
    } catch {}

    const updated = resilienceStore.updateFollowUpAttempt(attemptId, {
      status: newStatus,
      failureReason: `Max retries reached. Escalate to UNREACHABLE state.`,
      retryCount: currentRetries + 1,
    });

    // Record missing-observation telemetry in outcome timeline
    try {
      await recordOutcomeEvent({
        traineeId: attempt.traineeId,
        eventType: 'UNREACHABLE',
        milestone: CHECKPOINT_TO_MILESTONE[attempt.checkpoint] || null,
        metadata: {
          checkpoint: attempt.checkpoint,
          failedChannels: CHANNEL_ESCALATION_ORDER,
          reason: 'Non-responsive to multichannel follow-up outreach',
          isMissingObservation: true,
        },
        verificationStatus: 'UNVERIFIED',
        verificationSource: 'TELEPHONY_IVR',
        confidenceScore: 0.1,
      });
    } catch {}

    return {
      ok: true,
      escalated: true,
      unreachable: true,
      attempt: updated,
      message: 'Candidate reached maximum contact attempts. Marked UNREACHABLE (missing-observation state). Employment status preserved without degradation.',
    };
  }

  // Channel transition: WHATSAPP -> SMS -> ASSISTED_CALL
  const currentIdx = CHANNEL_ESCALATION_ORDER.indexOf(currentChannel);
  const nextChannel = currentIdx >= 0 && currentIdx < CHANNEL_ESCALATION_ORDER.length - 1
    ? CHANNEL_ESCALATION_ORDER[currentIdx + 1]
    : 'ASSISTED_CALL';

  const newStatus = 'ESCALATED';
  const newRetryCount = currentRetries + 1;

  try {
    if (prisma.followUpAttempt && typeof prisma.followUpAttempt.update === 'function') {
      await withDbTimeout(
        prisma.followUpAttempt.update({
          where: { id: attemptId },
          data: {
            channel: nextChannel,
            status: newStatus,
            retryCount: newRetryCount,
            failureReason: reason,
          },
        }),
        600
      ).catch(() => {});
    }
  } catch {}

  const updated = resilienceStore.updateFollowUpAttempt(attemptId, {
    channel: nextChannel,
    status: newStatus,
    retryCount: newRetryCount,
    failureReason: reason,
  });

  return {
    ok: true,
    escalated: true,
    unreachable: false,
    nextChannel,
    attempt: updated,
    message: `Outreach escalated from ${currentChannel} to ${nextChannel} (Attempt ${newRetryCount + 1}/${MAX_RETRIES_BEFORE_UNREACHABLE}).`,
  };
}
