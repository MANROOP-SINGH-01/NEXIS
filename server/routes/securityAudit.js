/**
 * FILE: server/routes/securityAudit.js
 * PURPOSE: Phase 19 — Security audit, observability, and fallback status endpoints (Sections 22.4, 23)
 * 
 * Endpoints:
 *  GET  /api/security/health         — Detailed service health (Section 23 fallback status)
 *  GET  /api/security/audit-summary  — Secrets audit + security posture (Section 22.4)
 *  POST /api/security/simulate-failure — Simulate a Section 23 failure mode (test-only)
 *
 * DEPENDENCIES: server/services/fallbackOrchestrator.js
 * USED BY: Admin dashboard, Phase 20 testing
 */

import { Router } from 'express'
import {
  getDetailedHealthStatus,
  auditSecrets,
  recordServiceFailure,
  recordServiceRecovery,
  handleAiProviderFailure,
  handleAdzunaRateLimit,
  handleSplinkServiceDown,
  handlePdfParsingFailure,
  handleDatabaseFailure,
  handleMalformedAiOutput,
  handleLowConfidenceResult,
  handleEmployerNonResponse,
  getOfflineRecoveryContract,
  resetAllServiceHealth,
  getServiceHealthReport
} from '../services/fallbackOrchestrator.js'

const router = Router()

/**
 * GET /api/security/health — Detailed system health with per-service fallback status
 * Section 23: Every service's current health, failure count, and active fallbacks
 */
router.get('/security/health', (req, res) => {
  try {
    const health = getDetailedHealthStatus()
    res.json(health)
  } catch (err) {
    console.error('[security/health] error:', err)
    res.status(500).json({ error: 'Health check failed', status: 'CRITICAL' })
  }
})

/**
 * GET /api/security/audit-summary — Security posture overview
 * Section 22.4: Secrets audit, TLS status, header enforcement
 */
router.get('/security/audit-summary', (req, res) => {
  try {
    const secretsAudit = auditSecrets()
    const serviceHealth = getServiceHealthReport()
    
    const tlsStatus = process.env.NODE_ENV === 'production'
      ? { enforced: true, method: 'TLS 1.2+ via reverse proxy (Vercel/Render)' }
      : { enforced: false, method: 'Development mode — TLS not required on localhost' }
    
    const encryptionAtRest = {
      database: 'Managed provider encryption (Supabase/PlanetScale — AES-256)',
      localDev: 'SQLite file-level (development only)'
    }
    
    const headerEnforcement = {
      xContentTypeOptions: 'nosniff',
      xFrameOptions: 'SAMEORIGIN',
      xXSSProtection: '1; mode=block',
      referrerPolicy: 'strict-origin-when-cross-origin',
      strictTransportSecurity: process.env.NODE_ENV === 'production' ? '31536000s' : 'disabled (dev)',
      permissionsPolicy: 'camera=(), microphone=(), geolocation=(), payment=()',
      cacheControl: 'no-store for API responses'
    }
    
    const rateLimiting = {
      otpEndpoint: { maxRequests: 5, windowMinutes: 15, keyBy: 'phoneNumber' },
      aiEndpoints: { maxRequests: 30, windowMinutes: 60, keyBy: 'userId or IP' },
      dataQualityScan: { maxRequests: 10, windowMinutes: 60, keyBy: 'IP' }
    }
    
    const auditLogCoverage = {
      authEvents: true,
      consentGrant: true,
      consentWithdrawal: true,
      adminActions: true,
      traineeProfileMutations: true,
      outcomeEventCreation: true,
      dedupMergeDecisions: true,
      dataQualityResolutions: true,
      employerVerificationLinks: true,
      careerEngineAnalysis: true,
    }
    
    res.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      secretsAudit,
      tlsStatus,
      encryptionAtRest,
      headerEnforcement,
      rateLimiting,
      auditLogCoverage,
      serviceHealth,
      piiProtection: {
        loggingSanitization: true,
        fieldLevelProtection: 'phoneNumber, aadhaar masked in logs',
        documentContentExclusion: 'Raw resume/document content truncated at 2000 chars in logs'
      }
    })
  } catch (err) {
    console.error('[security/audit-summary] error:', err)
    res.status(500).json({ error: 'Security audit failed' })
  }
})

/**
 * POST /api/security/simulate-failure — Test Section 23 fallback paths
 * Only available in non-production environments.
 * 
 * Body: { failureMode: 'F1'|'F2'|'F3'|'F4'|'F5'|'F6'|'F7'|'F8'|'F9', params?: {} }
 */
router.post('/security/simulate-failure', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Failure simulation is disabled in production.' })
  }
  
  const { failureMode, params = {} } = req.body
  
  if (!failureMode) {
    return res.status(400).json({ error: 'failureMode is required (F1-F9)' })
  }
  
  let result
  
  try {
    switch (failureMode.toUpperCase()) {
      case 'F1': // Gemini/Sarvam unavailable
        result = handleAiProviderFailure(
          params.provider || 'gemini',
          new Error('Simulated AI provider failure'),
          params.cachedResult || { text: 'Cached analysis result', isCached: true }
        )
        break
        
      case 'F2': // Adzuna rate limit
        result = handleAdzunaRateLimit(params.cachedListings || [
          { title: 'Cached: Data Entry Operator', company: 'TCS', location: 'Pune' }
        ])
        break
        
      case 'F3': // Splink service down
        result = handleSplinkServiceDown(params.candidateIds || ['TR-SIM-001', 'TR-SIM-002'])
        break
        
      case 'F4': // PDF parsing fails
        result = handlePdfParsingFailure(
          new Error('Simulated PDF parse failure'),
          params.documentId || 'DOC-SIM-001'
        )
        break
        
      case 'F5': // Database unavailable
        result = handleDatabaseFailure(
          new Error('Simulated DB connection error'),
          params.operationType || 'WRITE'
        )
        break
        
      case 'F6': // AI malformed output
        result = handleMalformedAiOutput(
          params.rawOutput || '{"invalid json',
          params.retryCount || 0
        )
        break
        
      case 'F7': // AI low confidence
        result = handleLowConfidenceResult(
          params.confidence ?? 35,
          params.threshold ?? 60
        )
        break
        
      case 'F8': // Employer never responds
        result = handleEmployerNonResponse(
          params.daysSinceRequest ?? 45,
          params.maxRetentionDays ?? 30
        )
        break
        
      case 'F9': // Network fails in the field
        result = getOfflineRecoveryContract()
        break
        
      case 'RESET':
        resetAllServiceHealth()
        result = { action: 'RESET', message: 'All service health states reset to HEALTHY' }
        break
        
      default:
        return res.status(400).json({
          error: `Unknown failureMode: ${failureMode}. Valid modes: F1-F9, RESET`
        })
    }
    
    res.json({
      simulated: true,
      failureMode,
      timestamp: new Date().toISOString(),
      result,
      currentHealth: getServiceHealthReport()
    })
  } catch (err) {
    console.error(`[security/simulate-failure] error for ${failureMode}:`, err)
    res.status(500).json({ error: err.message })
  }
})

export default router
