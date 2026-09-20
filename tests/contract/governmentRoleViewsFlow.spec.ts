import { test, expect } from '@playwright/test'

const API_BASE = 'http://localhost:8787'

async function getAuthToken(request: any, role: string = 'SUPER_ADMIN'): Promise<string> {
  const uniquePhone = `9199${Math.floor(10000000 + Math.random() * 90000000)}`
  const regRes = await request.post(`${API_BASE}/api/auth/register`, {
    data: {
      phone: uniquePhone,
      password: 'StrongPassword123!',
      name: `Role Test User (${role})`,
      role,
    },
  })
  if (regRes.ok()) {
    const regData = await regRes.json()
    return regData.token
  }
  const loginRes = await request.post(`${API_BASE}/api/auth/login`, {
    data: {
      phone: uniquePhone,
      password: 'StrongPassword123!',
    },
  })
  const loginData = await loginRes.json()
  return loginData.token
}

test.describe('Phase 14: Government Dashboard & Role Views Contract Flow', () => {
  let adminToken: string

  test.beforeAll(async ({ request }) => {
    adminToken = await getAuthToken(request, 'SUPER_ADMIN')
    expect(adminToken).toBeDefined()
  })

  test('1. GET /api/role-views/ping reports readiness probe and Section 20 policy contract', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/role-views/ping`)
    expect(res.status()).toBe(200)

    const body = await res.json()
    expect(body.status).toBe('ready')
    expect(body.namespace).toBe('/api/role-views')
    expect(body.phase).toBe(14)
    expect(body.rowLevelAccessEnforced).toBe(true)
    expect(body.policySimulatorEnabled).toBe(true)
    expect(body.disclaimerInvariant).toContain('Section 20')
  })

  test('2. GET /api/role-views/me returns caller persona and allowed district scope', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/role-views/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(res.status()).toBe(200)

    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.isStateWide).toBe(true)
    expect(body.allowedDistricts.length).toBe(36)
  })

  test('3. GET /api/role-views/district-officer returns demand-supply ratio, deficits, and local queue', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/role-views/district-officer?district=Pune`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(res.status()).toBe(200)

    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.scopedDistrict).toBe('Pune')
    expect(body.region).toBe('Western Maharashtra')
    expect(body.districtMetrics).toBeDefined()
    expect(body.districtMetrics.demandSupplyRatio).toBeGreaterThan(0)
    expect(body.districtMetrics.imbalanceStatus).toBeDefined()
    expect(Array.isArray(body.providersInDistrict)).toBe(true)
    expect(Array.isArray(body.interventionQueue)).toBe(true)
  })

  test('4. GET /api/role-views/state-policy returns 36-district portfolio, equity metrics and schemes', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/role-views/state-policy`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(res.status()).toBe(200)

    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.state).toBe('Maharashtra')
    expect(body.statePortfolioSummary.totalDistricts).toBe(36)
    expect(Array.isArray(body.statePortfolioSummary.schemesActive)).toBe(true)
    expect(body.equityIndicators.femaleParticipationRate.displayValue).toContain('(n=')
    expect(body.dataCompleteness.outcomeTrackingConsentRate).toBeDefined()
  })

  test('5. POST /api/role-views/policy-simulator executes scenario analysis and enforces assumption disclaimer', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/role-views/policy-simulator`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        budgetAdjustmentPercent: 25,
        targetDistricts: ['Gadchiroli', 'Nandurbar', 'Washim'],
        targetSectors: ['Solar PV', 'Agri-processing'],
        enforceRetentionMandate: true,
        reallocateSeatsToDeficitTrades: true,
      },
    })
    expect(res.status()).toBe(200)

    const body = await res.json()
    // Invariant checks
    expect(body.isSimulation).toBe(true)
    expect(body.disclaimer).toContain('Assumption-driven policy simulation')
    expect(body.disclaimer).toContain('not observed historical statistics')
    expect(body.projectedMetrics.additionalLivelihoodsCreated).toBeGreaterThan(0)
    expect(body.projectedMetrics.retentionRateDeltaPercentagePoints).toBeGreaterThan(0)
    expect(Array.isArray(body.simulationAssumptions)).toBe(true)
  })

  test('6. POST & GET /api/role-views/employer/demand-signals registers and retrieves employer demand', async ({ request }) => {
    const postRes = await request.post(`${API_BASE}/api/role-views/employer/demand-signals`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        employerName: 'Bajaj Auto Chakan',
        district: 'Pune',
        sector: 'Automotive Embedded Systems',
        requiredSkills: ['Embedded C', 'Battery Management System'],
        openingsCount: 25,
        minWageInr: 20000,
        maxWageInr: 28000,
        experienceRequired: 'ITI / Diploma freshers',
      },
    })
    expect(postRes.status()).toBe(201)
    const postBody = await postRes.json()
    expect(postBody.success).toBe(true)
    expect(postBody.demandSignal.id).toBeDefined()

    const getRes = await request.get(`${API_BASE}/api/role-views/employer/demand-signals?district=Pune`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(getRes.status()).toBe(200)
    const getBody = await getRes.json()
    expect(getBody.success).toBe(true)
    expect(getBody.demandSignals.some((s: any) => s.id === postBody.demandSignal.id)).toBe(true)
  })
})
