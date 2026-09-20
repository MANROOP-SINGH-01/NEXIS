/**
 * Phase 19 Contract Test Suite: Security Audit & Fallback Simulation API
 * Specification: Sections 22.4, 23, 27 Phase 19
 */

import { test, expect } from '@playwright/test'

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:8787'

test.describe('Phase 19: Security, Reliability & Observability API Tests', () => {

  test('1. GET /api/security/health returns detailed service health report', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/security/health`)
    expect(res.ok()).toBe(true)
    const data = await res.json()

    expect(data.status).toBeDefined()
    expect(data.timestamp).toBeDefined()
    expect(data.services).toBeDefined()
    expect(typeof data.uptime).toBe('number')
    expect(data.memoryUsage).toBeDefined()
    expect(data.totalServices).toBeGreaterThanOrEqual(5)
  })

  test('2. GET /api/security/audit-summary returns security posture with secrets audit', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/security/audit-summary`)
    expect(res.ok()).toBe(true)
    const data = await res.json()

    expect(data.secretsAudit).toBeDefined()
    expect(Array.isArray(data.secretsAudit)).toBe(true)
    expect(data.tlsStatus).toBeDefined()
    expect(data.headerEnforcement).toBeDefined()
    expect(data.rateLimiting).toBeDefined()
    expect(data.auditLogCoverage).toBeDefined()
    expect(data.piiProtection).toBeDefined()
    
    // Verify no actual secret values are exposed
    for (const finding of data.secretsAudit) {
      expect(finding).not.toHaveProperty('value')
      expect(finding.key).toBeDefined()
      expect(finding.status).toBeDefined()
    }
  })

  test('3. POST /api/security/simulate-failure (F1) triggers AI provider fallback', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/security/simulate-failure`, {
      data: { failureMode: 'F1', params: { provider: 'gemini' } }
    })
    expect(res.ok()).toBe(true)
    const data = await res.json()

    expect(data.simulated).toBe(true)
    expect(data.failureMode).toBe('F1')
    expect(data.result.fallbackUsed).toBe(true)
    expect(data.currentHealth).toBeDefined()
  })

  test('4. POST /api/security/simulate-failure (F3) queues dedup without blocking writes', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/security/simulate-failure`, {
      data: { failureMode: 'F3', params: { candidateIds: ['TR-TEST-1', 'TR-TEST-2'] } }
    })
    expect(res.ok()).toBe(true)
    const data = await res.json()

    expect(data.result.traineeWriteBlocked).toBe(false)
    expect(data.result.queuedForLater).toBe(true)
    expect(data.result.queuedCount).toBeGreaterThanOrEqual(2)
  })

  test('5. POST /api/security/simulate-failure (F5) database write fails loudly', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/security/simulate-failure`, {
      data: { failureMode: 'F5', params: { operationType: 'WRITE' } }
    })
    expect(res.ok()).toBe(true)
    const data = await res.json()

    expect(data.result.canProceed).toBe(false)
    expect(data.result.userMessage).toContain("Can't save")
    expect(data.result.retryable).toBe(true)
  })

  test('6. POST /api/security/simulate-failure (F8) employer non-response — never silently confirmed', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/security/simulate-failure`, {
      data: { failureMode: 'F8', params: { daysSinceRequest: 45 } }
    })
    expect(res.ok()).toBe(true)
    const data = await res.json()

    expect(data.result.isConfirmed).toBe(false)
    expect(data.result.evidenceLevel).toBe('SELF_REPORT')
  })

  test('7. POST /api/security/simulate-failure (RESET) restores all services to HEALTHY', async ({ request }) => {
    // First trigger a failure
    await request.post(`${BACKEND_URL}/api/security/simulate-failure`, {
      data: { failureMode: 'F1' }
    })
    
    // Then reset
    const res = await request.post(`${BACKEND_URL}/api/security/simulate-failure`, {
      data: { failureMode: 'RESET' }
    })
    expect(res.ok()).toBe(true)
    const data = await res.json()

    // Verify all services are healthy after reset
    for (const [, state] of Object.entries(data.currentHealth)) {
      expect((state as any).status).toBe('HEALTHY')
    }
  })

  test('8. Security headers are present on API responses', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/health`)
    
    const headers = res.headers()
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['x-frame-options']).toBe('SAMEORIGIN')
    expect(headers['x-xss-protection']).toBe('1; mode=block')
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
  })

  test('9. API responses include rate limit headers', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/health`)
    
    const headers = res.headers()
    // Public API rate limiter should set these headers
    expect(headers['x-ratelimit-limit']).toBeDefined()
    expect(headers['x-ratelimit-remaining']).toBeDefined()
  })
})
