import { test, expect } from '@playwright/test'
import {
  resolveUserRoleScope,
  getDistrictOfficerView,
  getStatePolicyView,
  runPolicySimulator,
  registerEmployerDemandSignal,
  getEmployerDemandSignals,
  MAHARASHTRA_SKILLING_SCHEMES,
} from '../../server/services/roleViewsService.js'

test.describe('Phase 14: Government Dashboard & Role Views Unit Suite', () => {
  test('1. resolveUserRoleScope enforces server-side row-level access boundaries', () => {
    // 1. District Officer
    const doScope = resolveUserRoleScope({
      role: 'DISTRICT_OFFICER',
      district: 'Pune',
    })
    expect(doScope.isStateWide).toBe(false)
    expect(doScope.assignedDistrict).toBe('Pune')
    expect(doScope.allowedDistricts).toEqual(['Pune'])

    // 2. State Admin
    const adminScope = resolveUserRoleScope({
      role: 'STATE_ADMIN',
    })
    expect(adminScope.isStateWide).toBe(true)
    expect(adminScope.allowedDistricts.length).toBe(36)

    // 3. Training Provider
    const provScope = resolveUserRoleScope({
      role: 'PROVIDER',
      providerId: 'prov_aurangabad_msme_03',
      district: 'Chhatrapati Sambhajinagar',
    })
    expect(provScope.isStateWide).toBe(false)
    expect(provScope.providerId).toBe('prov_aurangabad_msme_03')

    // 4. Employer
    const empScope = resolveUserRoleScope({
      role: 'EMPLOYER',
      companyName: 'Bajaj Auto Ltd',
      district: 'Pune',
    })
    expect(empScope.isStateWide).toBe(false)
    expect(empScope.employerName).toBe('Bajaj Auto Ltd')
  })

  test('2. getDistrictOfficerView scopes data to caller district and provides trade-level deficits', async () => {
    const doUser = {
      role: 'DISTRICT_OFFICER',
      district: 'Gadchiroli',
    }

    const view = await getDistrictOfficerView({ user: doUser })
    expect(view.scopedDistrict).toBe('Gadchiroli')
    expect(view.region).toBe('Vidarbha')
    expect(view.isRowLevelRestricted).toBe(true)
    expect(view.districtMetrics.imbalanceStatus).toBe('HIGH_DEFICIT')
    expect(view.districtMetrics.topDeficitTrades.length).toBeGreaterThan(0)
    expect(view.districtMetrics.placementRate.displayValue).toBeDefined()
    expect(view.districtMetrics.retention90d.displayValue).toBeDefined()
  })

  test('3. getStatePolicyView synthesizes 36-district portfolio, equity metrics, and schemes', async () => {
    const adminUser = { role: 'STATE_ADMIN' }
    const stateView = await getStatePolicyView({ user: adminUser })

    expect(stateView.state).toBe('Maharashtra')
    expect(stateView.statePortfolioSummary.totalDistricts).toBe(36)
    expect(stateView.statePortfolioSummary.schemesActive.length).toBe(MAHARASHTRA_SKILLING_SCHEMES.length)
    expect(stateView.statePortfolioSummary.acuteDeficitDistricts.length).toBeGreaterThan(0)

    // Verify equity indicators have explicit denominators
    expect(stateView.equityIndicators.femaleParticipationRate.displayValue).toContain('(n=')
    expect(stateView.equityIndicators.ruralSharePercentage.displayValue).toContain('(n=')
    expect(stateView.dataCompleteness.outcomeTrackingConsentRate).toBeDefined()
  })

  test('4. Policy Simulator strictly enforces Section 20 assumption disclaimer and simulation invariant', () => {
    const simResult = runPolicySimulator({
      budgetAdjustmentPercent: 20,
      targetDistricts: ['Gadchiroli', 'Nandurbar', 'Washim'],
      targetSectors: ['Solar PV', 'CNC Machining'],
      enforceRetentionMandate: true,
      reallocateSeatsToDeficitTrades: true,
    })

    // INVARIANT: Section 20 & Phase 14 mandatory disclaimer
    expect(simResult.isSimulation).toBe(true)
    expect(simResult.disclaimer).toContain('Assumption-driven policy simulation')
    expect(simResult.disclaimer).toContain('not observed historical statistics')

    // Verification of mathematical projections
    expect(simResult.projectedMetrics.additionalLivelihoodsCreated).toBeGreaterThan(0)
    expect(simResult.projectedMetrics.simulatedPlacedCount).toBeGreaterThan(simResult.baselineMetrics.placedCount)
    expect(simResult.projectedMetrics.retentionRateDeltaPercentagePoints).toBeGreaterThan(0)
    expect(simResult.simulationAssumptions.length).toBeGreaterThanOrEqual(3)
  })

  test('5. registerEmployerDemandSignal validates parameters and stores searchable signals', () => {
    const signal = registerEmployerDemandSignal({
      employerName: 'Mahindra Logistics',
      district: 'Nashik',
      sector: 'Agri-Cold-Chain Operator',
      requiredSkills: ['Cold Chain Logistics', 'Temperature Monitoring'],
      openingsCount: 15,
      minWageInr: 16000,
      maxWageInr: 22000,
    })

    expect(signal.id).toBeDefined()
    expect(signal.employerName).toBe('Mahindra Logistics')
    expect(signal.district).toBe('Nashik')
    expect(signal.openingsCount).toBe(15)

    const nashikSignals = getEmployerDemandSignals('Nashik')
    expect(nashikSignals.some((s) => s.id === signal.id)).toBe(true)

    const puneSignals = getEmployerDemandSignals('Pune')
    expect(puneSignals.every((s) => s.district === 'Pune')).toBe(true)
  })
})
