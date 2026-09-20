/**
 * FILE: tests/unit/adzunaMatching.spec.ts
 * PURPOSE: Unit Tests for Phase 7 Adzuna Job Intelligence, Deterministic 6-Factor
 *          Matching Formula (Section 18.2), In-Memory TTL Caching, and Zero-Google Fallback.
 * SPEC: Master Implementation Spec Section 4.2, Section 18.1-18.3, and Phase 7.
 */

import { test, expect } from '@playwright/test';
import {
  calculateAdzunaSixFactorMatch,
  DEFAULT_ADZUNA_WEIGHTS,
} from '../../server/services/jobTrustEngine.js';
import {
  activeProviderSearch,
  getProviderStatus,
  ADZUNA_REFERENCE_INDIA_LISTINGS,
} from '../../server/services/jobSearchProvider.js';

test.describe('Phase 7: Adzuna Job Intelligence & 6-Factor Matching Unit Tests', () => {

  test.describe('1. Deterministic 6-Factor Matching Formula (Section 18.2)', () => {
    const sampleJob = {
      title: 'Full Stack Engineer - React & Node.js',
      description: 'Building microservices with Node.js, Express, React, TypeScript, and PostgreSQL. Located in Pune.',
      location: 'Pune, Maharashtra',
      company: 'Tata Consultancy Services',
    };

    const sampleCandidate = {
      skills: [
        { skill: 'React', demonstrated: true },
        { skill: 'TypeScript', demonstrated: true },
        { skill: 'Node.js', demonstrated: true },
        { skill: 'PostgreSQL', demonstrated: true },
      ],
      experienceYears: 3,
      location: 'Pune, Maharashtra',
      targetRole: 'Full Stack Engineer',
      education: 'B.Tech in Computer Science',
      mode: 'current',
    };

    test('calculateAdzunaSixFactorMatch strictly computes M = 0.40S + 0.20E + 0.15L + 0.10Q + 0.10R + 0.05P', () => {
      const match = calculateAdzunaSixFactorMatch({
        job: sampleJob,
        candidate: sampleCandidate,
        weights: DEFAULT_ADZUNA_WEIGHTS,
      });

      expect(typeof match.matchScore).toBe('number');
      expect(match.matchScore).toBeGreaterThanOrEqual(0);
      expect(match.matchScore).toBeLessThanOrEqual(100);

      // Verify all 6 factors are present and bounded [0, 100]
      const { S, E, L, Q, R, P } = match.breakdown;
      expect(S).toBeGreaterThanOrEqual(0);
      expect(S).toBeLessThanOrEqual(100);
      expect(E).toBeGreaterThanOrEqual(0);
      expect(E).toBeLessThanOrEqual(100);
      expect(L).toBeGreaterThanOrEqual(0);
      expect(L).toBeLessThanOrEqual(100);
      expect(Q).toBeGreaterThanOrEqual(0);
      expect(Q).toBeLessThanOrEqual(100);
      expect(R).toBeGreaterThanOrEqual(0);
      expect(R).toBeLessThanOrEqual(100);
      expect(P).toBeGreaterThanOrEqual(0);
      expect(P).toBeLessThanOrEqual(100);

      // Verify exact mathematical formula computation
      const expectedScore = Math.min(
        100,
        Math.max(
          0,
          Math.round(0.40 * S + 0.20 * E + 0.15 * L + 0.10 * Q + 0.10 * R + 0.05 * P)
        )
      );
      expect(match.matchScore).toBe(expectedScore);

      // High alignment candidate should be assigned to APPLY_NOW
      expect(match.matchScore).toBeGreaterThanOrEqual(75);
      expect(match.bucket).toBe('APPLY_NOW');
    });

    test('supports user-configured custom weights without altering formula transparency', () => {
      const customWeights = {
        S: 0.60, // heavily emphasize skills
        E: 0.10,
        L: 0.10,
        Q: 0.10,
        R: 0.05,
        P: 0.05,
      };

      const match = calculateAdzunaSixFactorMatch({
        job: sampleJob,
        candidate: sampleCandidate,
        weights: customWeights,
      });

      expect(match.weights.S).toBe(0.60);
      const { S, E, L, Q, R, P } = match.breakdown;
      const expectedScore = Math.round(0.60 * S + 0.10 * E + 0.10 * L + 0.10 * Q + 0.05 * R + 0.05 * P);
      expect(match.matchScore).toBe(expectedScore);
    });

    test('assigns appropriate action buckets based on score thresholds', () => {
      // Unrelated candidate
      const unrelatedCandidate = {
        skills: [{ skill: 'Welding' }],
        experienceYears: 0,
        location: 'Kochi, Kerala',
        targetRole: 'Civil Surveyor',
        education: 'High School',
      };

      const lowMatch = calculateAdzunaSixFactorMatch({
        job: sampleJob,
        candidate: unrelatedCandidate,
      });

      expect(lowMatch.matchScore).toBeLessThan(60);
      expect(['LEARN_THEN_APPLY', 'STRETCH', 'IGNORE']).toContain(lowMatch.bucket);
    });
  });

  test.describe('2. In-Memory TTL Caching & Zero Google Fallback Guarantee (Defect #2 Fix)', () => {
    test('activeProviderSearch returns real, clickable Adzuna India postings with zero Google links', async () => {
      const results = await activeProviderSearch({ query: 'Full Stack Developer', location: 'in' });
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      for (const job of results) {
        expect(typeof job.title).toBe('string');
        expect(typeof job.company).toBe('string');
        expect(typeof job.link).toBe('string');
        // Mandatory Acceptance Criteria: ZERO Google Search fallback links
        expect(job.link).not.toContain('google.com/search');
        expect(job.link).toContain('adzuna');
        expect(job.source).toBe('adzuna');
      }
    });

    test('caches search queries in memory to protect against Adzuna rate limits (25/min, 250/day)', async () => {
      const t1 = Date.now();
      const firstCall = await activeProviderSearch({ query: 'Solar PV Site Engineer', location: 'in' });
      const secondCall = await activeProviderSearch({ query: 'Solar PV Site Engineer', location: 'in' });

      expect(firstCall.length).toBe(secondCall.length);
      expect(firstCall[0].id).toBe(secondCall[0].id);

      const status = getProviderStatus();
      expect(status.cachedEntriesCount).toBeGreaterThan(0);
      expect(typeof status.rateLimit.minuteLimit).toBe('number');
      expect(status.rateLimit.minuteLimit).toBe(25);
      expect(status.rateLimit.dailyLimit).toBe(250);
      expect(status.licensingNotice).toContain('Section 4.2');
    });

    test('reference listings contain authentic Maharashtra employers and job details', () => {
      expect(ADZUNA_REFERENCE_INDIA_LISTINGS.length).toBeGreaterThanOrEqual(6);
      const locations = ADZUNA_REFERENCE_INDIA_LISTINGS.map((j) => j.location);
      expect(locations.some((loc) => loc.includes('Pune'))).toBe(true);
      expect(locations.some((loc) => loc.includes('Mumbai'))).toBe(true);
    });
  });
});
