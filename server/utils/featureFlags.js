/**
 * FILE: server/utils/featureFlags.js
 * PURPOSE: Lightweight runtime feature flagging for staged rollout and zero-risk rollback
 *          of SIH26135 outcome-intelligence modules and government dashboards.
 * DEPENDENCIES: process.env
 * USED BY: server/index.js, route handlers, and GET /api/feature-flags
 */

export const FEATURE_FLAGS = Object.freeze({
  // Phase 1-5: Longitudinal Core
  OUTCOME_INTELLIGENCE_LAYER: process.env.FF_OUTCOME_INTELLIGENCE !== 'false',
  DPDP_PHASE2_CONSENT: process.env.FF_DPDP_CONSENT !== 'false',
  FOLLOWUP_ORCHESTRATION: process.env.FF_FOLLOWUP !== 'false',

  // Phase 6-8: Intelligence & Evidence
  EXPLAINABLE_SKILL_INTELLIGENCE: process.env.FF_SKILL_INTEL !== 'false',
  ADZUNA_STRUCTURED_JOBS: process.env.FF_ADZUNA_JOBS !== 'false',
  EVIDENCE_LEDGER: process.env.FF_EVIDENCE_LEDGER !== 'false',

  // Phase 11-16: Dashboards & Agents
  GOVERNMENT_SCOPED_DASHBOARDS: process.env.FF_GOVT_DASHBOARDS !== 'false',
  OUTCOME_SPECIALIST_AGENTS: process.env.FF_SPECIALIST_AGENTS !== 'false',
  THREE_D_OFFICE_INTEGRATION: process.env.FF_3D_INTEGRATION !== 'false',

  // Phase 17-18: Advanced Verification
  SPLINK_IDENTITY_LINKAGE: process.env.FF_SPLINK !== 'false',
  DATA_QUALITY_ANOMALY_DETECTION: process.env.FF_DATA_QUALITY !== 'false',

  // Phase 19: Security & Observability
  SECURITY_HARDENING: process.env.FF_SECURITY_HARDENING !== 'false',
})

/**
 * Checks whether a named feature flag is enabled.
 * @param {keyof typeof FEATURE_FLAGS} flagKey 
 * @returns {boolean}
 */
export function isFeatureEnabled(flagKey) {
  return Boolean(FEATURE_FLAGS[flagKey] ?? false)
}

/**
 * Express middleware to gate a route behind a feature flag.
 * If disabled, returns 404 cleanly as specified by Master Spec Phase 1.
 */
export function requireFeatureFlag(flagKey) {
  return (req, res, next) => {
    if (!isFeatureEnabled(flagKey)) {
      return res.status(404).json({
        error: `Feature "${flagKey}" is currently disabled by configuration.`,
        code: 'FEATURE_DISABLED',
      })
    }
    next()
  }
}
