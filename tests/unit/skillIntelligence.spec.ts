/**
 * FILE: tests/unit/skillIntelligence.spec.ts
 * PURPOSE: Comprehensive Unit Tests for Phase 6 Skill Intelligence Engine,
 *          Mandatory sourceSpan Character Offset Invariants, 7-Class Evidence Hierarchy,
 *          and Denominator-Grounded Gap Analytics (Defect #3 Remediation).
 * SPEC: Master Implementation Spec Section 14.5, 17.1-17.5, and Phase 6.
 */

import { test, expect } from '@playwright/test';
import {
  getAllSkills,
  getSkillById,
  getAllOccupations,
  getOccupationById,
  getOccupationSkills,
  findSkillByNameOrAlias,
  TAXONOMY_SKILLS,
  TARGET_OCCUPATIONS,
} from '../../server/services/skillTaxonomy.js';
import {
  extractSkillsFromText,
  validateSkillClaim,
  computeSkillGaps,
  EVIDENCE_CLASSES,
} from '../../server/services/skillEngine.js';

test.describe('Phase 6: Skill Intelligence Engine & Defect #3 Remediation Unit Tests', () => {

  test.describe('1. Taxonomy, NSQF Alignment & Multilingual Metadata', () => {
    test('getAllSkills returns full catalog with mandatory NSQF, ESCO and multilingual metadata', () => {
      const skills = getAllSkills();
      expect(skills.length).toBeGreaterThanOrEqual(14);

      for (const skill of skills) {
        expect(typeof skill.id).toBe('string');
        expect(typeof skill.name).toBe('string');
        expect(typeof skill.category).toBe('string');
        expect(typeof skill.nsqfLevel).toBe('number');
        expect(skill.nsqfLevel).toBeGreaterThanOrEqual(1);
        expect(skill.nsqfLevel).toBeLessThanOrEqual(10);
        expect(typeof skill.marathiLabel).toBe('string');
        expect(typeof skill.hindiLabel).toBe('string');
        expect(Array.isArray(skill.aliases)).toBe(true);
      }
    });

    test('getAllOccupations covers both IT and Maharashtra vocational sector frameworks', () => {
      const occupations = getAllOccupations();
      expect(occupations.length).toBeGreaterThanOrEqual(5);

      const codes = occupations.map((o) => o.code);
      // IT sector
      expect(codes).toContain('SSC/Q0501'); // Software Developer
      expect(codes).toContain('SSC/Q0503'); // Full Stack Developer
      // Maharashtra Vocational & Green Energy sector
      expect(codes).toContain('ELE/Q0101'); // Solar PV
      expect(codes).toContain('AUR/Q0102'); // CNC Machinist

      for (const occ of occupations) {
        expect(typeof occ.id).toBe('string');
        expect(typeof occ.title).toBe('string');
        expect(typeof occ.marathiTitle).toBe('string');
        expect(typeof occ.hindiTitle).toBe('string');
        expect(Array.isArray(occ.requiredSkills)).toBe(true);
        expect(occ.requiredSkills.length).toBeGreaterThan(0);
      }
    });

    test('getOccupationSkills resolves full skill definitions with weights and levels', () => {
      const occSkills = getOccupationSkills('occ_fullstack_dev');
      expect(occSkills.length).toBeGreaterThanOrEqual(6);

      const reactReq = occSkills.find((s) => s.skillId === 'skl_react');
      expect(reactReq).toBeDefined();
      expect(reactReq?.requiredLevel).toBe('ADVANCED');
      expect(reactReq?.importance).toBeGreaterThanOrEqual(0.9);
      expect(reactReq?.isMandatory).toBe(true);
      expect(reactReq?.skill.name).toBe('React.js');
    });

    test('findSkillByNameOrAlias resolves exact names, common aliases and case-insensitive variations', () => {
      expect(findSkillByNameOrAlias('React')?.id).toBe('skl_react');
      expect(findSkillByNameOrAlias('reactjs')?.id).toBe('skl_react');
      expect(findSkillByNameOrAlias('TypeScript')?.id).toBe('skl_typescript');
      expect(findSkillByNameOrAlias('k8s')?.id).toBe('skl_docker_k8s');
      expect(findSkillByNameOrAlias('Solar PV')?.id).toBe('skl_solar_pv');
      expect(findSkillByNameOrAlias('NonExistentSkill123')).toBeNull();
    });
  });

  test.describe('2. Deterministic Skill Extraction & Mandatory sourceSpan Invariant', () => {
    const sampleResume =
      'Senior Engineer with 5 years experience in React.js, TypeScript, and Node.js.\n' +
      'Architected PostgreSQL relational schemas and deployed Docker container clusters on AWS.\n' +
      'Demonstrated excellent problem solving in fast-paced production incidents.';

    test('extractSkillsFromText extracts skills with exact character offsets', () => {
      const extracted = extractSkillsFromText(sampleResume, 'RESUME');
      expect(extracted.length).toBeGreaterThanOrEqual(5);

      const skillIds = extracted.map((e) => e.skillId);
      expect(skillIds).toContain('skl_react');
      expect(skillIds).toContain('skl_typescript');
      expect(skillIds).toContain('skl_nodejs');
      expect(skillIds).toContain('skl_postgresql');

      // Check exact character slice invariant for every extracted item
      for (const item of extracted) {
        expect(item.sourceSpan).toBeDefined();
        expect(typeof item.sourceSpan.start).toBe('number');
        expect(typeof item.sourceSpan.end).toBe('number');
        expect(item.sourceSpan.start).toBeGreaterThanOrEqual(0);
        expect(item.sourceSpan.end).toBeGreaterThan(item.sourceSpan.start);

        const slice = sampleResume.slice(item.sourceSpan.start, item.sourceSpan.end);
        expect(slice.toLowerCase()).toBe(item.sourceSpan.text.toLowerCase());
      }
    });

    test('sourceType assigns appropriate 7-class baseline evidence and strength', () => {
      const resumeExtracted = extractSkillsFromText('Proficient in TypeScript', 'RESUME');
      expect(resumeExtracted[0].evidenceClass).toBe('RESUME_MENTION');
      expect(resumeExtracted[0].strength).toBe('MEDIUM_LOW');

      const assessmentExtracted = extractSkillsFromText('Passed assessment in TypeScript', 'ASSESSMENT');
      expect(assessmentExtracted[0].evidenceClass).toBe('ASSESSMENT_SCORE');
      expect(assessmentExtracted[0].strength).toBe('HIGH');
      expect(assessmentExtracted[0].confidence).toBe(0.95);

      const projectExtracted = extractSkillsFromText('Built project in TypeScript', 'PROJECT');
      expect(projectExtracted[0].evidenceClass).toBe('COMPLETED_PROJECT');
      expect(projectExtracted[0].strength).toBe('MEDIUM_HIGH');
    });

    test('validateSkillClaim strictly rejects claims without sourceSpan per Section 17.2', () => {
      // 1. Claim without sourceSpan (bare LLM hallucination)
      const hallucinatedClaim = {
        skillId: 'skl_react',
        name: 'React.js',
        evidenceClass: 'RESUME_MENTION',
        sourceSpan: null,
      };
      const resultNoSpan = validateSkillClaim(hallucinatedClaim, sampleResume);
      expect(resultNoSpan.valid).toBe(false);
      expect(resultNoSpan.reason).toContain('Mandatory sourceSpan is missing');

      // 2. Claim with corrupt or fabricated slice indices
      const badSpanClaim = {
        skillId: 'skl_react',
        name: 'React.js',
        evidenceClass: 'RESUME_MENTION',
        sourceSpan: {
          start: 0,
          end: 6,
          text: 'React.js',
        },
      };
      // slice(0, 6) in sampleResume is "Senior", not "React.js"
      const resultBadSlice = validateSkillClaim(badSpanClaim, sampleResume);
      expect(resultBadSlice.valid).toBe(false);
      expect(resultBadSlice.reason).toContain('sourceSpan text mismatch');
    });
  });

  test.describe('3. Denominator-Grounded Skill Gap Analysis (Defect #3 Fix)', () => {
    test('computeSkillGaps produces structured gaps with stated denominators and zero opaque paragraphs', () => {
      const resume = 'Junior web designer with knowledge of HTML, CSS, and Git. Some exposure to Python.';

      const analysis = computeSkillGaps({
        traineeId: 'trainee_test_001',
        targetOccupationId: 'occ_fullstack_dev',
        resumeText: resume,
      });

      expect(analysis.occupation.id).toBe('occ_fullstack_dev');
      expect(analysis.summary.totalRequiredSkills).toBeGreaterThan(0);
      expect(typeof analysis.summary.matchedSkillsCount).toBe('number');
      expect(typeof analysis.summary.gapCount).toBe('number');
      expect(typeof analysis.summary.coveragePercent).toBe('number');

      // Invariant: Stated Denominator is explicit string e.g. "X of Y required skills (Z%)"
      expect(analysis.summary.statedDenominator).toMatch(/\d+ of \d+ required skills \(\d+%\)/);

      // Invariant: Synthetic dataset label is strictly attached per Section 25.3
      expect(analysis.summary.syntheticDataset).toBe(true);
      expect(analysis.summary.syntheticDatasetDisclaimer).toContain('Maharashtra State Innovation Society');

      // Every gap must have structured properties and denominator-grounded reason
      for (const gap of analysis.gaps) {
        expect(gap.gap).toBe(true);
        expect(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).toContain(gap.priority);
        expect(typeof gap.statedDenominator).toBe('string');
        expect(gap.statedDenominator).toContain('target postings');
        expect(typeof gap.reason).toBe('string');
        expect(gap.reason.length).toBeGreaterThan(15);
        // Must have structured intervention
        expect(gap.recommendedIntervention).toBeDefined();
        expect(typeof gap.recommendedIntervention?.courseTitle).toBe('string');
        expect(typeof gap.recommendedIntervention?.provider).toBe('string');
      }
    });

    test('high-strength evidence elevates candidate match status and verified evidence counter', () => {
      const verifiedEvidence = [
        {
          skillId: 'skl_react',
          evidenceClass: 'ASSESSMENT_SCORE',
          strength: 'HIGH',
          confidence: 0.95,
          proficiency: 'ADVANCED',
          verifiedAt: new Date(),
        },
        {
          skillId: 'skl_nodejs',
          evidenceClass: 'EMPLOYER_CONFIRMED_USE',
          strength: 'HIGH',
          confidence: 0.90,
          proficiency: 'ADVANCED',
          verifiedAt: new Date(),
        },
      ];

      const analysis = computeSkillGaps({
        traineeId: 'trainee_verified_002',
        targetOccupationId: 'occ_fullstack_dev',
        existingEvidence: verifiedEvidence,
        resumeText: 'Also skilled in TypeScript and PostgreSQL.',
      });

      expect(analysis.summary.verifiedEvidenceCount).toBeGreaterThanOrEqual(2);
      expect(analysis.matches.length).toBeGreaterThanOrEqual(2);

      const reactMatch = analysis.matches.find((m) => m.skillId === 'skl_react');
      expect(reactMatch).toBeDefined();
      expect(reactMatch?.strongestEvidence.evidenceClass).toBe('ASSESSMENT_SCORE');
      expect(reactMatch?.strongestEvidence.confidence).toBe(0.95);
    });

    test('all 7 evidence classes are strictly defined with calibrated confidence scores', () => {
      expect(EVIDENCE_CLASSES.ASSESSMENT_SCORE.baseConfidence).toBe(0.95);
      expect(EVIDENCE_CLASSES.EMPLOYER_CONFIRMED_USE.baseConfidence).toBe(0.90);
      expect(EVIDENCE_CLASSES.COMPLETED_PROJECT.baseConfidence).toBe(0.80);
      expect(EVIDENCE_CLASSES.CERTIFICATION.baseConfidence).toBe(0.70);
      expect(EVIDENCE_CLASSES.RESUME_MENTION.baseConfidence).toBe(0.50);
      expect(EVIDENCE_CLASSES.SELF_REPORT.baseConfidence).toBe(0.35);
      expect(EVIDENCE_CLASSES.UNVERIFIED.baseConfidence).toBe(0.15);

      // Verify descending order of strength
      const classes = [
        EVIDENCE_CLASSES.ASSESSMENT_SCORE,
        EVIDENCE_CLASSES.EMPLOYER_CONFIRMED_USE,
        EVIDENCE_CLASSES.COMPLETED_PROJECT,
        EVIDENCE_CLASSES.CERTIFICATION,
        EVIDENCE_CLASSES.RESUME_MENTION,
        EVIDENCE_CLASSES.SELF_REPORT,
        EVIDENCE_CLASSES.UNVERIFIED,
      ];
      for (let i = 0; i < classes.length - 1; i++) {
        expect(classes[i].baseConfidence).toBeGreaterThan(classes[i + 1].baseConfidence);
      }
    });
  });
});
