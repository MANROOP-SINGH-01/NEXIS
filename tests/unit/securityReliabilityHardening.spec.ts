/**
 * Phase 19 Unit Test Suite: Security, Reliability & Observability Hardening
 * Specification: Sections 22.4, 23, 27 Phase 19
 * 
 * Tests every failure mode in Section 23's fallback table as an actual code path.
 */

import { test, expect } from '@playwright/test'
import {
  recordServiceFailure,
  recordServiceRecovery,
  getServiceHealthReport,
  handleAiProviderFailure,
  handleAdzunaRateLimit,
  handleSplinkServiceDown,
  drainSplinkQueue,
  handlePdfParsingFailure,
  handleDatabaseFailure,
  handleMalformedAiOutput,
  handleLowConfidenceResult,
  handleEmployerNonResponse,
  getOfflineRecoveryContract,
  auditSecrets,
  getDetailedHealthStatus,
  resetAllServiceHealth
} from '../../server/services/fallbackOrchestrator.js'
import {
  maskPhone,
  maskAadhaar,
  maskEmail,
  sanitizeForLog,
  sanitizeObjectForLog
} from '../../server/middleware/piiSanitizer.js'

test.describe('Phase 19: Security, Reliability & Observability Hardening', () => {

  test.beforeEach(() => {
    resetAllServiceHealth()
  })

  // ─── Section 23: Failure/Fallback Architecture ─────────────────────────────

  test.describe('1. Section 23 Failure/Fallback Table Coverage', () => {

    test('F1: Gemini unavailable — switches to Sarvam provider', () => {
      const result = handleAiProviderFailure('gemini', new Error('503 Service Unavailable'))
      
      expect(result.fallbackUsed).toBe(true)
      expect(result.provider).toBe('sarvam')
      expect(result.userMessage).toContain('sarvam')
    })

    test('F1: Both AI providers down — serves cached output with warning', () => {
      // Exhaust both providers
      for (let i = 0; i < 3; i++) {
        recordServiceFailure('gemini', new Error('down'))
        recordServiceFailure('sarvam', new Error('down'))
      }
      
      const cached = { text: 'Cached analysis', isCached: true }
      const result = handleAiProviderFailure('gemini', new Error('down'), cached)
      
      expect(result.fallbackUsed).toBe(true)
      expect(result.provider).toBeNull()
      expect(result.result).toEqual(cached)
      expect(result.userMessage).toContain('cached')
    })

    test('F1: Both down, no cache — honest degradation message', () => {
      for (let i = 0; i < 3; i++) {
        recordServiceFailure('gemini', new Error('down'))
        recordServiceFailure('sarvam', new Error('down'))
      }
      
      const result = handleAiProviderFailure('gemini', new Error('down'), null)
      expect(result.fallbackUsed).toBe(false)
      expect(result.result).toBeNull()
      expect(result.userMessage).toContain('temporarily unavailable')
    })

    test('F2: Adzuna 429 — serves cached listings, never generic search', () => {
      const cached = [
        { title: 'Data Entry Operator', company: 'TCS', location: 'Pune' },
        { title: 'Help Desk Assistant', company: 'Infosys', location: 'Nashik' }
      ]
      
      const result = handleAdzunaRateLimit(cached)
      
      expect(result.fallbackUsed).toBe(true)
      expect(result.isStale).toBe(true)
      expect(result.listings).toHaveLength(2)
      expect(result.listings[0].title).toBe('Data Entry Operator')
      expect(result.userMessage).toContain('cached')
    })

    test('F3: Splink down — queues candidates, does NOT block trainee writes', () => {
      const result = handleSplinkServiceDown(['TR-001', 'TR-002', 'TR-003'])
      
      expect(result.traineeWriteBlocked).toBe(false)
      expect(result.queuedForLater).toBe(true)
      expect(result.queuedCount).toBe(3)
      expect(result.userMessage).toBeNull() // invisible to trainee
      expect(result.operatorMessage).toContain('queued')
    })

    test('F3: Splink recovery — drains queued candidates', () => {
      handleSplinkServiceDown(['TR-001', 'TR-002'])
      handleSplinkServiceDown(['TR-003'])
      
      const drained = drainSplinkQueue()
      expect(drained.processedCount).toBe(3)
      expect(drained.candidateIds).toContain('TR-001')
      expect(drained.candidateIds).toContain('TR-003')
      
      // Verify service is healthy again
      const health = getServiceHealthReport()
      expect(health.splink.status).toBe('HEALTHY')
    })

    test('F4: PDF parsing fails — prompts text paste, logs for reprocessing', () => {
      const result = handlePdfParsingFailure(
        new Error('Encrypted PDF cannot be read'),
        'DOC-1234'
      )
      
      expect(result.parseFailed).toBe(true)
      expect(result.alternatePathAvailable).toBe(true)
      expect(result.userMessage).toContain('paste')
      expect(result.documentId).toBe('DOC-1234')
      expect(result.loggedForReprocessing).toBe(true)
    })

    test('F5: Database write unavailable — fails loudly with retry guidance', () => {
      const result = handleDatabaseFailure(new Error('ECONNREFUSED'), 'WRITE')
      
      expect(result.canProceed).toBe(false)
      expect(result.userMessage).toContain("Can't save right now")
      expect(result.retryable).toBe(true)
    })

    test('F5: Database read degraded — serves cached views', () => {
      const result = handleDatabaseFailure(new Error('Connection timeout'), 'READ')
      
      expect(result.canProceed).toBe(true)
      expect(result.degraded).toBe(true)
      expect(result.userMessage).toContain('cached data')
    })

    test('F6: AI malformed output (first attempt) — retries with stricter prompt', () => {
      const result = handleMalformedAiOutput('{"broken json', 0)
      
      expect(result.action).toBe('RETRY_STRICT')
      expect(result.retryCount).toBe(1)
    })

    test('F6: AI malformed output (second attempt) — falls back to deterministic', () => {
      const result = handleMalformedAiOutput('still broken', 1)
      
      expect(result.action).toBe('USE_DETERMINISTIC')
      expect(result.logMessage).toContain('deterministic-only')
    })

    test('F7: AI low confidence — routes to human review, marked PENDING', () => {
      const result = handleLowConfidenceResult(35, 60)
      
      expect(result.action).toBe('QUEUE_FOR_REVIEW')
      expect(result.requiresReview).toBe(true)
      expect(result.status).toBe('PENDING')
      expect(result.confidence).toBe(35)
    })

    test('F7: AI sufficient confidence — publishes normally', () => {
      const result = handleLowConfidenceResult(85, 60)
      
      expect(result.action).toBe('PUBLISH')
      expect(result.requiresReview).toBe(false)
    })

    test('F8: Employer never responds — evidence stays self-report, NEVER silently confirmed', () => {
      const result = handleEmployerNonResponse(45, 30)
      
      expect(result.evidenceLevel).toBe('SELF_REPORT')
      expect(result.isConfirmed).toBe(false)
      expect(result.confidenceImpact).toBe('REDUCED')
      expect(result.shouldResendRequest).toBe(true)
    })

    test('F9: Network fails in field — provides offline recovery contract', () => {
      const contract = getOfflineRecoveryContract()
      
      expect(contract.offlineStrategy).toBe('QUEUE_LOCAL')
      expect(contract.storageMethod).toBe('IndexedDB')
      expect(contract.syncOnReconnect).toBe(true)
      expect(contract.offlineIndicator).toBe(true)
      expect(contract.syncEndpoint).toBeDefined()
    })
  })

  // ─── Section 22.4: Security Controls ───────────────────────────────────────

  test.describe('2. Security Controls Verification', () => {

    test('service health tracking — records failures with exponential backoff', () => {
      const r1 = recordServiceFailure('gemini', new Error('fail 1'))
      expect(r1.action).toBe('RETRY_WITH_BACKOFF')
      expect(r1.waitMs).toBe(1000)
      
      const r2 = recordServiceFailure('gemini', new Error('fail 2'))
      expect(r2.waitMs).toBe(2000) // exponential
      
      const r3 = recordServiceFailure('gemini', new Error('fail 3'))
      expect(r3.action).toBe('USE_FALLBACK') // 3rd failure → unavailable
      
      const health = getServiceHealthReport()
      expect(health.gemini.status).toBe('UNAVAILABLE')
      expect(health.gemini.failureCount).toBe(3)
    })

    test('service recovery — resets failure count and status', () => {
      recordServiceFailure('adzuna', new Error('429'))
      recordServiceFailure('adzuna', new Error('429'))
      
      recordServiceRecovery('adzuna')
      
      const health = getServiceHealthReport()
      expect(health.adzuna.status).toBe('HEALTHY')
      expect(health.adzuna.failureCount).toBe(0)
    })

    test('secrets audit — detects missing, suspicious, and configured keys', () => {
      const findings = auditSecrets({})
      
      expect(findings.length).toBeGreaterThanOrEqual(1)
      
      // At minimum, the hardcoded check should pass
      const hardcodedCheck = findings.find(f => f.key === 'HARDCODED_SECRETS_CHECK')
      expect(hardcodedCheck).toBeDefined()
      expect(hardcodedCheck.status).toBe('PASS')
    })

    test('detailed health status — aggregates all service states', () => {
      const status = getDetailedHealthStatus()
      
      expect(status.status).toBe('HEALTHY')
      expect(status.timestamp).toBeDefined()
      expect(status.uptime).toBeGreaterThanOrEqual(0)
      expect(status.memoryUsage.rss).toBeGreaterThan(0)
      expect(status.totalServices).toBeGreaterThanOrEqual(5)
    })
  })

  // ─── PII Sanitization ─────────────────────────────────────────────────────

  test.describe('3. PII Sanitization for Logging (Section 22.4)', () => {

    test('masks Indian mobile phone numbers', () => {
      expect(maskPhone('+919876543210')).toBe('●●●●●●●●●3210')
      expect(maskPhone('9876543210')).toBe('●●●●●●3210')
    })

    test('masks Aadhaar numbers to last 4 digits', () => {
      expect(maskAadhaar('1234 5678 9012')).toBe('●●●●●●●●9012')
      expect(maskAadhaar('123456789012')).toBe('●●●●●●●●9012')
    })

    test('masks email addresses preserving domain', () => {
      const masked = maskEmail('priya.patel@gmail.com')
      expect(masked).toMatch(/^p●+@gmail\.com$/)
    })

    test('sanitizeForLog masks all PII patterns in text', () => {
      const input = 'Trainee Priya (phone: 9876543210, email: priya@gov.in) submitted form'
      const sanitized = sanitizeForLog(input)
      
      expect(sanitized).not.toContain('9876543210')
      expect(sanitized).not.toContain('priya@gov.in')
      expect(sanitized).toContain('submitted form') // non-PII preserved
    })

    test('sanitizeForLog truncates long content', () => {
      const longContent = 'A'.repeat(3000)
      const sanitized = sanitizeForLog(longContent)
      
      expect(sanitized.length).toBeLessThan(3000)
      expect(sanitized).toContain('TRUNCATED')
    })

    test('sanitizeObjectForLog redacts sensitive field names', () => {
      const obj = {
        name: 'Test User',
        phoneNumber: '9876543210',
        email: 'test@example.com',
        password: 'secret123',
        apiKey: 'AIzaSy...',
        district: 'Pune'
      }
      
      const sanitized = sanitizeObjectForLog(obj)
      
      expect(sanitized.name).toBe('Test User')
      expect(sanitized.password).toBe('[REDACTED]')
      expect(sanitized.apiKey).toBe('[REDACTED]')
      expect(sanitized.phoneNumber).not.toBe('9876543210')
      expect(sanitized.district).toBe('Pune')
    })
  })
})
