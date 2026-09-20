/**
 * Phase 18 Unit Test Suite: Data Quality & Anomaly Detection Engine
 * Specification: Sections 14.6, 15.2, 20, 27 Phase 18
 */

import { test, expect } from '@playwright/test'
import {
  evaluateTraineeDataQuality,
  initializeDemonstrationIssues,
  getDataQualityIssues,
  resolveDataQualityIssue,
  getDataQualitySummary
} from '../../server/services/dataQualityService.js'

test.describe('Phase 18: Data Quality & Anomaly Detection Unit Tests', () => {

  test.describe('1. Chronological & Invariant Rules Verification', () => {
    test('catches EMPLOYMENT_BEFORE_CERTIFICATION with CRITICAL severity', () => {
      const record = {
        traineeId: 'TR_TEST_01',
        name: 'Test Candidate',
        certificationDate: '2024-04-01',
        employmentStartDate: '2024-01-15' // starts 2.5 months before certification
      }

      const violations = evaluateTraineeDataQuality(record)
      expect(violations.length).toBeGreaterThanOrEqual(1)
      const v = violations.find(x => x.rule === 'CHRONOLOGY_EMPLOYMENT_BEFORE_CERTIFICATION')
      expect(v).toBeDefined()
      expect(v?.severity).toBe('CRITICAL')
    })

    test('catches CERTIFICATION_BEFORE_ENROLMENT with CRITICAL severity', () => {
      const record = {
        traineeId: 'TR_TEST_02',
        name: 'Test Candidate 2',
        enrolmentDate: '2024-03-01',
        certificationDate: '2024-01-15' // certification before enrolment
      }

      const violations = evaluateTraineeDataQuality(record)
      expect(violations.length).toBeGreaterThanOrEqual(1)
      const v = violations.find(x => x.rule === 'CHRONOLOGY_CERTIFICATION_BEFORE_ENROLMENT')
      expect(v).toBeDefined()
      expect(v?.severity).toBe('CRITICAL')
    })

    test('catches FUTURE_EVENT_DATE when event timestamp is ahead of current time', () => {
      const record = {
        traineeId: 'TR_TEST_03',
        name: 'Test Candidate 3',
        certificationDate: '2024-01-01',
        employmentStartDate: '2030-01-01' // 4 years in future
      }

      const violations = evaluateTraineeDataQuality(record)
      expect(violations.length).toBeGreaterThanOrEqual(1)
      const v = violations.find(x => x.rule === 'FUTURE_EVENT_DATE')
      expect(v).toBeDefined()
      expect(v?.severity).toBe('HIGH')
    })

    test('catches UNDERAGE_CERTIFICATION when candidate is under 15 years old at certification', () => {
      const record = {
        traineeId: 'TR_TEST_04',
        name: 'Minor Candidate',
        dateOfBirth: '2012-06-01', // ~11 years old in 2024
        certificationDate: '2024-01-01'
      }

      const violations = evaluateTraineeDataQuality(record)
      expect(violations.length).toBeGreaterThanOrEqual(1)
      const v = violations.find(x => x.rule === 'UNDERAGE_CERTIFICATION')
      expect(v).toBeDefined()
      expect(v?.severity).toBe('HIGH')
    })

    test('passes clean chronological record with zero violations', () => {
      const record = {
        traineeId: 'TR_TEST_CLEAN',
        name: 'Compliant Candidate',
        dateOfBirth: '2000-01-01',
        enrolmentDate: '2023-09-01',
        certificationDate: '2024-01-15',
        employmentStartDate: '2024-02-01'
      }

      const violations = evaluateTraineeDataQuality(record)
      expect(violations).toHaveLength(0)
    })
  })

  test.describe('2. Registry Issue Management & Filter Capabilities', () => {
    test('initializes all 5 anomaly categories in demonstration registry', () => {
      const issues = initializeDemonstrationIssues()
      expect(issues.length).toBeGreaterThanOrEqual(5)

      const categories = new Set(issues.map(i => i.category))
      expect(categories.has('CHRONOLOGY')).toBe(true)
      expect(categories.has('DUPLICATE')).toBe(true)
      expect(categories.has('OPERATIONAL')).toBe(true)
      expect(categories.has('STALENESS')).toBe(true)
      expect(categories.has('PROVIDER_BATCH')).toBe(true)
    })

    test('filters issues by severity, category, and text query', () => {
      const criticalIssues = getDataQualityIssues({ severity: 'CRITICAL' })
      expect(criticalIssues.every(i => i.severity === 'CRITICAL')).toBe(true)

      const batchIssues = getDataQualityIssues({ category: 'PROVIDER_BATCH' })
      expect(batchIssues.every(i => i.category === 'PROVIDER_BATCH')).toBe(true)

      const searchIssues = getDataQualityIssues({ query: 'Patel' })
      expect(searchIssues.length).toBeGreaterThanOrEqual(1)
    })

    test('resolves and acknowledges issue with audit trail', () => {
      const issue = resolveDataQualityIssue(
        'DQI-MH-2026-05',
        'RESOLVE',
        'Senior Data Quality Operator',
        'Verified offline via district call center and scheduled assisted follow-up'
      )

      expect(issue.status).toBe('RESOLVED')
      expect(issue.resolvedBy).toBe('Senior Data Quality Operator')
      expect(issue.resolvedAt).toBeDefined()
      expect(issue.resolutionNotes).toContain('call center')
    })

    test('computes reliability score and category breakdown in summary', () => {
      const summary = getDataQualitySummary()
      expect(summary.totalTracked).toBeGreaterThanOrEqual(5)
      expect(summary.dataReliabilityScore).toBeGreaterThanOrEqual(70)
      expect(summary.dataReliabilityScore).toBeLessThanOrEqual(100)
      expect(summary.byCategory.CHRONOLOGY).toBeGreaterThanOrEqual(0)
      expect(summary.byCategory.PROVIDER_BATCH).toBeGreaterThanOrEqual(0)
    })
  })
})
