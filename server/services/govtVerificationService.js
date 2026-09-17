/**
 * FILE: server/services/govtVerificationService.js
 * PURPOSE: Provider-agnostic service for corroborating trainee outcomes against
 *          national government registries (e-Shram for informal workers, UDYAM for micro-enterprises).
 *
 * IMPORTANT ARCHITECTURAL & ETHICAL NOTE:
 * Registry cross-checks represent a supportive corroboration signal, NOT verified ground-truth.
 * e-Shram only records self-registered informal workers, and UDYAM only records registered MSMEs.
 * Neither guarantees active employer-employee placement or verified wage earnings.
 *
 * SWAPPABLE PROVIDER PATTERN:
 * In production, this service will connect to official MoLE (Ministry of Labour & Employment)
 * and Ministry of MSME API gateways once credentials and data-sharing agreements are established.
 * Currently, a deterministic mock provider is active to ensure demo repeatability without relying
 * on live government servers.
 */

// ── Offline Provider Implementation ──────────────────────────────────────────
// Clean, honest implementation that clearly reports the integration is offline/missing.
const offlineProvider = {
  name: 'offline-registry',

  async checkEShram(trainee) {
    return {
      matchFound: false,
      matchConfidence: null,
      summary: 'Government Registry Integration Offline / Credentials Missing. Cannot verify e-Shram status.',
    }
  },

  async checkUdyam(trainee) {
    return {
      matchFound: false,
      matchConfidence: null,
      summary: 'Government Registry Integration Offline / Credentials Missing. Cannot verify UDYAM status.',
    }
  },
}

// ── Active Provider ──────────────────────────────────────────────────────────
// Swappable provider instance. Swap to live production provider when official MoLE/MSME API keys are configured.
const activeProvider = offlineProvider

// ── Public Interface ─────────────────────────────────────────────────────────

/**
 * Checks a trainee against the e-Shram national database of unorganised workers.
 *
 * @param {object} trainee - Prisma Trainee record with optional enrolments
 * @returns {Promise<{ matchFound: boolean, matchConfidence: number|null, summary: string }>}
 */
export async function checkEShram(trainee) {
  return activeProvider.checkEShram(trainee)
}

/**
 * Checks a trainee against the UDYAM MSME business registration portal.
 *
 * @param {object} trainee - Prisma Trainee record
 * @returns {Promise<{ matchFound: boolean, matchConfidence: number|null, summary: string }>}
 */
export async function checkUdyam(trainee) {
  return activeProvider.checkUdyam(trainee)
}
