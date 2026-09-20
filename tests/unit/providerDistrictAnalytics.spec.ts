/**
 * FILE: tests/unit/providerDistrictAnalytics.spec.ts
 * PURPOSE: Unit tests for Phase 11 Provider & District Analytics Engine.
 * SPECIFICATION: Master Spec Section 14.6, 20 & 27 (Phase 11).
 */

import { test, expect } from '@playwright/test';
import {
  formatDenominatorMetric,
  computeProviderAnalytics,
  computeDistrictAnalytics,
  MAHARASHTRA_DISTRICTS,
} from '../../server/services/analyticsService.js';

test.describe('Phase 11: Provider & District Analytics Unit Tests', () => {
  test.describe('1. Denominator Transparency & Wilson/Wald Confidence Intervals (Section 20)', () => {
    test('computes exact percentage and 95% confidence intervals for standard cohorts', () => {
      const metric = formatDenominatorMetric(80, 100);
      expect(metric.isSuppressed).toBe(false);
      expect(metric.numerator).toBe(80);
      expect(metric.denominator).toBe(100);
      expect(metric.percentage).toBe(80.0);
      expect(metric.confidenceInterval).toBeDefined();
      expect(metric.confidenceInterval?.confidenceLevel).toBe('95%');
      expect(metric.confidenceInterval?.lower).toBeGreaterThanOrEqual(0);
      expect(metric.confidenceInterval?.upper).toBeLessThanOrEqual(100);
      expect(metric.confidenceInterval?.lower).toBeLessThan(metric.percentage!);
      expect(metric.confidenceInterval?.upper).toBeGreaterThan(metric.percentage!);
      expect(metric.displayValue).toContain('80% (n=80/100, 95% CI:');
    });

    test('strictly suppresses small cells where sample size N < 5', () => {
      const suppressedMetric = formatDenominatorMetric(2, 4);
      expect(suppressedMetric.isSuppressed).toBe(true);
      expect(suppressedMetric.displayValue).toBe('< 5');
      expect(suppressedMetric.numerator).toBeNull();
      expect(suppressedMetric.denominator).toBe(4);
      expect(suppressedMetric.percentage).toBeNull();
      expect(suppressedMetric.confidenceInterval).toBeNull();
      expect(suppressedMetric.suppressionReason).toContain('Small sample size');
    });

    test('does not suppress when sample size N is exactly at the threshold of 5', () => {
      const thresholdMetric = formatDenominatorMetric(3, 5);
      expect(thresholdMetric.isSuppressed).toBe(false);
      expect(thresholdMetric.percentage).toBe(60.0);
      expect(thresholdMetric.confidenceInterval).toBeDefined();
    });

    test('safely clamps numerator exceeding denominator or negative inputs', () => {
      const clampedHigh = formatDenominatorMetric(150, 100);
      expect(clampedHigh.numerator).toBe(100);
      expect(clampedHigh.percentage).toBe(100.0);

      const clampedNegative = formatDenominatorMetric(-10, 50);
      expect(clampedNegative.numerator).toBe(0);
      expect(clampedNegative.percentage).toBe(0.0);
    });

    test('handles zero denominator without throwing or returning NaN', () => {
      const zeroDenom = formatDenominatorMetric(0, 0);
      expect(zeroDenom.isSuppressed).toBe(true);
      expect(zeroDenom.denominator).toBe(0);
      expect(zeroDenom.percentage).toBeNull();
    });
  });

  test.describe('2. Provider Cohort Funnel & Longitudinal Retention (Section 20)', () => {
    test('computes complete cohort funnel and longitudinal retention curves', async () => {
      const report = await computeProviderAnalytics();
      expect(report.success).toBe(true);
      expect(report.antiOverrankingContract).toContain('Section 20: No raw leaderboards');
      expect(report.smallCellPolicy).toContain('Cells with N < 5 are suppressed');
      expect(report.count).toBeGreaterThan(0);

      const puneProvider = report.providers.find((p) => p.providerId === 'prov_pune_iti_01');
      expect(puneProvider).toBeDefined();
      expect(puneProvider?.district).toBe('Pune');
      expect(puneProvider?.cohortSize).toBe(240);

      // Denominator-grounded metrics
      expect(puneProvider?.certificationRate.isSuppressed).toBe(false);
      expect(puneProvider?.certificationRate.numerator).toBe(218);
      expect(puneProvider?.certificationRate.denominator).toBe(240);
      expect(puneProvider?.certificationRate.confidenceInterval?.confidenceLevel).toBe('95%');

      // Retention curve
      expect(puneProvider?.retentionCurve.t30.isSuppressed).toBe(false);
      expect(puneProvider?.retentionCurve.t90.isSuppressed).toBe(false);
      expect(puneProvider?.retentionCurve.t180.isSuppressed).toBe(false);
      expect(puneProvider?.retentionCurve.t365.isSuppressed).toBe(false);

      // Wage distribution and root causes
      expect(puneProvider?.wageDistribution['15K_TO_25K']).toBe(92);
      expect(puneProvider?.unplacedRootCauses.length).toBeGreaterThan(0);
    });

    test('demonstrates small-cell suppression on small provider cohort (Rural Tribal Cell)', async () => {
      const report = await computeProviderAnalytics();
      const ruralProvider = report.providers.find((p) => p.providerId === 'prov_gadchiroli_rural_05');
      expect(ruralProvider).toBeDefined();
      expect(ruralProvider?.cohortSize).toBe(4);

      // Suppressed metrics
      expect(ruralProvider?.certificationRate.isSuppressed).toBe(true);
      expect(ruralProvider?.certificationRate.displayValue).toBe('< 5');
      expect(ruralProvider?.placementRate.isSuppressed).toBe(true);
      expect(ruralProvider?.retentionCurve.t90.isSuppressed).toBe(true);
    });

    test('supports filtering by district and sector', async () => {
      const puneOnly = await computeProviderAnalytics({ district: 'Pune' });
      expect(puneOnly.providers.length).toBe(1);
      expect(puneOnly.providers[0].district).toBe('Pune');

      const healthcareOnly = await computeProviderAnalytics({ sector: 'Healthcare' });
      expect(healthcareOnly.providers.length).toBe(1);
      expect(healthcareOnly.providers[0].providerId).toBe('prov_thane_poly_04');
    });
  });

  test.describe('3. District Demand-Supply Intelligence (Section 14.6)', () => {
    test('covers all 36 Maharashtra administrative districts', async () => {
      expect(MAHARASHTRA_DISTRICTS.length).toBe(36);

      const districtReport = await computeDistrictAnalytics();
      expect(districtReport.success).toBe(true);
      expect(districtReport.state).toBe('Maharashtra');
      expect(districtReport.count).toBe(36);
      expect(districtReport.districts.length).toBe(36);
    });

    test('correctly categorizes demand-supply imbalance and trade deficits', async () => {
      const districtReport = await computeDistrictAnalytics();
      const summary = districtReport.stateWideSummary;

      expect(summary.totalDistricts).toBe(36);
      expect(summary.highDeficitDistrictsCount + summary.moderateDeficitCount + summary.balancedCount + summary.surplusDemandCount).toBe(36);

      // High deficit district check (Gadchiroli: 0.28 demand ratio)
      const gadchiroli = districtReport.districts.find((d) => d.districtName === 'Gadchiroli');
      expect(gadchiroli).toBeDefined();
      expect(gadchiroli?.imbalanceStatus).toBe('HIGH_DEFICIT');
      expect(gadchiroli?.topDeficitTrades.length).toBeGreaterThan(0);

      // Surplus demand district check (Mumbai Suburban: 1.30 demand ratio)
      const mumbaiSuburban = districtReport.districts.find((d) => d.districtName === 'Mumbai Suburban');
      expect(mumbaiSuburban).toBeDefined();
      expect(mumbaiSuburban?.imbalanceStatus).toBe('SURPLUS_DEMAND');
      expect(mumbaiSuburban?.topHighDemandTrades).toContain('Embedded Software Engineer');
    });

    test('supports filtering districts by region', async () => {
      const vidarbhaDistricts = await computeDistrictAnalytics({ region: 'Vidarbha' });
      expect(vidarbhaDistricts.count).toBeGreaterThan(0);
      vidarbhaDistricts.districts.forEach((d) => {
        expect(d.region).toBe('Vidarbha');
      });
    });
  });
});
