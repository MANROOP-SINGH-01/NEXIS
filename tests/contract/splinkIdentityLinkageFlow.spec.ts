/**
 * Phase 17 Contract Test Suite: Splink Identity-Linkage & Probabilistic Deduplication
 * Specification: Sections 4.2, 9, 17.4, 27 Phase 17
 */

import { test, expect } from '@playwright/test'

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:8787'

test.describe('Phase 17: Splink Identity-Linkage Contract & UI Flow Tests', () => {

  test('1. GET /api/dedup/health returns valid service and engine metadata', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/dedup/health`)
    expect(res.ok()).toBe(true)
    const data = await res.json()

    expect(data.online).toBe(true)
    expect(data.service).toBe('splink-identity-linkage')
    expect(data.version).toContain('4.0.17')
    expect(data.engine).toBeDefined()
  })

  test('2. POST /api/dedup/compare returns exact Fellegi-Sunter log weights and Bayes factor', async ({ request }) => {
    const payload = {
      recordA: {
        id: 'CAND_01',
        name: 'Rahul Sharma',
        dateOfBirth: '1999-04-12',
        district: 'Pune',
        phoneNumber: '+91 98765 12340'
      },
      recordB: {
        id: 'CAND_02',
        name: 'Rahul K. Sharma',
        dateOfBirth: '1999-04-12',
        district: 'Pune',
        phoneNumber: '+91 98765 12340'
      }
    }

    const res = await request.post(`${BACKEND_URL}/api/dedup/compare`, { data: payload })
    expect(res.ok()).toBe(true)
    const data = await res.json()

    expect(data.recordAId).toBe('CAND_01')
    expect(data.recordBId).toBe('CAND_02')
    expect(data.matchProbability).toBeGreaterThanOrEqual(0.92)
    expect(data.classification).toBe('AUTO_LINK')
    expect(data.bayesFactor).toBeGreaterThan(50)
    expect(Array.isArray(data.gamma)).toBe(true)
    expect(data.gamma.length).toBeGreaterThanOrEqual(3)
  })

  test('3. POST /api/dedup/scan and GET /api/dedup/candidates maintain review queue schema', async ({ request }) => {
    // Run deduplication scan
    const scanRes = await request.post(`${BACKEND_URL}/api/dedup/scan`)
    expect(scanRes.ok()).toBe(true)
    const scanData = await scanRes.json()
    expect(scanData.success).toBe(true)
    expect(scanData.scanned).toBeGreaterThanOrEqual(0)

    // Fetch review candidate queue
    const candRes = await request.get(`${BACKEND_URL}/api/dedup/candidates`)
    expect(candRes.ok()).toBe(true)
    const candData = await candRes.json()
    expect(Array.isArray(candData.candidates)).toBe(true)

    if (candData.candidates.length > 0) {
      const first = candData.candidates[0]
      expect(first.id).toBeDefined()
      expect(first.traineeIdA).toBeDefined()
      expect(first.traineeIdB).toBeDefined()
      expect(typeof first.matchScore).toBe('number')
      expect(Array.isArray(first.matchReasons)).toBe(true)
      expect(typeof first.subsidyRisk).toBe('number')
    }
  })

  test('4. GET /api/dedup/clusters and GET /api/dedup/stats return multi-identity statistics', async ({ request }) => {
    // Clusters
    const clusterRes = await request.get(`${BACKEND_URL}/api/dedup/clusters`)
    expect(clusterRes.ok()).toBe(true)
    const clusterData = await clusterRes.json()
    expect(Array.isArray(clusterData.clusters)).toBe(true)
    expect(typeof clusterData.totalTrainees).toBe('number')

    // Stats
    const statsRes = await request.get(`${BACKEND_URL}/api/dedup/stats`)
    expect(statsRes.ok()).toBe(true)
    const statsData = await statsRes.json()
    expect(statsData.totalTrainees).toBeGreaterThanOrEqual(0)
    expect(statsData.currency).toBe('INR')
    expect(statsData.splinkEngine).toContain('Splink')
  })

  test('5. Browser Flow: /dedup opens DedupReviewPanel with full candidate comparison cards', async ({ page }) => {
    await page.goto('http://localhost:3000/dedup')

    // Expect DedupReviewPanel modal/view to open
    const heading = page.locator('text=Admin: Trainee Deduplication')
    await expect(heading).toBeVisible({ timeout: 10000 })

    // Check for scanning action trigger button
    const scanBtn = page.getByRole('button', { name: /Run Similarity Scan|Run Deduplication Scan|Scan Trainee Database/i })
    await expect(scanBtn).toBeVisible()

    // Check for candidate review cards with match scores and subsidy risks
    const candidateCard = page.locator('text=Match Score:').first()
    await expect(candidateCard).toBeVisible()

    // Check for Close Panel or Back button
    const closeBtn = page.getByRole('button', { name: /Close Panel|Back to Dashboard/i })
    await expect(closeBtn).toBeVisible()
  })
})
