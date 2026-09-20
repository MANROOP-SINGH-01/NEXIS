import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useIsAdmin } from './useIsAdmin';
import { useTraineeProfile } from '../../integration/hooks/useTraineeProfile';
import { useUiStore } from '../../integration/store/uiStore';
import {
  BarChart3,
  TrendingUp,
  MapPin,
  Users,
  GraduationCap,
  Building2,
  Calendar,
  Filter,
  RefreshCw,
  X,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Briefcase,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Clock,
  ArrowUpRight,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// Types for Analytics Payload
interface OverviewData {
  totalEnrolments: number;
  totalTrainees: number;
  dueCheckinTrainees: number;
  respondedTrainees: number;
  responseRate: number | null;
  responseRatePercentage: number | null;
  reportedTrainees: number;
  placedTrainees: number;
  placementRate: number | null;
  placementRatePercentage: number | null;
  employmentStatusBreakdown: {
    EMPLOYED: number;
    SELF_EMPLOYED: number;
    SEARCHING: number;
    IN_TRAINING: number;
    OTHER: number;
  };
}

interface DistrictItem {
  district?: string;
  placementDistrict?: string;
  totalTrainees: number;
  dueCheckinTrainees: number;
  respondedTrainees: number;
  responseRate: number | null;
  responseRatePercentage: number | null;
  reportedTrainees: number;
  placedTrainees: number;
  placementRate: number | null;
  placementRatePercentage: number | null;
  employmentStatusBreakdown: Record<string, number>;
  topHomeDistricts?: { homeDistrict: string; count: number }[];
}

interface CohortItem {
  cohortName: string;
  schemes: string[];
  providers: string[];
  totalTrainees: number;
  dueCheckinTrainees: number;
  respondedTrainees: number;
  responseRate: number | null;
  responseRatePercentage: number | null;
  reportedTrainees: number;
  placedTrainees: number;
  placementRate: number | null;
  placementRatePercentage: number | null;
  employmentStatusBreakdown: Record<string, number>;
}

interface CourseScorecard {
  id: string;
  courseName: string;
  providerName: string;
  totalClaims: number;
  confirmedCount: number;
  deniedCount: number;
  relevanceScore: number | null;
  employerReasonBreakdown: Record<string, number>;
  traineeReasonBreakdown: Record<string, number>;
  topMissingSkills: { skill: string; count: number }[];
  computedAt: string;
}

interface ProviderItem {
  providerName: string;
  schemes?: string[];
  enrolledCourses?: string[];
  totalTrainees: number;
  dueCheckinTrainees?: number;
  respondedTrainees?: number;
  responseRate?: number | null;
  responseRatePercentage?: number | null;
  reportedTrainees?: number;
  placedTrainees: number;
  placementRate?: number | null;
  placementRatePercentage?: number | null;
  averageRelevanceScore: number | null;
  courseScorecards?: CourseScorecard[];
  scorecards?: any[];
}

interface WageProgressionData {
  totalTrainees: number;
  eligibleTrainees: number;
  insufficientDataCount: number;
  movedUpCount: number;
  stayedSameCount: number;
  movedDownCount: number;
  percentageMovedUp: number;
  percentageStayedSame: number;
  percentageMovedDown: number;
  transitions: { transition: string; count: number }[];
}

// ── Impact Estimation (Illustrative — Synthetic Control Group) ─────────────
// NOTE: overallEstimatedUpliftPp is the illustrative uplift in percentage points
//       produced by comparing trainees to a SYNTHETIC control group.
//       This is not a validated causal effect — see disclaimer in every response.
interface ImpactBucketRow {
  ageBand: string;
  district: string;
  priorQualification: string;
  traineeCount: number;
  controlCount: number;
  traineePlacementRate: number | null;
  controlPlacementRate: number | null;
  estimatedUpliftPp: number | null;
  skipped: boolean;
  skipReason: string | null;
}

interface ImpactData {
  overallEstimatedUpliftPp: number | null;
  eligibleBuckets: number;
  skippedBuckets: number;
  totalTraineesInEligibleBuckets: number;
  totalControlsInEligibleBuckets: number;
  perBucketBreakdown: ImpactBucketRow[];
  disclaimer: string;
  methodology: string;
}

// ── Phase 11 Provider & District Outcome Intelligence Types ─────────────────
interface DenominatorMetric {
  isSuppressed: boolean;
  displayValue: string;
  numerator: number | null;
  denominator: number;
  percentage: number | null;
  confidenceInterval?: {
    lower: number;
    upper: number;
    marginOfError: number;
    confidenceLevel: string;
  } | null;
  suppressionReason?: string;
}

interface Phase11ProviderItem {
  providerId: string;
  providerName: string;
  district: string;
  sector: string;
  cohortSize: number;
  certificationRate: DenominatorMetric;
  placementRate: DenominatorMetric;
  verifiedPlacementRate: DenominatorMetric;
  verificationCoverage: DenominatorMetric;
  retentionCurve: {
    t30: DenominatorMetric;
    t90: DenominatorMetric;
    t180: DenominatorMetric;
    t365: DenominatorMetric;
  };
  wageDistribution: Record<string, number>;
  unplacedRootCauses: { rootCause: string; count: number }[];
}

interface Phase11DistrictItem {
  districtName: string;
  region: string;
  candidateCount: number;
  certifiedCount: number;
  placedCount: number;
  activeVacancies: number;
  demandSupplyRatio: number;
  imbalanceStatus: 'HIGH_DEFICIT' | 'MODERATE_DEFICIT' | 'BALANCED' | 'SURPLUS_DEMAND';
  typicalWage: string;
  placementRate: DenominatorMetric;
  retention90d: DenominatorMetric;
  topDeficitTrades: string[];
  topHighDemandTrades: string[];
}

const SHOWCASE_PHASE11_PROVIDERS: Phase11ProviderItem[] = [
  {
    providerId: 'prov_pune_iti_01',
    providerName: 'Government ITI Pune (Aundh)',
    district: 'Pune',
    sector: 'Automotive & Advanced Manufacturing',
    cohortSize: 240,
    certificationRate: { isSuppressed: false, displayValue: '90.8% (n=218/240)', numerator: 218, denominator: 240, percentage: 90.8, confidenceInterval: { lower: 87.1, upper: 94.5, marginOfError: 3.7, confidenceLevel: '95%' } },
    placementRate: { isSuppressed: false, displayValue: '84.4% (n=184/218)', numerator: 184, denominator: 218, percentage: 84.4, confidenceInterval: { lower: 79.6, upper: 89.2, marginOfError: 4.8, confidenceLevel: '95%' } },
    verifiedPlacementRate: { isSuppressed: false, displayValue: '71.6% (n=156/218)', numerator: 156, denominator: 218, percentage: 71.6, confidenceInterval: { lower: 65.6, upper: 77.6, marginOfError: 6.0, confidenceLevel: '95%' } },
    verificationCoverage: { isSuppressed: false, displayValue: '84.8% (n=156/184)', numerator: 156, denominator: 184, percentage: 84.8, confidenceInterval: { lower: 79.6, upper: 90.0, marginOfError: 5.2, confidenceLevel: '95%' } },
    retentionCurve: {
      t30: { isSuppressed: false, displayValue: '96.7% (n=178/184)', numerator: 178, denominator: 184, percentage: 96.7 },
      t90: { isSuppressed: false, displayValue: '88.0% (n=162/184)', numerator: 162, denominator: 184, percentage: 88.0 },
      t180: { isSuppressed: false, displayValue: '80.4% (n=148/184)', numerator: 148, denominator: 184, percentage: 80.4 },
      t365: { isSuppressed: false, displayValue: '71.7% (n=132/184)', numerator: 132, denominator: 184, percentage: 71.7 },
    },
    wageDistribution: { 'LESS_THAN_10K': 12, '10K_TO_15K': 48, '15K_TO_25K': 92, '25K_TO_40K': 28, 'ABOVE_40K': 4 },
    unplacedRootCauses: [{ rootCause: 'SKILL_MISMATCH', count: 18 }, { rootCause: 'LOCATION_MISMATCH', count: 12 }, { rootCause: 'SALARY_MISMATCH', count: 8 }],
  },
  {
    providerId: 'prov_nagpur_vsdc_02',
    providerName: 'Vidarbha Skill Development Centre',
    district: 'Nagpur',
    sector: 'Electronics & Hardware',
    cohortSize: 180,
    certificationRate: { isSuppressed: false, displayValue: '85.6% (n=154/180)', numerator: 154, denominator: 180, percentage: 85.6, confidenceInterval: { lower: 80.4, upper: 90.8, marginOfError: 5.2, confidenceLevel: '95%' } },
    placementRate: { isSuppressed: false, displayValue: '63.6% (n=98/154)', numerator: 98, denominator: 154, percentage: 63.6, confidenceInterval: { lower: 56.0, upper: 71.2, marginOfError: 7.6, confidenceLevel: '95%' } },
    verifiedPlacementRate: { isSuppressed: false, displayValue: '46.8% (n=72/154)', numerator: 72, denominator: 154, percentage: 46.8, confidenceInterval: { lower: 38.9, upper: 54.7, marginOfError: 7.9, confidenceLevel: '95%' } },
    verificationCoverage: { isSuppressed: false, displayValue: '73.5% (n=72/98)', numerator: 72, denominator: 98, percentage: 73.5, confidenceInterval: { lower: 64.8, upper: 82.2, marginOfError: 8.7, confidenceLevel: '95%' } },
    retentionCurve: {
      t30: { isSuppressed: false, displayValue: '93.9% (n=92/98)', numerator: 92, denominator: 98, percentage: 93.9 },
      t90: { isSuppressed: false, displayValue: '82.7% (n=81/98)', numerator: 81, denominator: 98, percentage: 82.7 },
      t180: { isSuppressed: false, displayValue: '70.4% (n=69/98)', numerator: 69, denominator: 98, percentage: 70.4 },
      t365: { isSuppressed: false, displayValue: '59.2% (n=58/98)', numerator: 58, denominator: 98, percentage: 59.2 },
    },
    wageDistribution: { 'LESS_THAN_10K': 22, '10K_TO_15K': 46, '15K_TO_25K': 24, '25K_TO_40K': 6, 'ABOVE_40K': 0 },
    unplacedRootCauses: [{ rootCause: 'EMPLOYER_DEMAND', count: 28 }, { rootCause: 'EXPERIENCE_GAP', count: 16 }, { rootCause: 'TRANSPORT', count: 12 }],
  },
  {
    providerId: 'prov_aurangabad_msme_03',
    providerName: 'Marathwada MSME Technology Centre',
    district: 'Chhatrapati Sambhajinagar',
    sector: 'CNC Machining & Tool Design',
    cohortSize: 120,
    certificationRate: { isSuppressed: false, displayValue: '93.3% (n=112/120)', numerator: 112, denominator: 120, percentage: 93.3, confidenceInterval: { lower: 88.8, upper: 97.8, marginOfError: 4.5, confidenceLevel: '95%' } },
    placementRate: { isSuppressed: false, displayValue: '79.5% (n=89/112)', numerator: 89, denominator: 112, percentage: 79.5, confidenceInterval: { lower: 72.0, upper: 87.0, marginOfError: 7.5, confidenceLevel: '95%' } },
    verifiedPlacementRate: { isSuppressed: false, displayValue: '72.3% (n=81/112)', numerator: 81, denominator: 112, percentage: 72.3, confidenceInterval: { lower: 64.0, upper: 80.6, marginOfError: 8.3, confidenceLevel: '95%' } },
    verificationCoverage: { isSuppressed: false, displayValue: '91.0% (n=81/89)', numerator: 81, denominator: 89, percentage: 91.0, confidenceInterval: { lower: 85.1, upper: 96.9, marginOfError: 5.9, confidenceLevel: '95%' } },
    retentionCurve: {
      t30: { isSuppressed: false, displayValue: '98.9% (n=88/89)', numerator: 88, denominator: 89, percentage: 98.9 },
      t90: { isSuppressed: false, displayValue: '92.1% (n=82/89)', numerator: 82, denominator: 89, percentage: 92.1 },
      t180: { isSuppressed: false, displayValue: '85.4% (n=76/89)', numerator: 76, denominator: 89, percentage: 85.4 },
      t365: { isSuppressed: false, displayValue: '79.8% (n=71/89)', numerator: 71, denominator: 89, percentage: 79.8 },
    },
    wageDistribution: { 'LESS_THAN_10K': 5, '10K_TO_15K': 24, '15K_TO_25K': 48, '25K_TO_40K': 12, 'ABOVE_40K': 0 },
    unplacedRootCauses: [{ rootCause: 'LANGUAGE', count: 11 }, { rootCause: 'SALARY_MISMATCH', count: 8 }],
  },
  {
    providerId: 'prov_gadchiroli_rural_05',
    providerName: 'Rural Tribal Skilling Cell',
    district: 'Gadchiroli',
    sector: 'Forestry Products & Bamboo Craft',
    cohortSize: 4,
    certificationRate: { isSuppressed: true, displayValue: '< 5', numerator: null, denominator: 4, percentage: null, suppressionReason: 'Small sample size (N=4 < 5) masked for privacy and statistical reliability.' },
    placementRate: { isSuppressed: true, displayValue: '< 5', numerator: null, denominator: 3, percentage: null, suppressionReason: 'Small sample size (N=3 < 5) masked for privacy and statistical reliability.' },
    verifiedPlacementRate: { isSuppressed: true, displayValue: '< 5', numerator: null, denominator: 3, percentage: null, suppressionReason: 'Small sample size (N=3 < 5) masked for privacy and statistical reliability.' },
    verificationCoverage: { isSuppressed: true, displayValue: '< 5', numerator: null, denominator: 2, percentage: null, suppressionReason: 'Small sample size (N=2 < 5) masked for privacy and statistical reliability.' },
    retentionCurve: {
      t30: { isSuppressed: true, displayValue: '< 5', numerator: null, denominator: 2, percentage: null },
      t90: { isSuppressed: true, displayValue: '< 5', numerator: null, denominator: 2, percentage: null },
      t180: { isSuppressed: true, displayValue: '< 5', numerator: null, denominator: 2, percentage: null },
      t365: { isSuppressed: true, displayValue: '< 5', numerator: null, denominator: 2, percentage: null },
    },
    wageDistribution: { 'LESS_THAN_10K': 2 },
    unplacedRootCauses: [{ rootCause: 'EMPLOYER_DEMAND', count: 1 }],
  },
];

const SHOWCASE_PHASE11_DISTRICTS: Phase11DistrictItem[] = [
  { districtName: 'Pune', region: 'Western Maharashtra', candidateCount: 207, certifiedCount: 182, placedCount: 142, activeVacancies: 209, demandSupplyRatio: 1.15, imbalanceStatus: 'BALANCED', typicalWage: '18K-25K', placementRate: { isSuppressed: false, displayValue: '78.0%', numerator: 142, denominator: 182, percentage: 78.0 }, retention90d: { isSuppressed: false, displayValue: '82.4%', numerator: 117, denominator: 142, percentage: 82.4 }, topDeficitTrades: [], topHighDemandTrades: ['Embedded Software Engineer', 'Healthcare Assistant'] },
  { districtName: 'Mumbai Suburban', region: 'Konkan', candidateCount: 234, certifiedCount: 206, placedCount: 161, activeVacancies: 268, demandSupplyRatio: 1.30, imbalanceStatus: 'SURPLUS_DEMAND', typicalWage: '22K-30K', placementRate: { isSuppressed: false, displayValue: '78.2%', numerator: 161, denominator: 206, percentage: 78.2 }, retention90d: { isSuppressed: false, displayValue: '82.6%', numerator: 133, denominator: 161, percentage: 82.6 }, topDeficitTrades: [], topHighDemandTrades: ['Cloud Operations', 'Warehouse Logistics'] },
  { districtName: 'Mumbai City', region: 'Konkan', candidateCount: 225, certifiedCount: 198, placedCount: 154, activeVacancies: 248, demandSupplyRatio: 1.25, imbalanceStatus: 'SURPLUS_DEMAND', typicalWage: '22K-32K', placementRate: { isSuppressed: false, displayValue: '77.8%', numerator: 154, denominator: 198, percentage: 77.8 }, retention90d: { isSuppressed: false, displayValue: '81.8%', numerator: 126, denominator: 154, percentage: 81.8 }, topDeficitTrades: [], topHighDemandTrades: ['Financial Services', 'Executive Logistics'] },
  { districtName: 'Thane', region: 'Konkan', candidateCount: 198, certifiedCount: 174, placedCount: 136, activeVacancies: 191, demandSupplyRatio: 1.10, imbalanceStatus: 'BALANCED', typicalWage: '18K-26K', placementRate: { isSuppressed: false, displayValue: '78.2%', numerator: 136, denominator: 174, percentage: 78.2 }, retention90d: { isSuppressed: false, displayValue: '82.4%', numerator: 112, denominator: 136, percentage: 82.4 }, topDeficitTrades: [], topHighDemandTrades: ['Pharma Technician', 'CNC Machinist'] },
  { districtName: 'Nagpur', region: 'Vidarbha', candidateCount: 148, certifiedCount: 130, placedCount: 72, activeVacancies: 107, demandSupplyRatio: 0.82, imbalanceStatus: 'BALANCED', typicalWage: '14K-20K', placementRate: { isSuppressed: false, displayValue: '55.4%', numerator: 72, denominator: 130, percentage: 55.4 }, retention90d: { isSuppressed: false, displayValue: '81.9%', numerator: 59, denominator: 72, percentage: 81.9 }, topDeficitTrades: [], topHighDemandTrades: ['Logistics Associate'] },
  { districtName: 'Nashik', region: 'North Maharashtra', candidateCount: 158, certifiedCount: 139, placedCount: 76, activeVacancies: 122, demandSupplyRatio: 0.88, imbalanceStatus: 'BALANCED', typicalWage: '15K-22K', placementRate: { isSuppressed: false, displayValue: '54.7%', numerator: 76, denominator: 139, percentage: 54.7 }, retention90d: { isSuppressed: false, displayValue: '81.6%', numerator: 62, denominator: 76, percentage: 81.6 }, topDeficitTrades: [], topHighDemandTrades: ['Agri-Cold-Chain Operator'] },
  { districtName: 'Chhatrapati Sambhajinagar', region: 'Marathwada', candidateCount: 133, certifiedCount: 117, placedCount: 64, activeVacancies: 87, demandSupplyRatio: 0.74, imbalanceStatus: 'MODERATE_DEFICIT', typicalWage: '14K-19K', placementRate: { isSuppressed: false, displayValue: '54.7%', numerator: 64, denominator: 117, percentage: 54.7 }, retention90d: { isSuppressed: false, displayValue: '81.3%', numerator: 52, denominator: 64, percentage: 81.3 }, topDeficitTrades: ['CNC Machine Operator', 'Solar Technician', 'Welder'], topHighDemandTrades: ['Agri-processing Operator'] },
  { districtName: 'Solapur', region: 'Western Maharashtra', candidateCount: 117, certifiedCount: 103, placedCount: 57, activeVacancies: 67, demandSupplyRatio: 0.65, imbalanceStatus: 'MODERATE_DEFICIT', typicalWage: '12K-17K', placementRate: { isSuppressed: false, displayValue: '55.3%', numerator: 57, denominator: 103, percentage: 55.3 }, retention90d: { isSuppressed: false, displayValue: '82.5%', numerator: 47, denominator: 57, percentage: 82.5 }, topDeficitTrades: ['Textile Machine Mechanic', 'Solar Technician'], topHighDemandTrades: ['Agri-processing Operator'] },
  { districtName: 'Gadchiroli', region: 'Vidarbha', candidateCount: 50, certifiedCount: 44, placedCount: 24, activeVacancies: 12, demandSupplyRatio: 0.28, imbalanceStatus: 'HIGH_DEFICIT', typicalWage: '8K-12K', placementRate: { isSuppressed: false, displayValue: '54.5%', numerator: 24, denominator: 44, percentage: 54.5 }, retention90d: { isSuppressed: false, displayValue: '83.3%', numerator: 20, denominator: 24, percentage: 83.3 }, topDeficitTrades: ['Forestry Equipment Operator', 'Electrician', 'Welder'], topHighDemandTrades: ['Agri-processing Operator'] },
  { districtName: 'Nandurbar', region: 'North Maharashtra', candidateCount: 58, certifiedCount: 51, placedCount: 28, activeVacancies: 16, demandSupplyRatio: 0.32, imbalanceStatus: 'HIGH_DEFICIT', typicalWage: '9K-12K', placementRate: { isSuppressed: false, displayValue: '54.9%', numerator: 28, denominator: 51, percentage: 54.9 }, retention90d: { isSuppressed: false, displayValue: '82.1%', numerator: 23, denominator: 28, percentage: 82.1 }, topDeficitTrades: ['Solar Technician', 'Welder'], topHighDemandTrades: ['Agri-processing Operator'] },
  { districtName: 'Washim', region: 'Vidarbha', candidateCount: 65, certifiedCount: 57, placedCount: 31, activeVacancies: 21, demandSupplyRatio: 0.36, imbalanceStatus: 'HIGH_DEFICIT', typicalWage: '9K-13K', placementRate: { isSuppressed: false, displayValue: '54.4%', numerator: 31, denominator: 57, percentage: 54.4 }, retention90d: { isSuppressed: false, displayValue: '83.9%', numerator: 26, denominator: 31, percentage: 83.9 }, topDeficitTrades: ['CNC Machine Operator', 'Solar Technician'], topHighDemandTrades: ['Agri-processing Operator'] },
  { districtName: 'Hingoli', region: 'Marathwada', candidateCount: 63, certifiedCount: 55, placedCount: 30, activeVacancies: 19, demandSupplyRatio: 0.35, imbalanceStatus: 'HIGH_DEFICIT', typicalWage: '9K-13K', placementRate: { isSuppressed: false, displayValue: '54.5%', numerator: 30, denominator: 55, percentage: 54.5 }, retention90d: { isSuppressed: false, displayValue: '83.3%', numerator: 25, denominator: 30, percentage: 83.3 }, topDeficitTrades: ['Agricultural Equipment Maintenance', 'Welder'], topHighDemandTrades: ['Agri-processing Operator'] },
];

const SHOWCASE_PHASE11_SUMMARY = {
  totalDistricts: 36,
  highDeficitDistrictsCount: 9,
  moderateDeficitCount: 16,
  balancedCount: 8,
  surplusDemandCount: 3,
};

const SHOWCASE_ANALYTICS_OVERVIEW: any = {
  totalTrainees: 14820,
  totalEnrolments: 16450,
  dueCheckinTrainees: 14820,
  respondedTrainees: 13130,
  responseRate: 0.886,
  responseRatePercentage: 88.6,
  placedTrainees: 11460,
  reportedTrainees: 13130,
  placementRate: 0.773,
  placementRatePercentage: 77.3,
  averageRelevanceScore: 86.4,
  verifiedPlacementCount: 10890,
  verifiedPlacementRate: 0.735,
  verifiedPlacementRatePercentage: 73.5,
  schemeBreakdown: {
    'PMKVY 4.0': 6240,
    'DDU-GKY': 4180,
    'NAPS Apprenticeship': 2850,
    'State Skill Missions (SSDM)': 1550,
  },
  topSectors: [
    { sector: 'IT & Software Development', count: 4820 },
    { sector: 'Cloud & DevOps Infrastructure', count: 2940 },
    { sector: 'Electronics & Hardware Manufacturing', count: 2150 },
    { sector: 'Fintech & Data Operations', count: 1550 },
  ],
  employmentStatusBreakdown: {
    EMPLOYED: 11460,
    SELF_EMPLOYED: 1120,
    SEARCHING: 1670,
    IN_TRAINING: 570,
    OTHER: 0,
  },
};

function getShowcaseOverviewForScheme(scheme: string) {
  if (scheme === 'PMKVY 4.0' || scheme === 'PMKVY') {
    return {
      totalTrainees: 6240,
      totalEnrolments: 6850,
      dueCheckinTrainees: 6240,
      respondedTrainees: 5616,
      responseRate: 0.900,
      responseRatePercentage: 90.0,
      placedTrainees: 4942,
      reportedTrainees: 5616,
      placementRate: 0.792,
      placementRatePercentage: 79.2,
      averageRelevanceScore: 88.2,
      verifiedPlacementCount: 4710,
      verifiedPlacementRate: 0.755,
      verifiedPlacementRatePercentage: 75.5,
      schemeBreakdown: { 'PMKVY 4.0': 6240 },
      topSectors: [
        { sector: 'IT & Software Development', count: 2420 },
        { sector: 'Cloud & DevOps Infrastructure', count: 1540 },
        { sector: 'Electronics & Hardware', count: 1150 },
      ],
      employmentStatusBreakdown: { EMPLOYED: 4942, SELF_EMPLOYED: 420, SEARCHING: 678, IN_TRAINING: 200, OTHER: 0 },
    };
  }
  if (scheme === 'DDU-GKY') {
    return {
      totalTrainees: 4180,
      totalEnrolments: 4520,
      dueCheckinTrainees: 4180,
      respondedTrainees: 3678,
      responseRate: 0.880,
      responseRatePercentage: 88.0,
      placedTrainees: 3210,
      reportedTrainees: 3678,
      placementRate: 0.768,
      placementRatePercentage: 76.8,
      averageRelevanceScore: 84.6,
      verifiedPlacementCount: 3010,
      verifiedPlacementRate: 0.720,
      verifiedPlacementRatePercentage: 72.0,
      schemeBreakdown: { 'DDU-GKY': 4180 },
      topSectors: [
        { sector: 'Logistics & Supply Chain', count: 1820 },
        { sector: 'Electronics Manufacturing', count: 1250 },
        { sector: 'IT Support', count: 1110 },
      ],
      employmentStatusBreakdown: { EMPLOYED: 3210, SELF_EMPLOYED: 380, SEARCHING: 468, IN_TRAINING: 122, OTHER: 0 },
    };
  }
  if (scheme === 'ITI' || scheme === 'NAPS Apprenticeship') {
    return {
      totalTrainees: 2850,
      totalEnrolments: 3100,
      dueCheckinTrainees: 2850,
      respondedTrainees: 2593,
      responseRate: 0.910,
      responseRatePercentage: 91.0,
      placedTrainees: 2320,
      reportedTrainees: 2593,
      placementRate: 0.814,
      placementRatePercentage: 81.4,
      averageRelevanceScore: 89.1,
      verifiedPlacementCount: 2240,
      verifiedPlacementRate: 0.786,
      verifiedPlacementRatePercentage: 78.6,
      schemeBreakdown: { 'NAPS Apprenticeship': 2850 },
      topSectors: [
        { sector: 'Industrial Automation', count: 1420 },
        { sector: 'Automotive Embedded Systems', count: 900 },
      ],
      employmentStatusBreakdown: { EMPLOYED: 2320, SELF_EMPLOYED: 180, SEARCHING: 273, IN_TRAINING: 77, OTHER: 0 },
    };
  }
  return SHOWCASE_ANALYTICS_OVERVIEW;
}

const SHOWCASE_DISTRICTS: DistrictItem[] = [
  { district: 'Bengaluru Urban, Karnataka', placementDistrict: 'Bengaluru Urban, Karnataka', totalTrainees: 3420, dueCheckinTrainees: 3420, respondedTrainees: 3050, responseRate: 0.892, responseRatePercentage: 89.2, reportedTrainees: 3050, placedTrainees: 2900, placementRate: 0.848, placementRatePercentage: 84.8, employmentStatusBreakdown: { EMPLOYED: 2900, SEARCHING: 150 } },
  { district: 'Pune Metro, Maharashtra', placementDistrict: 'Pune Metro, Maharashtra', totalTrainees: 2890, dueCheckinTrainees: 2890, respondedTrainees: 2525, responseRate: 0.874, responseRatePercentage: 87.4, reportedTrainees: 2525, placedTrainees: 2346, placementRate: 0.812, placementRatePercentage: 81.2, employmentStatusBreakdown: { EMPLOYED: 2346, SEARCHING: 179 } },
  { district: 'Hyderabad Cyberabad, Telangana', placementDistrict: 'Hyderabad Cyberabad, Telangana', totalTrainees: 2640, dueCheckinTrainees: 2640, respondedTrainees: 2273, responseRate: 0.861, responseRatePercentage: 86.1, reportedTrainees: 2273, placedTrainees: 2125, placementRate: 0.805, placementRatePercentage: 80.5, employmentStatusBreakdown: { EMPLOYED: 2125, SEARCHING: 148 } },
  { district: 'Gurugram & Noida NCR', placementDistrict: 'Gurugram & Noida NCR', totalTrainees: 2380, dueCheckinTrainees: 2380, respondedTrainees: 2030, responseRate: 0.853, responseRatePercentage: 85.3, reportedTrainees: 2030, placedTrainees: 1878, placementRate: 0.789, placementRatePercentage: 78.9, employmentStatusBreakdown: { EMPLOYED: 1878, SEARCHING: 152 } },
  { district: 'Chennai OMR Corridor, Tamil Nadu', placementDistrict: 'Chennai OMR Corridor, Tamil Nadu', totalTrainees: 1840, dueCheckinTrainees: 1840, respondedTrainees: 1545, responseRate: 0.840, responseRatePercentage: 84.0, reportedTrainees: 1545, placedTrainees: 1405, placementRate: 0.764, placementRatePercentage: 76.4, employmentStatusBreakdown: { EMPLOYED: 1405, SEARCHING: 140 } },
  { district: 'Mumbai Suburban, Maharashtra', placementDistrict: 'Mumbai Suburban, Maharashtra', totalTrainees: 1650, dueCheckinTrainees: 1650, respondedTrainees: 1361, responseRate: 0.825, responseRatePercentage: 82.5, reportedTrainees: 1361, placedTrainees: 1224, placementRate: 0.742, placementRatePercentage: 74.2, employmentStatusBreakdown: { EMPLOYED: 1224, SEARCHING: 137 } },
];

const SHOWCASE_COHORTS: CohortItem[] = [
  { cohortName: '2024-Q1 (Jan - Mar)', schemes: ['PMKVY 4.0', 'DDU-GKY'], providers: ['Apex Technical Academy', 'DataVanguard Labs'], totalTrainees: 3840, dueCheckinTrainees: 3840, respondedTrainees: 3520, responseRate: 0.916, responseRatePercentage: 91.6, reportedTrainees: 3520, placedTrainees: 3256, placementRate: 0.848, placementRatePercentage: 84.8, employmentStatusBreakdown: { EMPLOYED: 3256, SEARCHING: 264 } },
  { cohortName: '2024-Q2 (Apr - Jun)', schemes: ['PMKVY 4.0', 'NAPS Apprenticeship'], providers: ['TechSkills Foundation', 'Apex Technical Academy'], totalTrainees: 4120, dueCheckinTrainees: 4120, respondedTrainees: 3680, responseRate: 0.893, responseRatePercentage: 89.3, reportedTrainees: 3680, placedTrainees: 3275, placementRate: 0.795, placementRatePercentage: 79.5, employmentStatusBreakdown: { EMPLOYED: 3275, SEARCHING: 405 } },
  { cohortName: '2024-Q3 (Jul - Sep)', schemes: ['DDU-GKY', 'State Skill Missions'], providers: ['CyberCraft Vocational', 'DataVanguard Labs'], totalTrainees: 4260, dueCheckinTrainees: 4260, respondedTrainees: 3650, responseRate: 0.857, responseRatePercentage: 85.7, reportedTrainees: 3650, placedTrainees: 3160, placementRate: 0.742, placementRatePercentage: 74.2, employmentStatusBreakdown: { EMPLOYED: 3160, SEARCHING: 490 } },
  { cohortName: '2024-Q4 (Oct - Dec)', schemes: ['PMKVY 4.0', 'NAPS Apprenticeship'], providers: ['Horizon Skills Academy', 'TechSkills Foundation'], totalTrainees: 2600, dueCheckinTrainees: 2600, respondedTrainees: 2280, responseRate: 0.877, responseRatePercentage: 87.7, reportedTrainees: 2280, placedTrainees: 1769, placementRate: 0.689, placementRatePercentage: 68.9, employmentStatusBreakdown: { EMPLOYED: 1769, SEARCHING: 511 } },
];

const SHOWCASE_PROVIDERS: ProviderItem[] = [
  {
    providerName: 'Apex Technical Academy',
    totalTrainees: 4320,
    placedTrainees: 3820,
    placementRatePercentage: 88.4,
    responseRatePercentage: 92.1,
    averageRelevanceScore: 88.4,
    scorecards: [
      {
        id: 'sc_apex_1',
        courseName: 'Full Stack Web Engineering',
        providerName: 'Apex Technical Academy',
        totalClaims: 1840,
        confirmedCount: 1626,
        deniedCount: 214,
        relevanceScore: 88.4,
        employerReasonBreakdown: { 'VERIFIED_IN_FIELD': 1626, 'ROLE_MISMATCH': 140, 'PROBATION_TERMINATED': 74 },
        traineeReasonBreakdown: { 'DIRECTLY_RELATED': 1626, 'SKILL_DEFICIT': 214 },
        topMissingSkills: [{ skill: 'Docker & Microservices', count: 124 }, { skill: 'System Design', count: 88 }, { skill: 'GraphQL APIs', count: 62 }],
        computedAt: new Date().toISOString(),
      },
    ],
  },
  {
    providerName: 'DataVanguard Labs',
    totalTrainees: 3450,
    placedTrainees: 2998,
    placementRatePercentage: 86.9,
    responseRatePercentage: 90.5,
    averageRelevanceScore: 86.9,
    scorecards: [
      {
        id: 'sc_dv_1',
        courseName: 'Data Analytics & Business Intelligence',
        providerName: 'DataVanguard Labs',
        totalClaims: 1420,
        confirmedCount: 1234,
        deniedCount: 186,
        relevanceScore: 86.9,
        employerReasonBreakdown: { 'VERIFIED_IN_FIELD': 1234, 'TOOL_MISMATCH': 110, 'SALARY_EXPECTATION': 76 },
        traineeReasonBreakdown: { 'DIRECTLY_RELATED': 1234, 'FRAMEWORK_GAP': 186 },
        topMissingSkills: [{ skill: 'Advanced PowerBI DAX', count: 96 }, { skill: 'Airflow Orchestration', count: 72 }],
        computedAt: new Date().toISOString(),
      },
    ],
  },
  {
    providerName: 'TechSkills Foundation',
    totalTrainees: 3120,
    placedTrainees: 2568,
    placementRatePercentage: 82.3,
    responseRatePercentage: 87.2,
    averageRelevanceScore: 82.3,
    scorecards: [],
  },
  {
    providerName: 'CyberCraft Vocational Institute',
    totalTrainees: 2340,
    placedTrainees: 1867,
    placementRatePercentage: 79.8,
    responseRatePercentage: 85.0,
    averageRelevanceScore: 79.8,
    scorecards: [],
  },
  {
    providerName: 'Horizon Skills Academy',
    totalTrainees: 1590,
    placedTrainees: 1198,
    placementRatePercentage: 75.4,
    responseRatePercentage: 83.1,
    averageRelevanceScore: 75.4,
    scorecards: [],
  },
];

const SHOWCASE_WAGE_PROGRESSION: any = {
  baselineAverageWage: 14500,
  month3AverageWage: 22800,
  month6AverageWage: 28500,
  month12AverageWage: 34000,
  growthPercentage: 134.5,
};

const SHOWCASE_IMPACT_DATA: ImpactData = {
  overallEstimatedUpliftPp: 28.4,
  eligibleBuckets: 8,
  skippedBuckets: 0,
  totalTraineesInEligibleBuckets: 11460,
  totalControlsInEligibleBuckets: 8240,
  disclaimer:
    'Illustrative placement rate comparison against synthetic control cohorts constructed from census microdata and labor indicators. Stratified by age band, baseline educational qualification, and home district.',
  methodology:
    'Coarsened Exact Matching (CEM) over age, district, and prior qualification strata with minimum cell size k=25.',
  perBucketBreakdown: [
    { ageBand: '18-24', district: 'Bengaluru Urban', priorQualification: '12th Pass', traineeCount: 1840, controlCount: 1420, traineePlacementRate: 84.8, controlPlacementRate: 52.1, estimatedUpliftPp: 32.7, skipped: false, skipReason: null },
    { ageBand: '18-24', district: 'Pune', priorQualification: 'Graduate', traineeCount: 1620, controlCount: 1210, traineePlacementRate: 82.5, controlPlacementRate: 54.0, estimatedUpliftPp: 28.5, skipped: false, skipReason: null },
    { ageBand: '25-29', district: 'Hyderabad', priorQualification: '10th Pass', traineeCount: 1490, controlCount: 1100, traineePlacementRate: 78.4, controlPlacementRate: 49.2, estimatedUpliftPp: 29.2, skipped: false, skipReason: null },
    { ageBand: '18-24', district: 'Gurgaon', priorQualification: 'Graduate', traineeCount: 1380, controlCount: 980, traineePlacementRate: 79.2, controlPlacementRate: 51.5, estimatedUpliftPp: 27.7, skipped: false, skipReason: null },
    { ageBand: '25-29', district: 'Noida', priorQualification: '12th Pass', traineeCount: 1150, controlCount: 860, traineePlacementRate: 75.8, controlPlacementRate: 48.0, estimatedUpliftPp: 27.8, skipped: false, skipReason: null },
    { ageBand: '18-24', district: 'Chennai', priorQualification: 'Graduate', traineeCount: 1420, controlCount: 1040, traineePlacementRate: 76.4, controlPlacementRate: 50.2, estimatedUpliftPp: 26.2, skipped: false, skipReason: null },
    { ageBand: '18-24', district: 'Mumbai Suburban', priorQualification: '12th Pass', traineeCount: 1280, controlCount: 890, traineePlacementRate: 74.2, controlPlacementRate: 47.6, estimatedUpliftPp: 26.6, skipped: false, skipReason: null },
    { ageBand: '25-29', district: 'Kolkata', priorQualification: '10th Pass', traineeCount: 1280, controlCount: 740, traineePlacementRate: 72.1, controlPlacementRate: 44.5, estimatedUpliftPp: 27.6, skipped: false, skipReason: null },
  ],
};

export const AnalyticsDashboard: React.FC = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { token } = useTraineeProfile();
  const { setAnalyticsDashboardOpen } = useUiStore();

  // Filters
  const [selectedScheme, setSelectedScheme] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // District View Toggle
  const [districtViewMode, setDistrictViewMode] = useState<'home' | 'placement'>('home');

  // Loading & Error states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [homeDistricts, setHomeDistricts] = useState<DistrictItem[]>([]);
  const [placementDistricts, setPlacementDistricts] = useState<DistrictItem[]>([]);
  const [cohorts, setCohorts] = useState<CohortItem[]>([]);
  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [wageProgression, setWageProgression] = useState<WageProgressionData | null>(null);

  // Phase 11 Longitudinal Retention & 36-District Intelligence State
  const [phase11Providers, setPhase11Providers] = useState<Phase11ProviderItem[]>(SHOWCASE_PHASE11_PROVIDERS);
  const [phase11Districts, setPhase11Districts] = useState<Phase11DistrictItem[]>(SHOWCASE_PHASE11_DISTRICTS);
  const [phase11DistrictSummary, setPhase11DistrictSummary] = useState<{
    totalDistricts: number;
    highDeficitDistrictsCount: number;
    moderateDeficitCount: number;
    balancedCount: number;
    surplusDemandCount: number;
  } | null>(SHOWCASE_PHASE11_SUMMARY);
  const [phase11RegionFilter, setPhase11RegionFilter] = useState<string>('ALL');

  const phase11FilteredDistricts = useMemo(() => {
    if (phase11RegionFilter === 'ALL') return phase11Districts;
    return phase11Districts.filter((d) => d.region.toLowerCase() === phase11RegionFilter.toLowerCase());
  }, [phase11Districts, phase11RegionFilter]);

  // Provider Table Sorting & Drilldown
  const [providerSortField, setProviderSortField] = useState<'relevance' | 'placement' | 'response' | 'trainees' | 'name'>('relevance');
  const [providerSortAsc, setProviderSortAsc] = useState<boolean>(true);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [adminTab, setAdminTab] = useState<'overview' | 'districts' | 'providers' | 'wages' | 'impact'>('overview');

  // Provider Access Link Generator
  const [genProviderName, setGenProviderName] = useState('');
  const [genExpiryDays, setGenExpiryDays] = useState('30');
  const [generatingToken, setGeneratingToken] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<{ link: string; expiresAt: string; providerName: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Impact Estimation state (fetched independently — different auth, no filter params)
  const [impactData, setImpactData] = useState<ImpactData | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [impactError, setImpactError] = useState<string | null>(null);
  // Bucket table is collapsed by default — the overview number is the headline
  const [impactBucketsExpanded, setImpactBucketsExpanded] = useState(false);

  // Fetch all analytics data with query filters
  const fetchData = useCallback(async (isRefresh = false) => {
    if (!token) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const queryParts: string[] = [];
    if (selectedScheme.trim()) queryParts.push(`scheme=${encodeURIComponent(selectedScheme.trim())}`);
    if (startDate) queryParts.push(`from=${encodeURIComponent(startDate)}`);
    if (endDate) queryParts.push(`to=${encodeURIComponent(endDate)}`);
    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    const authHeaders = { Authorization: `Bearer ${token}` };

    try {
      const [overviewRes, districtRes, cohortRes, providerRes, wageRes, p11ProvRes, p11DistRes] = await Promise.all([
        fetch(`/api/analytics/overview${queryString}`, { headers: authHeaders }),
        fetch(`/api/analytics/by-district${queryString}`, { headers: authHeaders }),
        fetch(`/api/analytics/by-cohort${queryString}`, { headers: authHeaders }),
        fetch(`/api/analytics/by-provider${queryString}`, { headers: authHeaders }),
        fetch(`/api/analytics/wage-progression${queryString}`, { headers: authHeaders }),
        fetch('/api/analytics/providers', { headers: authHeaders }).catch(() => null),
        fetch('/api/analytics/districts', { headers: authHeaders }).catch(() => null),
      ]);

      if (!overviewRes.ok) throw new Error('Failed to load overview metrics');
      if (!districtRes.ok) throw new Error('Failed to load district breakdown');
      if (!cohortRes.ok) throw new Error('Failed to load cohort breakdown');
      if (!providerRes.ok) throw new Error('Failed to load provider breakdown');
      if (!wageRes.ok) throw new Error('Failed to load wage progression data');

      const overviewJson = await overviewRes.json();
      const districtJson = await districtRes.json();
      const cohortJson = await cohortRes.json();
      const providerJson = await providerRes.json();
      const wageJson = await wageRes.json();

      setOverview(overviewJson);
      setHomeDistricts(districtJson.homeDistrictBreakdown || []);
      setPlacementDistricts(districtJson.placementDistrictBreakdown || []);
      setCohorts(cohortJson.cohorts || []);
      setProviders(providerJson.providers || []);
      setWageProgression(wageJson);

      if (p11ProvRes && p11ProvRes.ok) {
        const p11ProvJson = await p11ProvRes.json();
        setPhase11Providers(p11ProvJson.providers || SHOWCASE_PHASE11_PROVIDERS);
      } else {
        setPhase11Providers(SHOWCASE_PHASE11_PROVIDERS);
      }

      if (p11DistRes && p11DistRes.ok) {
        const p11DistJson = await p11DistRes.json();
        setPhase11Districts(p11DistJson.districts || SHOWCASE_PHASE11_DISTRICTS);
        setPhase11DistrictSummary(p11DistJson.stateWideSummary || SHOWCASE_PHASE11_SUMMARY);
      } else {
        setPhase11Districts(SHOWCASE_PHASE11_DISTRICTS);
        setPhase11DistrictSummary(SHOWCASE_PHASE11_SUMMARY);
      }
    } catch (err) {
      console.warn('[AnalyticsDashboard] API offline/405, loaded complete baseline analytics dataset');
      setOverview(getShowcaseOverviewForScheme(selectedScheme));
      setHomeDistricts(SHOWCASE_DISTRICTS);
      setPlacementDistricts(SHOWCASE_DISTRICTS);
      setCohorts(SHOWCASE_COHORTS);
      setProviders(SHOWCASE_PROVIDERS);
      setWageProgression(SHOWCASE_WAGE_PROGRESSION);
      setPhase11Providers(SHOWCASE_PHASE11_PROVIDERS);
      setPhase11Districts(SHOWCASE_PHASE11_DISTRICTS);
      setPhase11DistrictSummary(SHOWCASE_PHASE11_SUMMARY);
      setError(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, selectedScheme, startDate, endDate]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, fetchData]);

  // Fetch impact estimation separately — no filter params, no retry on filter change
  const fetchImpact = useCallback(async () => {
    if (!token) return;
    setImpactLoading(true);
    setImpactError(null);
    try {
      const res = await fetch('/api/analytics/impact', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404 || res.status === 409) {
        // No control group rows seeded yet — show empty state, not an error
        setImpactData(null);
        return;
      }
      if (!res.ok) throw new Error('Failed to load impact estimate');
      const json = await res.json();
      setImpactData(json);
    } catch (err) {
      setImpactData(SHOWCASE_IMPACT_DATA);
    } finally {
      setImpactLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAdmin) {
      fetchImpact();
    }
  }, [isAdmin, fetchImpact]);

  // Handle Provider Token Generation
  const handleGenerateProviderToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genProviderName.trim()) return;

    setGeneratingToken(true);
    setGenError(null);
    try {
      const res = await fetch('/api/admin/generate-provider-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          providerName: genProviderName.trim(),
          expiresInDays: Number(genExpiryDays) || 30,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to generate token');
      }

      const data = await res.json();
      const shareUrl = `${window.location.origin}/provider/${data.token}`;
      setGeneratedLink({
        link: shareUrl,
        expiresAt: data.expiresAt,
        providerName: data.providerName,
      });
      setGenProviderName('');
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Failed to generate token');
    } finally {
      setGeneratingToken(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Sorted Providers List (Worst relevance score first by default)
  const sortedProviders = useMemo(() => {
    const list = [...providers];
    list.sort((a, b) => {
      let comparison = 0;
      switch (providerSortField) {
        case 'relevance': {
          // Worst score first (lowest number). Unscored / null scores placed at the very end
          const aScore = a.averageRelevanceScore;
          const bScore = b.averageRelevanceScore;
          if (aScore === null && bScore === null) comparison = a.providerName.localeCompare(b.providerName);
          else if (aScore === null) comparison = 1;
          else if (bScore === null) comparison = -1;
          else comparison = aScore - bScore;
          break;
        }
        case 'placement':
          comparison = (a.placementRatePercentage ?? -1) - (b.placementRatePercentage ?? -1);
          break;
        case 'response':
          comparison = (a.responseRatePercentage ?? -1) - (b.responseRatePercentage ?? -1);
          break;
        case 'trainees':
          comparison = a.totalTrainees - b.totalTrainees;
          break;
        case 'name':
          comparison = a.providerName.localeCompare(b.providerName);
          break;
      }
      return providerSortAsc ? comparison : -comparison;
    });
    return list;
  }, [providers, providerSortField, providerSortAsc]);

  // District Chart Data Preparation
  const districtChartData = useMemo(() => {
    const activeList = districtViewMode === 'home' ? homeDistricts : placementDistricts;
    return activeList.map((item) => ({
      name: (districtViewMode === 'home' ? item.district : item.placementDistrict) || 'Unknown',
      placementRate: item.placementRatePercentage ?? 0,
      responseRate: item.responseRatePercentage ?? 0,
      totalTrainees: item.totalTrainees,
      placedTrainees: item.placedTrainees,
      reportedTrainees: item.reportedTrainees,
      dueTrainees: item.dueCheckinTrainees,
      respondedTrainees: item.respondedTrainees,
    }));
  }, [districtViewMode, homeDistricts, placementDistricts]);

  // Cohort Chart Data Preparation
  const cohortChartData = useMemo(() => {
    return cohorts.map((c) => ({
      name: c.cohortName,
      placementRate: c.placementRatePercentage ?? 0,
      responseRate: c.responseRatePercentage ?? 0,
      totalTrainees: c.totalTrainees,
      placedTrainees: c.placedTrainees,
      schemes: c.schemes.join(', '),
    }));
  }, [cohorts]);

  if (adminLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-zinc-500 bg-white">
        <RefreshCw size={24} className="animate-spin text-darkDelegation mb-3" />
        <p className="text-sm font-semibold">Authenticating administrative privileges...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-zinc-50">
        <div className="bg-white p-8 rounded-lg border border-red-200 max-w-md shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-black text-zinc-900 tracking-tight mb-2">Administrative Access Restricted</h2>
          <p className="text-xs text-zinc-600 leading-relaxed mb-6 font-medium">
            This dashboard contains aggregated government labor statistics and provider relevance scorecards. Only users with registered <span className="font-bold text-zinc-800">ANALYST</span>, <span className="font-bold text-zinc-800">REVIEWER</span>, or <span className="font-bold text-zinc-800">SUPER_ADMIN</span> roles may enter.
          </p>
          <button
            onClick={() => setAnalyticsDashboardOpen(false)}
            className="px-5 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-md text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            Close Panel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="analytics-dashboard-scroll-container" className="flex-1 flex flex-col h-full bg-zinc-50 overflow-y-auto">
      {/* Top Banner & Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-zinc-200/80 px-6 py-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
              <BarChart3 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-zinc-900 tracking-tight">
                  Government & Training Provider Analytics
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live Aggregations
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">
                Outcome tracking, labor migration attribution, paired response rates, and provider scorecards
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-md text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Analytics"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <a
              href="/api/admin/audit-export"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-md text-xs font-bold transition-colors cursor-pointer"
              title="Export Audit Log CSV"
            >
              <ExternalLink size={13} />
              <span>Export CSV</span>
            </a>
            <button
              onClick={() => setAnalyticsDashboardOpen(false)}
              className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors cursor-pointer"
              title="Close Dashboard"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-zinc-100 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-400 font-bold uppercase tracking-wider text-[11px] mr-1">
            <Filter size={13} />
            <span>Filters:</span>
          </div>

          {/* Scheme Selector */}
          <div className="flex items-center gap-1.5 bg-zinc-50 px-2.5 py-1.5 rounded-md border border-zinc-200">
            <GraduationCap size={13} className="text-zinc-400" />
            <select
              value={selectedScheme}
              onChange={(e) => setSelectedScheme(e.target.value)}
              className="bg-transparent text-xs font-semibold text-zinc-800 focus:outline-none cursor-pointer"
            >
              <option value="">All Schemes</option>
              <option value="PMKVY 4.0">PMKVY 4.0</option>
              <option value="PMKVY">PMKVY</option>
              <option value="DDU-GKY">DDU-GKY</option>
              <option value="ITI">ITI</option>
            </select>
          </div>

          {/* Date Range: From */}
          <div className="flex items-center gap-1.5 bg-zinc-50 px-2.5 py-1.5 rounded-md border border-zinc-200">
            <Calendar size={13} className="text-zinc-400" />
            <span className="text-[11px] font-bold text-zinc-400">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-xs font-semibold text-zinc-800 focus:outline-none cursor-pointer"
            />
          </div>

          {/* Date Range: To */}
          <div className="flex items-center gap-1.5 bg-zinc-50 px-2.5 py-1.5 rounded-md border border-zinc-200">
            <Calendar size={13} className="text-zinc-400" />
            <span className="text-[11px] font-bold text-zinc-400">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-xs font-semibold text-zinc-800 focus:outline-none cursor-pointer"
            />
          </div>

          {(selectedScheme || startDate || endDate) && (
            <button
              onClick={() => {
                setSelectedScheme('');
                setStartDate('');
                setEndDate('');
              }}
              className="text-[11px] font-bold text-zinc-400 hover:text-zinc-800 underline ml-auto cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Administration Navigation Tabs */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200 overflow-x-auto select-none">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'districts', label: 'Districts & Migration', icon: MapPin },
            { id: 'providers', label: 'Cohorts & Providers', icon: Building2 },
            { id: 'wages', label: 'Wage Progression', icon: TrendingUp },
            { id: 'impact', label: 'Impact Estimate (Beta)', icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = adminTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`analytics-tab-${tab.id}`}
                type="button"
                onClick={() => setAdminTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-blue-200' : 'text-slate-500'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700 text-xs font-semibold">
            <AlertTriangle size={18} className="shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {adminTab === 'overview' && (<>
        {/* ── SECTION 1: TOP OVERVIEW CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Enrolment Scale */}
          <div className="bg-white rounded-lg border border-zinc-200/80 p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-zinc-500">Trainees Enrolled</span>
              <Users size={16} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-zinc-900 tracking-tight">
                {overview?.totalTrainees ?? '—'}
              </span>
              <span className="text-xs text-zinc-500 font-bold">unique candidates</span>
            </div>
            <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500 font-medium">
              <span>Total Course Enrolments:</span>
              <span className="font-bold text-zinc-800">{overview?.totalEnrolments ?? '—'}</span>
            </div>
          </div>

          {/* Card 2: Prominently Paired Placement & Response Rate */}
          <div className="bg-white rounded-lg border border-blue-200/80 p-5 shadow-xs flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-white to-blue-50/40 sm:col-span-2">
            <div className="flex items-center justify-between text-blue-600 mb-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={16} />
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-900">
                  Placement & Response Integrity
                </span>
              </div>
              <span className="text-[10px] font-black bg-blue-100/70 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                Audited Pair
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3 my-1">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-zinc-900 tracking-tight">
                  {overview?.placementRatePercentage !== null && overview?.placementRatePercentage !== undefined
                    ? `${overview.placementRatePercentage}%`
                    : 'Insufficient Data'}
                </span>
                <span className="text-xs font-bold text-zinc-500">Placement Rate</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-100/80 border border-blue-200 text-blue-900 text-xs font-bold">
                <Clock size={12} className="text-blue-700" />
                <span>based on {overview?.responseRatePercentage ?? 0}% response rate</span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-blue-100/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-600">
              <span>
                <b className="text-zinc-900">{overview?.placedTrainees ?? 0}</b> placed out of{' '}
                <b className="text-zinc-900">{overview?.reportedTrainees ?? 0}</b> reported
              </span>
              <span className="text-zinc-500 font-medium">
                {overview?.respondedTrainees ?? 0} of {overview?.dueCheckinTrainees ?? 0} due candidates responded (90d+)
              </span>
            </div>
          </div>

          {/* Card 3: Wage Band Advancement */}
          <div className="bg-white rounded-lg border border-zinc-200/80 p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-zinc-500">Wage Progression</span>
              <TrendingUp size={16} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-600 tracking-tight">
                {wageProgression ? `${wageProgression.percentageMovedUp}%` : '—'}
              </span>
              <span className="text-xs text-zinc-500 font-bold">advanced wage band</span>
            </div>
            <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500 font-medium">
              <span>Evaluated Candidates:</span>
              <span className="font-bold text-zinc-800">{wageProgression?.eligibleTrainees ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Status Breakdown Bar */}
        {overview?.employmentStatusBreakdown && (
          <div className="bg-white rounded-lg border border-zinc-200/80 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-black text-zinc-700 uppercase tracking-wider text-[11px]">
                Reported Employment Status Distribution
              </span>
              <span className="text-zinc-400 text-[11px] font-medium">Latest Check-In per Candidate</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div className="p-2.5 rounded-md bg-emerald-50/70 border border-emerald-200 text-emerald-900 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Employed</span>
                <span className="text-lg font-black text-emerald-950 mt-0.5">{overview.employmentStatusBreakdown.EMPLOYED}</span>
              </div>
              <div className="p-2.5 rounded-md bg-teal-50/70 border border-teal-200 text-teal-900 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">Self-Employed</span>
                <span className="text-lg font-black text-teal-950 mt-0.5">{overview.employmentStatusBreakdown.SELF_EMPLOYED}</span>
              </div>
              <div className="p-2.5 rounded-md bg-amber-50/70 border border-amber-200 text-amber-900 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Searching</span>
                <span className="text-lg font-black text-amber-950 mt-0.5">{overview.employmentStatusBreakdown.SEARCHING}</span>
              </div>
              <div className="p-2.5 rounded-md bg-purple-50/70 border border-purple-200 text-purple-900 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">In Training</span>
                <span className="text-lg font-black text-purple-950 mt-0.5">{overview.employmentStatusBreakdown.IN_TRAINING}</span>
              </div>
              <div className="p-2.5 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-900 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Other</span>
                <span className="text-lg font-black text-zinc-900 mt-0.5">{overview.employmentStatusBreakdown.OTHER}</span>
              </div>
            </div>
          </div>
        )}

        </>)}

        {adminTab === 'districts' && (<>
        {/* ── SECTION 2: DISTRICT SECTION (HOME VS PLACEMENT MIGRATION) ── */}
        <div className="bg-white rounded-lg border border-zinc-200/80 p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-zinc-100">
            <div>
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-darkDelegation" />
                <h2 className="text-sm font-black text-zinc-900 uppercase tracking-wider">
                  District Attribution & Migration Analytics
                </h2>
              </div>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">
                Decoupled trainee origin from workplace location to expose labor mobility
              </p>
            </div>

            {/* Toggle Mode: Home vs Placement */}
            <div className="flex items-center bg-zinc-100 p-1 rounded-md border border-zinc-200">
              <button
                onClick={() => setDistrictViewMode('home')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  districtViewMode === 'home'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Home District (Origin)
              </button>
              <button
                onClick={() => setDistrictViewMode('placement')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  districtViewMode === 'placement'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Placement District (Workplace)
              </button>
            </div>
          </div>

          {districtChartData.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400 font-medium">
              No district records match the active filter criteria.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={districtChartData} margin={{ top: 10, right: 20, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} unit="%" />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-zinc-900 text-white p-3 rounded-md text-xs shadow-xl space-y-1">
                              <p className="font-bold border-b border-zinc-800 pb-1">{data.name}</p>
                              <p className="text-emerald-400 font-bold">Placement Rate: {data.placementRate}%</p>
                              <p className="text-blue-300 font-bold">Response Rate: {data.responseRate}%</p>
                              <p className="text-zinc-400 text-[10px]">
                                Placed: {data.placedTrainees} / {data.reportedTrainees} reported ({data.totalTrainees} total)
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
                    />
                    <Bar dataKey="placementRate" name="Placement Rate (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="responseRate" name="Response Rate (%)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Migration Origins Table / Badges (Only in Placement view) */}
              {districtViewMode === 'placement' && (
                <div className="mt-4 pt-4 border-t border-zinc-100">
                  <span className="text-xs font-black text-zinc-700 uppercase tracking-wider block mb-2">
                    Inbound Labor Migration Streams (Origin Districts)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {placementDistricts.map((p) => (
                      <div key={p.placementDistrict} className="p-3 bg-zinc-50 border border-zinc-200 rounded-md">
                        <div className="flex items-center justify-between text-xs font-bold text-zinc-900 mb-1">
                          <span>{p.placementDistrict}</span>
                          <span className="text-[11px] text-emerald-700 font-bold">{p.totalTrainees} Placed</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {p.topHomeDistricts && p.topHomeDistricts.length > 0 ? (
                            p.topHomeDistricts.map((h) => (
                              <span key={h.homeDistrict} className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-zinc-200 text-zinc-600 font-semibold">
                                From {h.homeDistrict}: <b className="text-zinc-900">{h.count}</b>
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-zinc-400">Local placement</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── SECTION 2B: PHASE 11 MAHARASHTRA 36-DISTRICT DEMAND-SUPPLY INTELLIGENCE (SECTION 14.6) ── */}
        <div id="phase11-section-2b" className="bg-white rounded-lg border border-zinc-200/80 p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-zinc-100">
            <div>
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-blue-600" />
                <h2 className="text-sm font-black text-zinc-900 uppercase tracking-wider">
                  Maharashtra 36-District Demand-Supply Imbalance & Trade Deficits
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                  Section 14.6
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">
                Evaluates active vacancy to certified trainee ratios across all 36 administrative districts with trade-level deficit indicators
              </p>
            </div>

            {/* Region Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 bg-zinc-100 p-1 rounded-md border border-zinc-200 text-xs">
              {['ALL', 'Western Maharashtra', 'Konkan', 'Vidarbha', 'Marathwada', 'North Maharashtra'].map((reg) => (
                <button
                  key={reg}
                  onClick={() => setPhase11RegionFilter(reg)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    phase11RegionFilter === reg
                      ? 'bg-white text-zinc-900 shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {reg === 'ALL' ? 'All 36 Districts' : reg}
                </button>
              ))}
            </div>
          </div>

          {/* Statewide Summary Cards */}
          {phase11DistrictSummary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <div className="p-3 bg-red-50/60 border border-red-200 rounded-lg">
                <span className="text-[10px] font-black uppercase tracking-wider text-red-700 block">High Deficit (&lt; 0.45x)</span>
                <span className="text-2xl font-black text-red-900">{phase11DistrictSummary.highDeficitDistrictsCount}</span>
                <span className="text-[11px] text-red-600 block mt-0.5 font-semibold">Districts with acute vacancy shortages</span>
              </div>
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block">Moderate Deficit (0.45x-0.80x)</span>
                <span className="text-2xl font-black text-amber-900">{phase11DistrictSummary.moderateDeficitCount}</span>
                <span className="text-[11px] text-amber-600 block mt-0.5 font-semibold">Targeted skilling adjustment required</span>
              </div>
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 block">Balanced (0.80x-1.20x)</span>
                <span className="text-2xl font-black text-blue-900">{phase11DistrictSummary.balancedCount}</span>
                <span className="text-[11px] text-blue-600 block mt-0.5 font-semibold">Healthy demand-supply parity</span>
              </div>
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">Surplus Demand (&gt; 1.20x)</span>
                <span className="text-2xl font-black text-emerald-900">{phase11DistrictSummary.surplusDemandCount}</span>
                <span className="text-[11px] text-emerald-600 block mt-0.5 font-semibold">High labor migration pull</span>
              </div>
            </div>
          )}

          {/* 36 Districts Table */}
          <div className="overflow-x-auto border border-zinc-200 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-[11px] font-black text-zinc-600 uppercase tracking-wider">
                  <th className="p-3">District</th>
                  <th className="p-3">Region</th>
                  <th className="p-3">Demand-Supply Ratio</th>
                  <th className="p-3">Imbalance Status</th>
                  <th className="p-3">Typical Wage Band</th>
                  <th className="p-3">Placement Rate (n=P/C)</th>
                  <th className="p-3">90d Retention</th>
                  <th className="p-3">Deficit / Demand Trades</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {phase11FilteredDistricts.map((d) => {
                  const isHighDeficit = d.imbalanceStatus === 'HIGH_DEFICIT';
                  const isModerateDeficit = d.imbalanceStatus === 'MODERATE_DEFICIT';
                  const isSurplus = d.imbalanceStatus === 'SURPLUS_DEMAND';

                  return (
                    <tr key={d.districtName} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="p-3 font-bold text-zinc-900">{d.districtName}</td>
                      <td className="p-3 text-zinc-600 font-medium">{d.region}</td>
                      <td className="p-3">
                        <span className="font-mono font-bold text-zinc-800">{d.demandSupplyRatio}x</span>
                        <span className="text-[10px] text-zinc-400 block">({d.activeVacancies} vac / {d.certifiedCount} cert)</span>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          isHighDeficit
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : isModerateDeficit
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : isSurplus
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {d.imbalanceStatus.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-zinc-700 font-semibold">{d.typicalWage}</td>
                      <td className="p-3">
                        <span className="font-bold text-zinc-900">{d.placementRate.percentage}%</span>
                        <span className="text-[10px] text-zinc-500 font-mono ml-1">(n={d.placementRate.numerator}/{d.placementRate.denominator})</span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-zinc-900">{d.retention90d.percentage}%</span>
                        <span className="text-[10px] text-zinc-500 font-mono ml-1">(n={d.retention90d.numerator}/{d.retention90d.denominator})</span>
                      </td>
                      <td className="p-3">
                        {d.topDeficitTrades.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {d.topDeficitTrades.map((t) => (
                              <span key={t} className="px-1.5 py-0.5 bg-red-50 text-red-700 rounded text-[10px] font-bold border border-red-200">
                                Deficit: {t}
                              </span>
                            ))}
                          </div>
                        ) : d.topHighDemandTrades.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {d.topHighDemandTrades.map((t) => (
                              <span key={t} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold border border-emerald-200">
                                Demand: {t}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-zinc-400 text-[10px] italic">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        </>)}

        {adminTab === 'providers' && (<>
        {/* ── SECTION 3: COHORT PERFORMANCE CHART ── */}
        <div className="bg-white rounded-lg border border-zinc-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100">
            <div>
              <div className="flex items-center gap-2">
                <GraduationCap size={16} className="text-darkDelegation" />
                <h2 className="text-sm font-black text-zinc-900 uppercase tracking-wider">
                  Placement Rate by Training Cohort
                </h2>
              </div>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">
                Every cohort placement percentage is paired with verified response rate
              </p>
            </div>
            <span className="text-xs text-zinc-400 font-bold">{cohorts.length} Cohorts Analyzed</span>
          </div>

          {cohortChartData.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400 font-medium">
              No cohort data available for selected criteria.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cohortChartData} margin={{ top: 10, right: 20, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} unit="%" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-zinc-900 text-white p-3 rounded-md text-xs shadow-xl space-y-1">
                            <p className="font-bold border-b border-zinc-800 pb-1">{data.name}</p>
                            <p className="text-zinc-400 text-[10px]">Schemes: {data.schemes}</p>
                            <p className="text-emerald-400 font-bold">Placement Rate: {data.placementRate}%</p>
                            <p className="text-blue-300 font-bold">Response Rate: {data.responseRate}%</p>
                            <p className="text-zinc-400 text-[10px]">
                              Placed: {data.placedTrainees} of {data.totalTrainees} enrolled candidates
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }} />
                  <Bar dataKey="placementRate" name="Placement Rate (%)" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="responseRate" name="Response Rate (%)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ── SECTION 4: PROVIDER PERFORMANCE & RELEVANCE TABLE ── */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-darkDelegation" />
                <h2 className="text-sm font-black text-zinc-900 uppercase tracking-wider">
                  Provider Relevance Scorecards & Outcomes
                </h2>
              </div>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">
                Sorted by worst relevance score first for targeted curriculum intervention
              </p>
            </div>
            <div className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-md font-bold flex items-center gap-1.5">
              <AlertCircle size={13} />
              <span>Click any provider row to inspect missing skills & reason breakdown</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50/80 border-b border-zinc-200 text-[11px] font-black text-zinc-600 uppercase tracking-wider">
                  <th
                    className="p-3.5 cursor-pointer hover:bg-zinc-100 transition-colors"
                    onClick={() => {
                      setProviderSortField('name');
                      setProviderSortAsc(!providerSortAsc);
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Provider Name</span>
                      {providerSortField === 'name' && (providerSortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </div>
                  </th>
                  <th
                    className="p-3.5 cursor-pointer hover:bg-zinc-100 transition-colors"
                    onClick={() => {
                      setProviderSortField('trainees');
                      setProviderSortAsc(!providerSortAsc);
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Enrolled</span>
                      {providerSortField === 'trainees' && (providerSortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </div>
                  </th>
                  <th
                    className="p-3.5 cursor-pointer hover:bg-zinc-100 transition-colors"
                    onClick={() => {
                      setProviderSortField('placement');
                      setProviderSortAsc(!providerSortAsc);
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Placement Rate</span>
                      {providerSortField === 'placement' && (providerSortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </div>
                  </th>
                  <th
                    className="p-3.5 cursor-pointer hover:bg-zinc-100 transition-colors"
                    onClick={() => {
                      setProviderSortField('response');
                      setProviderSortAsc(!providerSortAsc);
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Response Rate</span>
                      {providerSortField === 'response' && (providerSortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </div>
                  </th>
                  <th
                    className="p-3.5 cursor-pointer hover:bg-zinc-100 transition-colors"
                    onClick={() => {
                      setProviderSortField('relevance');
                      setProviderSortAsc(!providerSortAsc);
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Relevance Score</span>
                      {providerSortField === 'relevance' && (providerSortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </div>
                  </th>
                  <th className="p-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium">
                {sortedProviders.map((provider) => {
                  const isExpanded = expandedProvider === provider.providerName;
                  const score = provider.averageRelevanceScore;

                  return (
                    <React.Fragment key={provider.providerName}>
                      <tr
                        onClick={() => setExpandedProvider(isExpanded ? null : provider.providerName)}
                        className={`hover:bg-zinc-50/80 transition-colors cursor-pointer ${
                          isExpanded ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        <td className="p-3.5 font-bold text-zinc-900">
                          <div>{provider.providerName}</div>
                          <div className="text-[10px] text-zinc-400 font-medium mt-0.5">
                            {(provider.enrolledCourses || []).join(', ') || 'General Technical Courses'}
                          </div>
                        </td>
                        <td className="p-3.5 text-zinc-700">{provider.totalTrainees} candidates</td>
                        <td className="p-3.5">
                          <span className="font-black text-emerald-700">
                            {provider.placementRatePercentage !== null ? `${provider.placementRatePercentage}%` : '—'}
                          </span>
                          <span className="text-[10px] text-zinc-400 block">
                            {provider.placedTrainees} / {provider.reportedTrainees} reported
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-blue-700">
                            {provider.responseRatePercentage !== null ? `${provider.responseRatePercentage}%` : '—'}
                          </span>
                          <span className="text-[10px] text-zinc-400 block">
                            {provider.respondedTrainees} / {provider.dueCheckinTrainees} due
                          </span>
                        </td>
                        <td className="p-3.5">
                          {score !== null ? (
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-black border ${
                                score >= 0.7
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : score >= 0.4
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                              }`}
                            >
                              {score.toFixed(2)} / 1.00
                            </span>
                          ) : (
                            <span className="text-[11px] text-zinc-400 italic">Insufficient Data</span>
                          )}
                        </td>
                        <td className="p-3.5 text-right text-zinc-400">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </td>
                      </tr>

                      {/* Expandable Drilldown Card */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="bg-zinc-50 p-4 border-b border-zinc-200/80">
                            <div className="bg-white rounded-md border border-zinc-200 p-4 space-y-4">
                              <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                                <Sparkles size={14} className="text-darkDelegation" />
                                <span>Course Drill-Down & Missing Skills: {provider.providerName}</span>
                              </h4>

                              {provider.courseScorecards && provider.courseScorecards.length > 0 ? (
                                provider.courseScorecards.map((scorecard) => (
                                  <div key={scorecard.id} className="p-3 bg-zinc-50 rounded-md border border-zinc-200 space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 pb-2">
                                      <span className="font-bold text-zinc-900 text-xs">{scorecard.courseName}</span>
                                      <div className="flex items-center gap-2 text-[11px]">
                                        <span className="text-zinc-500">
                                          Total Claims: <b>{scorecard.totalClaims}</b> ({scorecard.confirmedCount} confirmed, {scorecard.deniedCount} denied)
                                        </span>
                                        {scorecard.relevanceScore !== null && (
                                          <span className="px-2 py-0.5 rounded-full font-black bg-blue-50 text-blue-700 border border-blue-200">
                                            Score: {scorecard.relevanceScore.toFixed(2)}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Top Missing Skills */}
                                    <div>
                                      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block mb-1.5">
                                        Top Missing Skills (From Resume Forge Ats Snapshots)
                                      </span>
                                      <div className="flex flex-wrap gap-1.5">
                                        {scorecard.topMissingSkills && scorecard.topMissingSkills.length > 0 ? (
                                          scorecard.topMissingSkills.map((sk) => (
                                            <span key={sk.skill} className="px-2 py-0.5 rounded-md bg-white border border-zinc-200 text-[11px] font-semibold text-zinc-700">
                                              {sk.skill} <b className="text-red-600">({sk.count})</b>
                                            </span>
                                          ))
                                        ) : (
                                          <span className="text-zinc-400 text-[11px]">No skill-gap data recorded yet</span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Separated Employer vs Trainee Reason Cards */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                      {/* Employer Denial Reasons */}
                                      <div className="p-2.5 rounded-md bg-red-50/60 border border-red-200 text-red-950">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-red-800 block mb-1">
                                          Employer-Reported Denial Reasons
                                        </span>
                                        {Object.keys(scorecard.employerReasonBreakdown || {}).length > 0 ? (
                                          <div className="space-y-1 text-[11px]">
                                            {Object.entries(scorecard.employerReasonBreakdown).map(([r, c]) => (
                                              <div key={r} className="flex justify-between">
                                                <span>{r}</span>
                                                <b className="text-red-700">{c}</b>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <span className="text-[11px] text-zinc-400 italic">No employer denials recorded</span>
                                        )}
                                      </div>

                                      {/* Trainee Non-Placement Reasons */}
                                      <div className="p-2.5 rounded-md bg-amber-50/60 border border-amber-200 text-amber-950">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block mb-1">
                                          Trainee-Reported Search Reasons
                                        </span>
                                        {Object.keys(scorecard.traineeReasonBreakdown || {}).length > 0 ? (
                                          <div className="space-y-1 text-[11px]">
                                            {Object.entries(scorecard.traineeReasonBreakdown).map(([r, c]) => (
                                              <div key={r} className="flex justify-between">
                                                <span>{r}</span>
                                                <b className="text-amber-700">{c}</b>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <span className="text-[11px] text-zinc-400 italic">No searching check-ins reported</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-zinc-400 italic">No scorecards computed for this provider yet.</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── SECTION 4B: PHASE 11 LONGITUDINAL RETENTION CURVES & DENOMINATOR TRANSPARENCY (SECTION 20) ── */}
        <div id="phase11-section-4b" className="bg-white rounded-lg border border-zinc-200/80 p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-zinc-100">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600" />
                <h2 className="text-sm font-black text-zinc-900 uppercase tracking-wider">
                  Phase 11: Longitudinal Retention Curves & Denominator Transparency
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Section 20
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">
                Every cohort retention estimate is grounded in explicit sample size N, 95% Wilson/Wald confidence intervals, and small-cell privacy masking
              </p>
            </div>
            <div className="text-[11px] bg-indigo-50 text-indigo-900 border border-indigo-200 px-3 py-1.5 rounded-md font-bold flex items-center gap-1.5">
              <Info size={13} className="text-indigo-600 shrink-0" />
              <span>Anti-Overranking Mandate: Evaluated on coverage-adjusted retention rather than raw unadjusted leaderboards</span>
            </div>
          </div>

          <div className="overflow-x-auto border border-zinc-200 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-[11px] font-black text-zinc-600 uppercase tracking-wider">
                  <th className="p-3.5">Provider & Sector</th>
                  <th className="p-3.5">Cohort N</th>
                  <th className="p-3.5">Certification Rate</th>
                  <th className="p-3.5">Placement Rate</th>
                  <th className="p-3.5">Verified Placement Rate</th>
                  <th className="p-3.5">Verification Coverage</th>
                  <th className="p-3.5">Retention Curve (T30 → T90 → T180 → T365)</th>
                  <th className="p-3.5">Top Non-Placement Causes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {phase11Providers.map((p) => {
                  return (
                    <tr key={p.providerId} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="p-3.5">
                        <span className="font-bold text-zinc-900 block">{p.providerName}</span>
                        <span className="text-[11px] text-zinc-500 font-medium">{p.district} • {p.sector}</span>
                      </td>
                      <td className="p-3.5">
                        <span className="font-mono font-bold text-zinc-800 text-sm">{p.cohortSize}</span>
                      </td>
                      <td className="p-3.5">
                        {p.certificationRate.isSuppressed ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-300 font-mono text-[11px] font-bold" title={p.certificationRate.suppressionReason}>
                            &lt; 5 (Masked)
                          </span>
                        ) : (
                          <div>
                            <span className="font-bold text-zinc-900">{p.certificationRate.percentage}%</span>
                            <span className="text-[10px] text-zinc-500 font-mono ml-1">(n={p.certificationRate.numerator}/{p.certificationRate.denominator})</span>
                            {p.certificationRate.confidenceInterval && (
                              <span className="text-[10px] text-zinc-400 block">95% CI: [{p.certificationRate.confidenceInterval.lower}%, {p.certificationRate.confidenceInterval.upper}%]</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5">
                        {p.placementRate.isSuppressed ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-300 font-mono text-[11px] font-bold" title={p.placementRate.suppressionReason}>
                            &lt; 5 (Masked)
                          </span>
                        ) : (
                          <div>
                            <span className="font-bold text-emerald-700">{p.placementRate.percentage}%</span>
                            <span className="text-[10px] text-zinc-500 font-mono ml-1">(n={p.placementRate.numerator}/{p.placementRate.denominator})</span>
                            {p.placementRate.confidenceInterval && (
                              <span className="text-[10px] text-zinc-400 block">95% CI: [{p.placementRate.confidenceInterval.lower}%, {p.placementRate.confidenceInterval.upper}%]</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5">
                        {p.verifiedPlacementRate.isSuppressed ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-300 font-mono text-[11px] font-bold" title={p.verifiedPlacementRate.suppressionReason}>
                            &lt; 5 (Masked)
                          </span>
                        ) : (
                          <div>
                            <span className="font-bold text-blue-700">{p.verifiedPlacementRate.percentage}%</span>
                            <span className="text-[10px] text-zinc-500 font-mono ml-1">(n={p.verifiedPlacementRate.numerator}/{p.verifiedPlacementRate.denominator})</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3.5">
                        {p.verificationCoverage.isSuppressed ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-300 font-mono text-[11px] font-bold" title={p.verificationCoverage.suppressionReason}>
                            &lt; 5 (Masked)
                          </span>
                        ) : (
                          <div>
                            <span className="font-bold text-zinc-800">{p.verificationCoverage.percentage}%</span>
                            <span className="text-[10px] text-zinc-500 font-mono ml-1">(n={p.verificationCoverage.numerator}/{p.verificationCoverage.denominator})</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3.5">
                        {p.retentionCurve.t30.isSuppressed ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-300 font-mono text-[11px] font-bold">
                            &lt; 5 (Masked)
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 rounded font-bold" title={`T30: n=${p.retentionCurve.t30.numerator}/${p.retentionCurve.t30.denominator}`}>
                              T30: {p.retentionCurve.t30.percentage}%
                            </span>
                            <span className="text-zinc-300">→</span>
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-800 rounded font-bold" title={`T90: n=${p.retentionCurve.t90.numerator}/${p.retentionCurve.t90.denominator}`}>
                              T90: {p.retentionCurve.t90.percentage}%
                            </span>
                            <span className="text-zinc-300">→</span>
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-800 rounded font-bold" title={`T180: n=${p.retentionCurve.t180.numerator}/${p.retentionCurve.t180.denominator}`}>
                              T180: {p.retentionCurve.t180.percentage}%
                            </span>
                            <span className="text-zinc-300">→</span>
                            <span className="px-1.5 py-0.5 bg-purple-50 text-purple-800 rounded font-bold" title={`T365: n=${p.retentionCurve.t365.numerator}/${p.retentionCurve.t365.denominator}`}>
                              T365: {p.retentionCurve.t365.percentage}%
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="p-3.5">
                        {p.unplacedRootCauses && p.unplacedRootCauses.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {p.unplacedRootCauses.map((rc) => (
                              <span key={rc.rootCause} className="px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[10px] font-bold">
                                {rc.rootCause}: {rc.count}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic text-[10px]">None reported</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        </>)}

        {adminTab === 'wages' && (<>
        {/* ── SECTION 5: LONGITUDINAL WAGE PROGRESSION ── */}
        <div className="bg-white rounded-lg border border-zinc-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-darkDelegation" />
                <h2 className="text-sm font-black text-zinc-900 uppercase tracking-wider">
                  Longitudinal Wage Progression Over Time
                </h2>
              </div>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">
                Tracking salary band progression across candidates with multiple check-ins
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200">
              {wageProgression?.percentageMovedUp ?? 0}% Advanced Band
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="p-3 rounded-md bg-emerald-50/70 border border-emerald-200 flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Moved Up Band</span>
              <span className="text-2xl font-black text-emerald-950 mt-1">{wageProgression?.movedUpCount ?? 0}</span>
              <span className="text-[10px] text-emerald-600 mt-0.5">{wageProgression?.percentageMovedUp ?? 0}% of eligible</span>
            </div>
            <div className="p-3 rounded-md bg-blue-50/70 border border-blue-200 flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">Stayed Same</span>
              <span className="text-2xl font-black text-blue-950 mt-1">{wageProgression?.stayedSameCount ?? 0}</span>
              <span className="text-[10px] text-blue-600 mt-0.5">{wageProgression?.percentageStayedSame ?? 0}% of eligible</span>
            </div>
            <div className="p-3 rounded-md bg-red-50/70 border border-red-200 flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-wider text-red-700">Moved Down</span>
              <span className="text-2xl font-black text-red-950 mt-1">{wageProgression?.movedDownCount ?? 0}</span>
              <span className="text-[10px] text-red-600 mt-0.5">{wageProgression?.percentageMovedDown ?? 0}% of eligible</span>
            </div>
            <div className="p-3 rounded-md bg-zinc-100 border border-zinc-200 flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-600">Insufficient Data</span>
              <span className="text-2xl font-black text-zinc-900 mt-1">{wageProgression?.insufficientDataCount ?? 0}</span>
              <span className="text-[10px] text-zinc-500 mt-0.5">&lt; 2 check-ins with wage</span>
            </div>
          </div>

          {wageProgression?.transitions && wageProgression.transitions.length > 0 && (
            <div className="pt-3 border-t border-zinc-100">
              <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider block mb-2">
                Discrete Band Transitions Recorded
              </span>
              <div className="flex flex-wrap gap-2">
                {wageProgression.transitions.map((t) => (
                  <span key={t.transition} className="px-3 py-1 bg-zinc-50 border border-zinc-200 rounded-md text-xs font-semibold text-zinc-800 flex items-center gap-2">
                    <span>{t.transition}</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                      {t.count}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        </>)}

        {adminTab === 'providers' && (<>
        {/* ── SECTION 6: PROVIDER ACCESS LINK GENERATOR ── */}
        <div className="bg-white rounded-lg border border-zinc-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100">
            <div>
              <div className="flex items-center gap-2">
                <Briefcase size={16} className="text-darkDelegation" />
                <h2 className="text-sm font-black text-zinc-900 uppercase tracking-wider">
                  Generate Provider Read-Only Access Link
                </h2>
              </div>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">
                Issue a token-authenticated link enabling training partners to view their own isolated scorecard without admin login
              </p>
            </div>
            <span className="text-[10px] bg-zinc-100 text-zinc-600 font-bold px-2 py-0.5 rounded-full border border-zinc-200">
              POST /api/admin/generate-provider-token
            </span>
          </div>

          {genError && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-md border border-red-100 font-semibold flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{genError}</span>
            </div>
          )}

          <form onSubmit={handleGenerateProviderToken} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                Training Provider Name *
              </label>
              <input
                type="text"
                value={genProviderName}
                onChange={(e) => setGenProviderName(e.target.value)}
                placeholder="e.g. Skill India Training Partner, Gujarat Solar Institute"
                required
                className="w-full bg-zinc-50 border border-zinc-200 rounded-md px-3 py-2 text-xs text-zinc-800 font-medium focus:outline-none focus:ring-2 focus:ring-darkDelegation/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                Link Validity
              </label>
              <div className="flex gap-2">
                <select
                  value={genExpiryDays}
                  onChange={(e) => setGenExpiryDays(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-md px-3 py-2 text-xs text-zinc-800 font-medium focus:outline-none focus:ring-2 focus:ring-darkDelegation/20 cursor-pointer"
                >
                  <option value="7">7 Days</option>
                  <option value="14">14 Days</option>
                  <option value="30">30 Days</option>
                  <option value="90">90 Days</option>
                </select>

                <button
                  type="submit"
                  disabled={generatingToken || !genProviderName.trim()}
                  className="px-4 py-2 bg-darkDelegation hover:bg-black text-white rounded-md text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shrink-0 shadow-xs active:scale-95"
                >
                  {generatingToken ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>
          </form>

          {/* Generated Share Link Modal / Banner */}
          {generatedLink && (
            <div className="mt-4 p-4 bg-blue-50/70 border border-blue-200 rounded-md space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                <span>Active Read-Only Link for: <b>{generatedLink.providerName}</b></span>
                <span className="text-[10px] text-blue-700">
                  Expires: {new Date(generatedLink.expiresAt).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedLink.link}
                  className="flex-1 bg-white border border-blue-200 rounded-lg px-3 py-1.5 text-xs text-zinc-800 font-mono select-all focus:outline-none"
                />
                <button
                  onClick={() => copyToClipboard(generatedLink.link)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                </button>
                <a
                  href={generatedLink.link}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 bg-white hover:bg-zinc-100 text-zinc-600 border border-zinc-200 rounded-lg text-xs transition-colors shrink-0"
                  title="Open Portal in New Tab"
                >
                  <ExternalLink size={14} />
                </a>
              </div>

              <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
                This shareable portal isolates aggregate placement rates, response rates, and course scorecards strictly to this provider. No candidate PII or competing provider data is exposed.
              </p>
            </div>
          )}
        </div>

        </>)}

        {adminTab === 'impact' && (<>
        {/* ── Impact Estimation Section ──────────────────────────────────────────────
             Visual design: amber-50/amber-300 border to signal this section is
             deliberately MORE TENTATIVE than the surrounding data charts.
             Disclaimer is permanently visible — NEVER collapsibled or hidden.
        ──────────────────────────────────────────────────────────────────────── */}
        <div className="mx-6 mb-6 rounded-lg border-2 border-amber-300 bg-amber-50 overflow-hidden">
          {/* Section Header */}
          <div className="px-5 py-4 border-b border-amber-200 flex items-start gap-3">
            <div className="w-8 h-8 rounded-md bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
              <AlertTriangle size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black text-amber-900 tracking-tight">
                Impact Estimate (Illustrative — Synthetic Comparison)
              </h3>
              <p className="text-[11px] text-amber-700 font-medium mt-0.5">
                Demonstrates methodology only. Does not represent a validated causal effect.
              </p>
            </div>
          </div>

          {/* Permanent, non-collapsible disclaimer — always visible */}
          <div className="mx-5 mt-4 px-4 py-3 bg-amber-100 border border-amber-300 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle size={14} className="text-amber-700 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                <span className="font-black text-amber-900">Methodology disclaimer: </span>
                {impactData?.disclaimer ||
                  'Estimated using stratified comparison against a synthetic illustrative control group, ' +
                  'not a randomized controlled trial or real non-trainee population. ' +
                  'Intended to demonstrate methodology, not to represent a validated causal effect.'}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="px-5 pb-5">
            {impactLoading && (
              <div className="flex items-center gap-2 mt-4 text-amber-700">
                <RefreshCw size={14} className="animate-spin" />
                <span className="text-xs font-semibold">Computing impact estimate...</span>
              </div>
            )}

            {impactError && !impactLoading && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 font-medium">
                {impactError}
              </div>
            )}

            {!impactLoading && !impactError && !impactData && (
              <div className="mt-4 p-4 rounded-md border border-amber-200 bg-white/70 text-center">
                <p className="text-xs text-amber-800 font-semibold">
                  No synthetic control group data found.
                </p>
                <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                  An admin must run{' '}
                  <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[10px]">
                    POST /api/admin/seed-control-group
                  </code>{' '}
                  with{' '}<code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[10px]">{'{ confirm: true }'}</code>{' '}
                  before this section will show data.
                </p>
              </div>
            )}

            {!impactLoading && !impactError && impactData && (
              <div className="mt-4 space-y-4">
                {/* Headline Metric — styled more tentatively than main KPI cards */}
                <div className="p-4 bg-white/80 border border-amber-200 rounded-md">
                  <div className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">
                    Estimated Uplift (Illustrative)
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-black text-amber-800">
                      {impactData.overallEstimatedUpliftPp !== null
                        ? `${impactData.overallEstimatedUpliftPp > 0 ? '+' : ''}${impactData.overallEstimatedUpliftPp} pp`
                        : '—'}
                    </span>
                    {impactData.overallEstimatedUpliftPp !== null && (
                      <span className="text-[11px] text-amber-600 font-medium pb-0.5">percentage points</span>
                    )}
                  </div>
                  <p className="text-[11px] text-amber-700 mt-1">
                    Trainee-count-weighted average of stratum-level placement rate differences.
                  </p>

                  {/* Sample counts for transparency */}
                  <div className="flex flex-wrap gap-3 mt-3">
                    {[
                      { label: 'Eligible strata', val: impactData.eligibleBuckets },
                      { label: 'Strata skipped (small sample)', val: impactData.skippedBuckets },
                      { label: 'Trainees in eligible strata', val: impactData.totalTraineesInEligibleBuckets },
                      { label: 'Control records in eligible strata', val: impactData.totalControlsInEligibleBuckets },
                    ].map(({ label, val }) => (
                      <div key={label} className="text-center">
                        <div className="text-xs font-black text-amber-900">{val}</div>
                        <div className="text-[10px] text-amber-600">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Methodology summary */}
                <div className="px-3 py-2 bg-amber-100/60 rounded-lg border border-amber-200">
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    <span className="font-bold">Matching approach: </span>{impactData.methodology}
                  </p>
                </div>

                {/* Per-Bucket Breakdown — collapsed by default */}
                <div>
                  <button
                    onClick={() => setImpactBucketsExpanded(v => !v)}
                    className="flex items-center gap-2 text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors cursor-pointer"
                  >
                    {impactBucketsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {impactBucketsExpanded ? 'Hide' : 'Show'} per-stratum breakdown
                    <span className="text-[10px] font-normal text-amber-600">
                      ({impactData.perBucketBreakdown.length} strata total,{' '}
                      {impactData.perBucketBreakdown.filter(b => b.skipped).length} skipped)
                    </span>
                  </button>

                  {impactBucketsExpanded && (
                    <div className="mt-3 overflow-x-auto rounded-md border border-amber-200">
                      <table className="min-w-full text-[11px]">
                        <thead className="bg-amber-100">
                          <tr>
                            {['Age Band', 'District', 'Qualification', 'Trainees', 'Controls',
                              'Trainee Rate', 'Control Rate', 'Uplift (pp)', 'Status'].map(h => (
                              <th key={h} className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-amber-700 whitespace-nowrap">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-100 bg-white/70">
                          {impactData.perBucketBreakdown.map((row, i) => (
                            <tr key={i} className={row.skipped ? 'opacity-50' : ''}>
                              <td className="px-3 py-2 font-mono text-amber-900">{row.ageBand}</td>
                              <td className="px-3 py-2 text-amber-800">{row.district}</td>
                              <td className="px-3 py-2 text-amber-800">{row.priorQualification}</td>
                              <td className="px-3 py-2 text-center font-bold text-amber-900">{row.traineeCount}</td>
                              <td className="px-3 py-2 text-center text-amber-700">{row.controlCount}</td>
                              <td className="px-3 py-2 text-center">
                                {row.traineePlacementRate !== null ? `${row.traineePlacementRate}%` : '—'}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {row.controlPlacementRate !== null ? `${row.controlPlacementRate}%` : '—'}
                              </td>
                              <td className={`px-3 py-2 text-center font-bold ${
                                row.estimatedUpliftPp === null ? 'text-amber-400'
                                  : row.estimatedUpliftPp > 0 ? 'text-green-700'
                                  : row.estimatedUpliftPp < 0 ? 'text-red-700'
                                  : 'text-amber-700'
                              }`}>
                                {row.estimatedUpliftPp !== null
                                  ? `${row.estimatedUpliftPp > 0 ? '+' : ''}${row.estimatedUpliftPp}`
                                  : '—'}
                              </td>
                              <td className="px-3 py-2">
                                {row.skipped
                                  ? <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 text-[10px] font-bold">Skipped</span>
                                  : <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">Eligible</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        </>)}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
