/**
 * Phase 18 Contract Test Suite: Data Quality & Anomaly Detection Flow
 * Specification: Sections 14.6, 20, 27 Phase 18
 */

import { test, expect } from '@playwright/test'

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:8787'

test.describe('Phase 18: Data Quality & Anomaly Detection Flow Tests', () => {

  test('1. GET /api/data-quality/issues returns registered anomalies with filters', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/data-quality/issues`)
    expect(res.ok()).toBe(true)
    const data = await res.json()

    expect(Array.isArray(data.issues)).toBe(true)
    expect(data.total).toBeGreaterThanOrEqual(1)

    const first = data.issues[0]
    expect(first.id).toBeDefined()
    expect(first.ruleId).toBeDefined()
    expect(first.category).toBeDefined()
    expect(first.severity).toBeDefined()
    expect(first.status).toBeDefined()
  })

  test('2. GET /api/data-quality/summary returns reliability metrics and category counts', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/data-quality/summary`)
    expect(res.ok()).toBe(true)
    const data = await res.json()

    expect(typeof data.totalTracked).toBe('number')
    expect(typeof data.dataReliabilityScore).toBe('number')
    expect(data.byCategory).toBeDefined()
    expect(typeof data.criticalCount).toBe('number')
  })

  test('3. POST /api/data-quality/evaluate-record intercepts chronological violations in real-time', async ({ request }) => {
    const invalidPayload = {
      traineeId: 'TR_TEST_RT_01',
      certificationDate: '2024-05-01',
      employmentStartDate: '2024-02-01' // 3 months prior to certification
    }

    const res = await request.post(`${BACKEND_URL}/api/data-quality/evaluate-record`, {
      data: invalidPayload
    })
    expect(res.ok()).toBe(true)
    const data = await res.json()

    expect(data.traineeId).toBe('TR_TEST_RT_01')
    expect(data.isClean).toBe(false)
    expect(data.violationsCount).toBeGreaterThanOrEqual(1)
    expect(data.violations[0].rule).toBe('CHRONOLOGY_EMPLOYMENT_BEFORE_CERTIFICATION')
  })

  test('4. POST /api/data-quality/issues/:id/resolve records operator audit trail', async ({ request }) => {
    const resolvePayload = {
      action: 'ACKNOWLEDGE',
      reviewerName: 'State Audit Officer',
      notes: 'Reviewed provider attendance log. Reached out to Nashik field coordinator.'
    }

    const res = await request.post(`${BACKEND_URL}/api/data-quality/issues/DQI-MH-2026-03/resolve`, {
      data: resolvePayload
    })
    expect(res.ok()).toBe(true)
    const data = await res.json()

    expect(data.success).toBe(true)
    expect(data.issue.status).toBe('ACKNOWLEDGED')
    expect(data.issue.resolvedBy).toBe('State Audit Officer')
  })

  test('5. Browser Flow: /data-quality opens Data Quality Console with anomaly cards and action controls', async ({ page }) => {
    await page.goto('http://localhost:3000/data-quality')

    // Verify header title
    const heading = page.locator('text=Data Quality & Anomaly Detection Console')
    await expect(heading).toBeVisible({ timeout: 10000 })

    // Verify Section 25.3 Synthetic Demo Data Disclaimer
    const disclaimer = page.locator('text=[SYNTHETIC DEMO DATASET]:')
    await expect(disclaimer).toBeVisible()

    // Verify Scan button
    const scanBtn = page.getByRole('button', { name: /Run Anomaly Scan|Scanning Registry/i })
    await expect(scanBtn).toBeVisible()

    // Verify Anomaly cards
    const anomalyCard = page.locator('text=CHRONOLOGY_EMPLOYMENT_BEFORE_CERTIFICATION').first()
    await expect(anomalyCard).toBeVisible()

    // Verify Back to Dashboard button
    const backBtn = page.getByRole('button', { name: 'Back to Dashboard' })
    await expect(backBtn).toBeVisible()
  })
})
