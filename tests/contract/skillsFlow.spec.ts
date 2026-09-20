/**
 * FILE: tests/contract/skillsFlow.spec.ts
 * PURPOSE: Automated API Contract Tests for Phase 6 Skill Intelligence Engine,
 *          Grounded Character-Offset sourceSpan Invariants, 7-Class Evidence Hierarchy,
 *          and Denominator-Grounded Gap Analysis (Defect #3 Remediation).
 * RUN WITH: npx playwright test tests/contract/skillsFlow.spec.ts
 * SPEC: Master Implementation Spec Section 14.5, 17.1-17.5, and Phase 6.
 */

import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:8787';

test.describe('Phase 6: Skill Intelligence Engine & Defect #3 Remediation Contract Suite', () => {
  let testAuthToken: string = '';
  let testTraineeId: string = '';

  test.beforeAll(async ({ request }) => {
    // Register a fresh trainee session
    const uniquePhone = `+9196${Date.now().toString().slice(-8)}`;
    const regRes = await request.post(`${API_BASE}/api/auth/register`, {
      data: {
        phone: uniquePhone,
        password: 'SkillContractPassword123!',
        name: 'Skill Contract Trainee',
        email: `skill_trainee_${Date.now()}@nexis.gov.in`,
      },
    });

    if (regRes.ok()) {
      const regData = await regRes.json();
      testAuthToken = regData.token || '';
      testTraineeId = regData.user?.trainee?.id || regData.user?.id || '';
    }
  });

  test('GET /api/skills/ping returns ready probe with all 7 evidence classes and taxonomy counts', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/skills/ping`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.namespace).toBe('/api/skills');
    expect(body.status).toBe('ready');
    expect(Array.isArray(body.evidenceClasses)).toBe(true);
    expect(body.evidenceClasses).toContain('ASSESSMENT_SCORE');
    expect(body.evidenceClasses).toContain('EMPLOYER_CONFIRMED_USE');
    expect(body.evidenceClasses).toContain('COMPLETED_PROJECT');
    expect(body.evidenceClasses).toContain('CERTIFICATION');
    expect(body.evidenceClasses).toContain('RESUME_MENTION');
    expect(body.evidenceClasses).toContain('SELF_REPORT');
    expect(body.evidenceClasses).toContain('UNVERIFIED');
    expect(body.supportedOccupationsCount).toBeGreaterThanOrEqual(5);
    expect(body.taxonomySkillsCount).toBeGreaterThanOrEqual(14);
  });

  test('GET /api/skills/taxonomy returns complete catalog with NSQF, ESCO, and local language metadata', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/skills/taxonomy`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body.skills)).toBe(true);
    expect(body.total).toBeGreaterThanOrEqual(14);

    const firstSkill = body.skills[0];
    expect(firstSkill).toHaveProperty('id');
    expect(firstSkill).toHaveProperty('name');
    expect(firstSkill).toHaveProperty('category');
    expect(firstSkill).toHaveProperty('nsqfLevel');
    expect(firstSkill).toHaveProperty('marathiLabel');
    expect(firstSkill).toHaveProperty('hindiLabel');
  });

  test('GET /api/skills/occupations returns standard target occupations matrix', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/skills/occupations`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body.occupations)).toBe(true);
    expect(body.total).toBeGreaterThanOrEqual(5);

    const occIds = body.occupations.map((o: any) => o.id);
    expect(occIds).toContain('occ_fullstack_dev');
    expect(occIds).toContain('occ_solar_technician');
  });

  test('GET /api/skills/occupations/:id returns detailed requirement competency matrix', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/skills/occupations/occ_fullstack_dev`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.occupation.id).toBe('occ_fullstack_dev');
    expect(Array.isArray(body.requiredSkills)).toBe(true);
    expect(body.totalRequired).toBeGreaterThanOrEqual(6);

    const sampleReq = body.requiredSkills[0];
    expect(sampleReq).toHaveProperty('skillId');
    expect(sampleReq).toHaveProperty('requiredLevel');
    expect(sampleReq).toHaveProperty('importance');
    expect(sampleReq).toHaveProperty('isMandatory');
    expect(sampleReq.skill).toBeDefined();
  });

  test('POST /api/skills/extract rejects empty text payload with 400 Bad Request', async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/skills/extract`, {
      data: { text: '   ' },
    });
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toContain('Missing required field: text');
  });

  test('POST /api/skills/extract returns extracted skills with mandatory non-null sourceSpan', async ({ request }) => {
    const sampleResume = 'Demonstrated hands-on experience in React.js, TypeScript, PostgreSQL, and Git version control.';

    const response = await request.post(`${API_BASE}/api/skills/extract`, {
      headers: testAuthToken ? { Authorization: `Bearer ${testAuthToken}` } : {},
      data: {
        text: sampleResume,
        sourceType: 'RESUME',
      },
    });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.mode).toBe('operational');
    expect(body.sourceType).toBe('RESUME');
    expect(Array.isArray(body.extractedSkills)).toBe(true);
    expect(body.totalExtracted).toBeGreaterThanOrEqual(4);

    // Assert that every returned skill item has an exact character-offset sourceSpan
    for (const skill of body.extractedSkills) {
      expect(skill.sourceSpan).toBeDefined();
      expect(typeof skill.sourceSpan.start).toBe('number');
      expect(typeof skill.sourceSpan.end).toBe('number');
      expect(skill.sourceSpan.start).toBeGreaterThanOrEqual(0);
      expect(skill.sourceSpan.end).toBeGreaterThan(skill.sourceSpan.start);

      // Verify character slice invariant
      const slice = sampleResume.slice(skill.sourceSpan.start, skill.sourceSpan.end);
      expect(slice.toLowerCase()).toBe(skill.sourceSpan.text.toLowerCase());

      // Verify baseline evidence class
      expect(skill.evidenceClass).toBe('RESUME_MENTION');
      expect(skill.strength).toBe('MEDIUM_LOW');
    }
  });

  test('POST /api/skills/gap-analysis produces denominator-grounded gaps (Defect #3 Fix)', async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/skills/gap-analysis`, {
      headers: testAuthToken ? { Authorization: `Bearer ${testAuthToken}` } : {},
      data: {
        targetOccupationId: 'occ_fullstack_dev',
        resumeText: 'Experienced in Python and Git. Basic exposure to Docker.',
      },
    });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.occupation).toBeDefined();
    expect(body.summary).toBeDefined();

    // Invariant: Stated denominator is non-null string e.g. "X of Y required skills (Z%)"
    expect(typeof body.summary.statedDenominator).toBe('string');
    expect(body.summary.statedDenominator).toMatch(/\d+ of \d+ required skills \(\d+%\)/);

    // Invariant: Stated denominator and synthetic dataset label
    expect(body.summary.syntheticDataset).toBe(true);
    expect(body.summary.benchmarkCohortSize).toBe(500);

    // Invariant: All gaps are structured with explicit reason strings
    expect(Array.isArray(body.gaps)).toBe(true);
    expect(body.gaps.length).toBeGreaterThan(0);

    for (const gap of body.gaps) {
      expect(gap.gap).toBe(true);
      expect(typeof gap.statedDenominator).toBe('string');
      expect(gap.statedDenominator).toContain('target postings');
      expect(typeof gap.reason).toBe('string');
      expect(gap.reason.length).toBeGreaterThan(10);
      expect(gap.strongestEvidence).toBeDefined();
      expect(gap.recommendedIntervention).toBeDefined();
      expect(gap.recommendedIntervention.url).toContain('http');
    }
  });

  test('POST /api/skills/evidence registers verified evidence and enforces sourceSpan for RESUME_MENTION', async ({ request }) => {
    // 1. Rejects RESUME_MENTION without sourceSpan
    const badRes = await request.post(`${API_BASE}/api/skills/evidence`, {
      headers: testAuthToken ? { Authorization: `Bearer ${testAuthToken}` } : {},
      data: {
        traineeId: testTraineeId || 'trainee_test_001',
        skillId: 'skl_react',
        evidenceClass: 'RESUME_MENTION',
        // sourceSpan intentionally omitted
      },
    });
    expect(badRes.status()).toBe(422);
    const badBody = await badRes.json();
    expect(badBody.error).toContain('sourceSpan is mandatory for RESUME_MENTION');

    // 2. Accepts valid ASSESSMENT_SCORE evidence
    const goodRes = await request.post(`${API_BASE}/api/skills/evidence`, {
      headers: testAuthToken ? { Authorization: `Bearer ${testAuthToken}` } : {},
      data: {
        traineeId: testTraineeId || 'trainee_test_001',
        skillId: 'skl_react',
        evidenceClass: 'ASSESSMENT_SCORE',
        confidence: 0.95,
      },
    });
    expect(goodRes.status()).toBe(201);
    const goodBody = await goodRes.json();
    expect(goodBody.success).toBe(true);
    expect(goodBody.evidence.evidenceClass).toBe('ASSESSMENT_SCORE');
    expect(goodBody.evidence.strength).toBe('HIGH');
  });
});
