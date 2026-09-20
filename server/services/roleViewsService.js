/**
 * FILE: server/services/roleViewsService.js
 * PURPOSE: Government Dashboard & Role Views engine for District Officers, State Policy Planners,
 *          Training Providers, and Employers.
 * SPECIFICATION: Master Spec Section 7, Section 14.6, Section 20, Section 21.2 & Section 27 (Phase 14).
 * INVARIANTS:
 *   1. Row-level access control enforced server-side per Section 22.4.
 *   2. Policy Simulator outputs explicitly marked with isSimulation: true and assumption-driven disclaimers.
 *   3. Denominator transparency and 95% confidence intervals on all cohort views.
 */

import {
  MAHARASHTRA_DISTRICTS,
  computeDistrictAnalytics,
  computeProviderAnalytics,
  formatDenominatorMetric,
} from './analyticsService.js'

// In-memory store for employer demand signals and candidate skill requests
const employerDemandSignals = [
  {
    id: 'ds_pune_01',
    employerName: 'Tata Motors PVBU',
    district: 'Pune',
    sector: 'Automotive Embedded Systems',
    requiredSkills: ['Embedded C', 'CAN Protocol', 'ECU Diagnostics'],
    openingsCount: 45,
    minWageInr: 22000,
    maxWageInr: 32000,
    experienceRequired: '0-2 years (Apprenticeship eligible)',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'ds_chhatrapati_02',
    employerName: 'Endurance Technologies Ltd',
    district: 'Chhatrapati Sambhajinagar',
    sector: 'CNC Machining & Tool Design',
    requiredSkills: ['CNC Machining', 'G-Code Programming', 'Quality Inspection'],
    openingsCount: 30,
    minWageInr: 18000,
    maxWageInr: 25000,
    experienceRequired: 'ITI / Diploma freshers',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'ds_gadchiroli_03',
    employerName: 'Vidarbha Bamboo Agrotech',
    district: 'Gadchiroli',
    sector: 'Agri-processing & Bio-Products',
    requiredSkills: ['Agri-Cold-Chain Operator', 'Food Processing'],
    openingsCount: 20,
    minWageInr: 12000,
    maxWageInr: 16000,
    experienceRequired: 'Vocational certified',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
]

/**
 * Standard Skilling Schemes portfolio in Maharashtra
 */
export const MAHARASHTRA_SKILLING_SCHEMES = [
  {
    code: 'PMKVY_4_0',
    name: 'Pradhan Mantri Kaushal Vikas Yojana 4.0',
    governingBody: 'MSDE / NSDC',
    stateSharePercentage: 40,
    enrolledCount: 6850,
    certifiedCount: 6240,
    placedCount: 4942,
    verifiedRetention90d: 79.2,
    prioritySectors: ['IT & Software', 'Automotive', 'Healthcare'],
  },
  {
    code: 'MSSDS_CANDIDATE',
    name: 'Pramod Mahajan Kaushalya Vikas Abhiyan (MSSDS)',
    governingBody: 'Maharashtra State Skill Development Society',
    stateSharePercentage: 100,
    enrolledCount: 5200,
    certifiedCount: 4680,
    placedCount: 3620,
    verifiedRetention90d: 76.4,
    prioritySectors: ['Agri-Business', 'Apparel & Textiles', 'Logistics'],
  },
  {
    code: 'NAPS_2_0',
    name: 'National Apprenticeship Promotion Scheme 2.0',
    governingBody: 'MSDE / Directorate of Vocational Education & Training (DVET)',
    stateSharePercentage: 50,
    enrolledCount: 3400,
    certifiedCount: 3100,
    placedCount: 2680,
    verifiedRetention90d: 84.8,
    prioritySectors: ['Industrial Automation', 'CNC Machining', 'Electronics'],
  },
  {
    code: 'MAHASWAYAM_DIRECT',
    name: 'Mahaswayam Integrated Livelihoods Mission',
    governingBody: 'Dept of Skills, Employment & Innovation (GoM)',
    stateSharePercentage: 100,
    enrolledCount: 2800,
    certifiedCount: 2450,
    placedCount: 1890,
    verifiedRetention90d: 74.5,
    prioritySectors: ['Rural Entrepreneurship', 'Solar PV', 'Handicrafts'],
  },
]

/**
 * Apply server-side row-level scoping for role-specific access
 */
export function resolveUserRoleScope(user) {
  if (!user) {
    return { role: 'ANONYMOUS', allowedDistricts: [], allowedProviders: [], isStateWide: false }
  }

  const role = String(user.role || 'CANDIDATE').toUpperCase()

  // State level administration and policy analysts have statewide access
  if (['SUPER_ADMIN', 'ADMIN', 'STATE_ADMIN', 'ANALYST'].includes(role)) {
    return {
      role,
      isStateWide: true,
      allowedDistricts: MAHARASHTRA_DISTRICTS.map((d) => d.districtName || d.name),
      allowedProviders: ['*'],
    }
  }

  // District Officers are row-level scoped to their assigned district(s)
  if (role === 'DISTRICT_OFFICER') {
    const assignedDistrict = user.district || user.assignedDistrict || 'Pune'
    return {
      role,
      isStateWide: false,
      assignedDistrict,
      allowedDistricts: [assignedDistrict],
      allowedProviders: ['*'],
    }
  }

  // Training Providers are scoped to their own institution
  if (role === 'PROVIDER' || role === 'TRAINING_PROVIDER') {
    const providerId = user.providerId || 'prov_pune_it_01'
    return {
      role: 'PROVIDER',
      isStateWide: false,
      providerId,
      allowedDistricts: [user.district || 'Pune'],
      allowedProviders: [providerId],
    }
  }

  // Employers are scoped to their employer profile
  if (role === 'EMPLOYER') {
    const employerName = user.companyName || user.employerName || 'Tata Motors PVBU'
    return {
      role: 'EMPLOYER',
      isStateWide: false,
      employerName,
      allowedDistricts: [user.district || 'Pune'],
      allowedProviders: [],
    }
  }

  // Candidate
  return {
    role: 'CANDIDATE',
    isStateWide: false,
    traineeId: user.trainee?.id || user.id,
    allowedDistricts: [user.district || 'Pune'],
    allowedProviders: [],
  }
}

/**
 * Build District Officer Scoped View (Master Spec Section 7 & 21.2)
 * @param {Object} options
 * @param {Object} options.user
 * @param {string} [options.requestedDistrict]
 */
export async function getDistrictOfficerView({ user, requestedDistrict = null } = {}) {
  const scope = resolveUserRoleScope(user)
  const districtName = scope.isStateWide
    ? (requestedDistrict || 'Pune')
    : (scope.assignedDistrict || 'Pune')

  // Verify district is in Maharashtra
  const districtMeta = MAHARASHTRA_DISTRICTS.find(
    (d) => (d.districtName || d.name).toLowerCase() === districtName.toLowerCase()
  ) || MAHARASHTRA_DISTRICTS[0]
  const resolvedDistrictName = districtMeta.districtName || districtMeta.name

  const districtAnalytics = await computeDistrictAnalytics({ region: districtMeta.region })
  const districtData = districtAnalytics.districts.find(
    (d) => (d.districtName || d.name).toLowerCase() === resolvedDistrictName.toLowerCase()
  ) || districtAnalytics.districts[0]

  const providerAnalytics = await computeProviderAnalytics({ district: resolvedDistrictName })

  // Remedial intervention queue for the district
  const interventionQueue = [
    {
      id: `int_q_${resolvedDistrictName.toLowerCase().replace(/\s+/g, '_')}_01`,
      traineeName: 'Rahul Jadhav',
      trade: 'CNC Machine Operator',
      rootCause: 'SKILL_MISMATCH',
      recommendedAction: 'Targeted G-Code 40-hour remedial lab',
      requiresApproval: true,
      status: 'PENDING',
    },
    {
      id: `int_q_${resolvedDistrictName.toLowerCase().replace(/\s+/g, '_')}_02`,
      traineeName: 'Pooja Shinde',
      trade: 'Solar Technician',
      rootCause: 'SALARY_MISMATCH',
      recommendedAction: 'Career counselling & PM Surya Ghar enterprise link',
      requiresApproval: true,
      status: 'PENDING',
    },
  ]

  return {
    success: true,
    userRole: scope.role,
    scopedDistrict: resolvedDistrictName,
    region: districtMeta.region,
    isRowLevelRestricted: !scope.isStateWide,
    districtMetrics: {
      candidatesTotal: districtData.candidateCount,
      certifiedCount: districtData.certifiedCount,
      placedCount: districtData.placedCount,
      activeVacancies: districtData.activeVacancies,
      demandSupplyRatio: districtData.demandSupplyRatio,
      imbalanceStatus: districtData.imbalanceStatus,
      placementRate: districtData.placementRate,
      retention90d: districtData.retention90d,
      topDeficitTrades: districtData.topDeficitTrades,
      topHighDemandTrades: districtData.topHighDemandTrades,
    },
    providersInDistrict: providerAnalytics.providers,
    interventionQueue,
    employerDemandSignals: employerDemandSignals.filter(
      (s) => s.district.toLowerCase() === resolvedDistrictName.toLowerCase()
    ),
  }
}

/**
 * Build Statewide Policy & Administrator View (Master Spec Section 20 & 21.2)
 */
export async function getStatePolicyView({ user }) {
  const scope = resolveUserRoleScope(user)
  const districtAnalytics = await computeDistrictAnalytics()
  const providerAnalytics = await computeProviderAnalytics()

  const totalCertified = districtAnalytics.districts.reduce((acc, d) => acc + d.certifiedCount, 0)
  const totalPlaced = districtAnalytics.districts.reduce((acc, d) => acc + d.placedCount, 0)
  const totalVacancies = districtAnalytics.districts.reduce((acc, d) => acc + d.activeVacancies, 0)

  // 36-District Disparity Analysis
  const acuteDeficitDistricts = districtAnalytics.districts
    .filter((d) => d.imbalanceStatus === 'HIGH_DEFICIT')
    .map((d) => ({
      district: d.districtName,
      region: d.region,
      ratio: d.demandSupplyRatio,
      topDeficits: d.topDeficitTrades,
    }))

  const surplusDemandDistricts = districtAnalytics.districts
    .filter((d) => d.imbalanceStatus === 'SURPLUS_DEMAND')
    .map((d) => ({
      district: d.districtName,
      region: d.region,
      ratio: d.demandSupplyRatio,
    }))

  // Equity & Demographic Indicators (PMKVY 4.0 / Maharashtra state benchmarks)
  const equityIndicators = {
    femaleParticipationRate: formatDenominatorMetric(6940, 18250), // 38.0%
    ruralSharePercentage: formatDenominatorMetric(10580, 18250), // 58.0%
    tribalDistrictsCoverage: formatDenominatorMetric(1420, 1850), // Nandurbar, Gadchiroli tribal blocks
    retentionWageProgressionRate: formatDenominatorMetric(8920, 12640), // 70.6%
  }

  return {
    success: true,
    userRole: scope.role,
    state: 'Maharashtra',
    statePortfolioSummary: {
      totalDistricts: MAHARASHTRA_DISTRICTS.length,
      totalCertified,
      totalPlaced,
      totalVacancies,
      overallDemandSupplyRatio: Number((totalVacancies / Math.max(1, totalCertified)).toFixed(2)),
      schemesActive: MAHARASHTRA_SKILLING_SCHEMES,
      acuteDeficitDistricts,
      surplusDemandDistricts,
    },
    equityIndicators,
    dataCompleteness: {
      outcomeTrackingConsentRate: '88.4% (n=16,133/18,250)',
      employerVerificationRate: '73.5% (n=8,420/11,460)',
      dpdpRevocationRate: '0.4% (n=72/18,250)',
    },
  }
}

/**
 * Policy Scenario Analysis / What-If Simulator (Master Spec Section 9 & 27 Phase 14)
 * INVARIANT: Must explicitly label all outputs with isSimulation: true and include prominent disclaimers.
 */
export function runPolicySimulator({
  budgetAdjustmentPercent = 0,
  targetDistricts = [],
  targetSectors = [],
  enforceRetentionMandate = false,
  reallocateSeatsToDeficitTrades = false,
}) {
  const baselinePlacedCount = 13132
  const baselineCertifiedCount = 18250
  const baselineRetention90d = 81.2

  // Model mathematical simulation adjustments
  let upliftFactor = 1.0
  let retentionDelta = 0.0
  let budgetImpactInrCrores = Number((budgetAdjustmentPercent * 0.85).toFixed(2))

  const simulationAssumptions = [
    'Linear capacity elasticity in accredited vocational ITIs and MSME technology centres.',
    'Employer hiring demand remains steady over the 12-month post-training window.',
    'Trainee migration willingness across regional corridors (Vidarbha -> Pune/Mumbai) estimated at 35%.',
  ]

  if (budgetAdjustmentPercent > 0) {
    // Budget expansion increases training capacity and lab equipment modernization
    upliftFactor += (budgetAdjustmentPercent / 100) * 0.42
    simulationAssumptions.push(
      `Budget expansion of +${budgetAdjustmentPercent}% allocated proportionally to lab infrastructure and instructor honorariums.`
    )
  }

  if (reallocateSeatsToDeficitTrades) {
    // Reallocating surplus classroom seats to high-deficit trades increases conversion
    upliftFactor += 0.085
    retentionDelta += 3.4
    simulationAssumptions.push(
      'Reallocation of 15% under-subscribed ITI batches to CNC, Solar PV, and Cold-Chain trades.'
    )
  }

  if (enforceRetentionMandate) {
    // Mandating employer confirmation links penalizes ghost placements and raises verified stability
    retentionDelta += 6.2
    simulationAssumptions.push(
      'TPO funding disbursements tied to verified T+90 employer verification audit receipts.'
    )
  }

  const simulatedPlacedCount = Math.round(baselinePlacedCount * upliftFactor)
  const simulatedRetention90d = Math.min(96.5, Number((baselineRetention90d + retentionDelta).toFixed(1)))
  const placementRateSimulated = Number(((simulatedPlacedCount / baselineCertifiedCount) * 100).toFixed(1))

  return {
    isSimulation: true,
    disclaimer: 'Assumption-driven policy simulation — not observed historical statistics.',
    timestamp: new Date().toISOString(),
    inputParameters: {
      budgetAdjustmentPercent,
      targetDistricts: targetDistricts.length > 0 ? targetDistricts : ['All 36 Districts'],
      targetSectors: targetSectors.length > 0 ? targetSectors : ['Statewide priority trades'],
      enforceRetentionMandate,
      reallocateSeatsToDeficitTrades,
    },
    baselineMetrics: {
      certifiedCount: baselineCertifiedCount,
      placedCount: baselinePlacedCount,
      placementRate: '71.9% (n=13,132/18,250)',
      retention90dRate: '81.2%',
    },
    projectedMetrics: {
      simulatedPlacedCount,
      additionalLivelihoodsCreated: simulatedPlacedCount - baselinePlacedCount,
      projectedPlacementRate: `${placementRateSimulated}% (simulated n=${simulatedPlacedCount}/${baselineCertifiedCount})`,
      projectedRetention90dRate: `${simulatedRetention90d}%`,
      retentionRateDeltaPercentagePoints: Number(retentionDelta.toFixed(1)),
      estimatedCostPerAdditionalPlacementInr: Math.round(18500 * (1.1 - (upliftFactor - 1.0) * 0.2)),
      estimatedNetBudgetAdjustmentCrores: budgetImpactInrCrores,
    },
    simulationAssumptions,
  }
}

/**
 * Register employer demand signals
 */
export function registerEmployerDemandSignal(signal) {
  const newSignal = {
    id: `ds_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    employerName: String(signal.employerName || 'Anonymous Partner').trim(),
    district: String(signal.district || 'Pune').trim(),
    sector: String(signal.sector || 'General Engineering').trim(),
    requiredSkills: Array.isArray(signal.requiredSkills) ? signal.requiredSkills : [],
    openingsCount: Math.max(1, Number(signal.openingsCount || 5)),
    minWageInr: Number(signal.minWageInr || 15000),
    maxWageInr: Number(signal.maxWageInr || 25000),
    experienceRequired: String(signal.experienceRequired || 'Freshers eligible').trim(),
    createdAt: new Date().toISOString(),
  }
  employerDemandSignals.unshift(newSignal)
  return newSignal
}

/**
 * Get all employer demand signals (filtered by district if provided)
 */
export function getEmployerDemandSignals(district = null) {
  if (!district) return employerDemandSignals
  return employerDemandSignals.filter(
    (s) => s.district.toLowerCase() === district.toLowerCase()
  )
}
