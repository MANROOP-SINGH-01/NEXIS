/**
 * Phase 17 Unit Test Suite: Splink Identity-Linkage Service & Fellegi-Sunter Model
 * Specification: Sections 4.2, 9, 17.4, 27 Phase 17
 */

import { test, expect } from '@playwright/test'
import {
  jaroSimilarity,
  jaroWinkler,
  soundex,
  levenshteinDistance,
  evaluateFellegiSunterPair,
  linkRecords,
  getSplinkHealth,
  sha256,
  phoneLast6
} from '../../server/services/splinkService.js'

test.describe('Phase 17: Splink Identity-Linkage Service Unit Tests', () => {

  test.describe('1. String Distance, Phonetic & Tokenization Primitives', () => {
    test('jaroWinkler calculates high similarity for Indian name variants and initials', () => {
      const sim1 = jaroWinkler('Rahul Sharma', 'Rahul K. Sharma')
      expect(sim1).toBeGreaterThanOrEqual(0.88)

      const sim2 = jaroWinkler('Priya Patel', 'Priya Suresh Patel')
      expect(sim2).toBeGreaterThanOrEqual(0.80)

      const sim3 = jaroWinkler('Mohammad Ansari', 'Md. Ansari')
      expect(sim3).toBeGreaterThan(0.65)

      // Completely unrelated names should have low similarity
      const simDissimilar = jaroWinkler('Rahul Sharma', 'Sunita Deshmukh')
      expect(simDissimilar).toBeLessThan(0.60)
    })

    test('soundex correctly encodes phonetic surname variations', () => {
      expect(soundex('Patel')).toBe(soundex('Patell'))
      expect(soundex('Sharma')).toBe(soundex('Sarma'))
      expect(soundex('')).toBe('Z000')
      expect(soundex('Ansari')).toBe('A526')
    })

    test('levenshteinDistance detects 1-digit adjacent mobile contact differences', () => {
      expect(levenshteinDistance('987654', '987655')).toBe(1)
      expect(levenshteinDistance('987654', '987654')).toBe(0)
      expect(levenshteinDistance('987654', '123456')).toBe(5)
    })

    test('phoneLast6 extracts normalized 6-digit terminal sequence', () => {
      expect(phoneLast6('+91 98765 12340')).toBe('512340')
      expect(phoneLast6('09876512340')).toBe('512340')
      expect(phoneLast6('1234')).toBe('1234')
      expect(phoneLast6('')).toBe('')
    })

    test('sha256 deterministically hashes contact tokens for DPDP privacy compliance', () => {
      const hash1 = sha256('candidate@example.com')
      const hash2 = sha256('CANDIDATE@example.com ')
      expect(hash1).toBe(hash2)
      expect(hash1).toHaveLength(64)
    })
  })

  test.describe('2. Fellegi-Sunter Comparison Models & Match Probabilities', () => {
    test('evaluates high-confidence duplicate with identical phone hash and exact DOB as AUTO_LINK', () => {
      const recA = {
        id: 'T1',
        name: 'Rahul Sharma',
        dateOfBirth: '1999-04-12',
        district: 'Pune',
        phoneNumber: '+91 98765 12340'
      }
      const recB = {
        id: 'T2',
        name: 'Rahul K. Sharma',
        dateOfBirth: '1999-04-12',
        district: 'Pune',
        phoneNumber: '+91 98765 12340'
      }

      const result = evaluateFellegiSunterPair(recA, recB)
      expect(result.matchProbability).toBeGreaterThanOrEqual(0.92)
      expect(result.classification).toBe('AUTO_LINK')
      expect(result.bayesFactor).toBeGreaterThan(100)
      expect(result.reasons.some(r => r.includes('Exact Date of Birth Match'))).toBe(true)
      expect(result.reasons.some(r => r.includes('Phone'))).toBe(true)
    })

    test('evaluates borderline cross-district duplicate with fuzzy name as REVIEW_REQUIRED', () => {
      const recA = {
        id: 'T3',
        name: 'Priya Suresh Patel',
        dateOfBirth: '2001-08-25',
        district: 'Pune',
        phoneNumber: '+91 98111 22334'
      }
      const recB = {
        id: 'T4',
        name: 'Priya S. Patel',
        dateOfBirth: '2001-08-25',
        district: 'Mumbai',
        phoneNumber: '+91 98111 22335' // adjacent phone (1-digit off)
      }

      const result = evaluateFellegiSunterPair(recA, recB)
      expect(result.matchProbability).toBeGreaterThanOrEqual(0.65)
      expect(result.matchProbability).toBeLessThan(0.98)
      expect(result.reasons.some(r => r.includes('Date of Birth'))).toBe(true)
    })

    test('evaluates completely unrelated individuals as UNLINKED', () => {
      const recA = {
        id: 'T5',
        name: 'Amit Deshmukh',
        dateOfBirth: '1995-02-14',
        district: 'Nagpur',
        phoneNumber: '+91 94221 11223'
      }
      const recB = {
        id: 'T6',
        name: 'Kavita Shinde',
        dateOfBirth: '2002-11-30',
        district: 'Nashik',
        phoneNumber: '+91 98230 44556'
      }

      const result = evaluateFellegiSunterPair(recA, recB)
      expect(result.matchProbability).toBeLessThan(0.20)
      expect(result.classification).toBe('UNLINKED')
    })
  })

  test.describe('3. Multi-Record Linkage, Blocking & Disjoint-Set Clustering', () => {
    test('linkRecords correctly generates candidate pairs and partitions into identity clusters', async () => {
      const records = [
        {
          id: 'T-A',
          name: 'Mohammad Faizan Ansari',
          dateOfBirth: '2000-11-03',
          district: 'Hyderabad',
          phoneNumber: '+91 97234 56789'
        },
        {
          id: 'T-B',
          name: 'Md. Faizan Ansari',
          dateOfBirth: '2000-11-03',
          district: 'Secunderabad',
          phoneNumber: '+91 97234 56789'
        },
        {
          id: 'T-C',
          name: 'Sunita Gaikwad',
          dateOfBirth: '1998-05-19',
          district: 'Aurangabad',
          phoneNumber: '+91 99887 66554'
        }
      ]

      const result = await linkRecords(records, { threshold: 0.65 })
      expect(result.candidates.length).toBeGreaterThanOrEqual(1)

      const pair = result.candidates.find(
        c => (c.traineeIdA === 'T-A' && c.traineeIdB === 'T-B') || (c.traineeIdA === 'T-B' && c.traineeIdB === 'T-A')
      )
      expect(pair).toBeDefined()
      expect(pair?.matchProbability).toBeGreaterThanOrEqual(0.65)

      // Disjoint-set clustering verification: T-A and T-B should share the same clusterId
      expect(result.clusters['T-A']).toBe(result.clusters['T-B'])
      // T-C should remain in its own separate cluster
      expect(result.clusters['T-C']).not.toBe(result.clusters['T-A'])
    })

    test('linkRecords handles empty and single-record input gracefully without exceptions', async () => {
      const emptyRes = await linkRecords([])
      expect(emptyRes.candidates).toEqual([])
      expect(emptyRes.summary.pairsEvaluated).toBe(0)

      const singleRes = await linkRecords([{ id: 'S1', name: 'Alone' }])
      expect(singleRes.candidates).toEqual([])
      expect(singleRes.clusters['S1']).toBe('S1')
    })
  })

  test.describe('4. Splink Service Health & Dual-Engine Fallback Invariant', () => {
    test('getSplinkHealth returns operational status with engine metadata', async () => {
      const health = await getSplinkHealth()
      expect(health.online).toBe(true)
      expect(health.service).toBe('splink-identity-linkage')
      expect(health.engine).toBeDefined()
      expect(['duckdb', 'deterministic-fellegi-sunter'].includes(health.engine)).toBe(true)
    })
  })
})
