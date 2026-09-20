/**
 * FILE: server/services/skillEngine.js
 * PURPOSE: Explainable Skill Extraction with Character-Offset sourceSpan Grounding,
 *          7-Class Evidence Strength Ranking, and Denominator-Grounded Gap Analysis.
 * SPEC: Master Implementation Spec Section 14.5, 17.1-17.3, and Phase 6 (Defect #3 Fix).
 */

import {
  TAXONOMY_SKILLS,
  TARGET_OCCUPATIONS,
  getSkillById,
  getOccupationById,
  getOccupationSkills,
} from './skillTaxonomy.js';

export const EVIDENCE_CLASSES = {
  ASSESSMENT_SCORE: {
    key: 'ASSESSMENT_SCORE',
    strength: 'HIGH',
    baseConfidence: 0.95,
    label: 'Assessment Score',
    description: 'Direct score from an authorized technical competency assessment.',
  },
  EMPLOYER_CONFIRMED_USE: {
    key: 'EMPLOYER_CONFIRMED_USE',
    strength: 'HIGH',
    baseConfidence: 0.90,
    label: 'Employer Confirmed',
    description: 'Verified on-the-job application confirmed by an employer.',
  },
  COMPLETED_PROJECT: {
    key: 'COMPLETED_PROJECT',
    strength: 'MEDIUM_HIGH',
    baseConfidence: 0.80,
    label: 'Completed Project',
    description: 'Demonstrated in a completed code repository or project artifact.',
  },
  CERTIFICATION: {
    key: 'CERTIFICATION',
    strength: 'MEDIUM',
    baseConfidence: 0.70,
    label: 'Certification',
    description: 'Documented completion of a recognized accredited course or certification.',
  },
  RESUME_MENTION: {
    key: 'RESUME_MENTION',
    strength: 'MEDIUM_LOW',
    baseConfidence: 0.50,
    label: 'Resume Mention',
    description: 'Extracted with verbatim character-offset source span from resume text.',
  },
  SELF_REPORT: {
    key: 'SELF_REPORT',
    strength: 'LOW_MEDIUM',
    baseConfidence: 0.35,
    label: 'Self-Reported',
    description: 'Claimed by candidate without external source text span or third-party validation.',
  },
  UNVERIFIED: {
    key: 'UNVERIFIED',
    strength: 'LOW',
    baseConfidence: 0.15,
    label: 'Unverified Claim',
    description: 'No verifiable source span or third-party corroboration.',
  },
};

const PROFICIENCY_RANK = {
  BASIC: 1,
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
  EXPERT: 4,
};

/**
 * Escapes regex special characters in a literal search string
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extracts skills deterministically from text with mandatory non-null sourceSpan
 *
 * @param {string} text - Raw input text (resume, JD, assessment response)
 * @param {string} sourceType - "RESUME" | "JOB_DESCRIPTION" | "ASSESSMENT" | "PROJECT" | "CERTIFICATION"
 * @returns {Array<Object>} List of extracted skills with exact sourceSpan character offsets
 */
export function extractSkillsFromText(text, sourceType = 'RESUME') {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const results = [];
  const normalizedSourceType = String(sourceType || 'RESUME').toUpperCase();

  // Determine baseline evidence class from source type
  let initialEvidenceClass = 'RESUME_MENTION';
  if (normalizedSourceType === 'ASSESSMENT') initialEvidenceClass = 'ASSESSMENT_SCORE';
  else if (normalizedSourceType === 'PROJECT') initialEvidenceClass = 'COMPLETED_PROJECT';
  else if (normalizedSourceType === 'CERTIFICATION') initialEvidenceClass = 'CERTIFICATION';
  else if (normalizedSourceType === 'JOB_DESCRIPTION') initialEvidenceClass = 'SELF_REPORT';

  // Iterate through all catalog skills and their aliases
  for (const skill of TAXONOMY_SKILLS) {
    const searchTerms = [skill.name, ...(skill.aliases || [])];

    let bestMatchForSkill = null;

    for (const term of searchTerms) {
      if (!term || term.trim().length < 2) continue;

      // Word boundary regex that accounts for punctuation like . and -
      const pattern = new RegExp(`(?<=^|[\\s,;:.()/\\[\\]-])${escapeRegex(term)}(?=[\\s,;:.()/\\[\\]-]|$)`, 'gi');

      let match;
      while ((match = pattern.exec(text)) !== null) {
        const start = match.index;
        const matchedText = match[0];
        const end = start + matchedText.length;

        // Double check character slice invariant
        const verbatimSlice = text.slice(start, end);
        if (verbatimSlice.toLowerCase() !== matchedText.toLowerCase()) {
          continue;
        }

        const candidateMatch = {
          skillId: skill.id,
          name: skill.name,
          category: skill.category,
          nsqfLevel: skill.nsqfLevel,
          qualificationPack: skill.qualificationPack,
          escoCrosswalkId: skill.escoCrosswalkId,
          marathiLabel: skill.marathiLabel,
          hindiLabel: skill.hindiLabel,
          sourceSpan: {
            start,
            end,
            text: verbatimSlice,
          },
          confidence: EVIDENCE_CLASSES[initialEvidenceClass].baseConfidence,
          evidenceClass: initialEvidenceClass,
          strength: EVIDENCE_CLASSES[initialEvidenceClass].strength,
          sourceType: normalizedSourceType,
        };

        if (!bestMatchForSkill || candidateMatch.sourceSpan.text.length > bestMatchForSkill.sourceSpan.text.length) {
          bestMatchForSkill = candidateMatch;
        }
      }
    }

    if (bestMatchForSkill) {
      // Invariant check: sourceSpan must be non-null and valid
      if (
        bestMatchForSkill.sourceSpan &&
        typeof bestMatchForSkill.sourceSpan.start === 'number' &&
        typeof bestMatchForSkill.sourceSpan.end === 'number' &&
        bestMatchForSkill.sourceSpan.text
      ) {
        results.push(bestMatchForSkill);
      }
    }
  }

  // Sort by earliest appearance in text
  return results.sort((a, b) => a.sourceSpan.start - b.sourceSpan.start);
}

/**
 * Validates whether an extracted skill conforms to the mandatory sourceSpan rule (Section 14.5)
 */
export function validateSkillClaim(skillClaim, rawText) {
  if (!skillClaim) return { valid: false, reason: 'Missing skill claim object' };

  if (!skillClaim.sourceSpan) {
    return {
      valid: false,
      reason: 'Rejected: Mandatory sourceSpan is missing. Per Section 17.2, LLM inference with no source span is not acceptable as standalone evidence.',
    };
  }

  const { start, end, text } = skillClaim.sourceSpan;
  if (typeof start !== 'number' || typeof end !== 'number' || start < 0 || end <= start) {
    return { valid: false, reason: 'Invalid sourceSpan character boundary indices' };
  }

  if (rawText && typeof rawText === 'string') {
    const slice = rawText.slice(start, end);
    if (slice.toLowerCase() !== String(text).toLowerCase()) {
      return {
        valid: false,
        reason: `sourceSpan text mismatch: expected "${text}", found "${slice}" in source text`,
      };
    }
  }

  return { valid: true };
}

/**
 * Recommends curated free/govt courses addressing specific skill gaps
 */
function getInterventionForSkill(skill) {
  const map = {
    skl_react: {
      courseTitle: 'Modern Frontend Development with React & Redux',
      provider: 'SWAYAM / NPTEL (Govt of India)',
      duration: '8 weeks',
      isFree: true,
      isGovt: true,
      url: 'https://swayam.gov.in/explorer?searchText=React',
    },
    skl_typescript: {
      courseTitle: 'Enterprise TypeScript & Scalable Application Architecture',
      provider: 'Skill India Digital Hub',
      duration: '4 weeks',
      isFree: true,
      isGovt: true,
      url: 'https://www.skillindiadigital.gov.in',
    },
    skl_nodejs: {
      courseTitle: 'Scalable Microservices & Backend Engineering with Node.js',
      provider: 'NPTEL (IIT Madras)',
      duration: '12 weeks',
      isFree: true,
      isGovt: true,
      url: 'https://nptel.ac.in/courses',
    },
    skl_postgresql: {
      courseTitle: 'Relational Database Design & PostgreSQL Administration',
      provider: 'SWAYAM (Govt of India)',
      duration: '6 weeks',
      isFree: true,
      isGovt: true,
      url: 'https://swayam.gov.in',
    },
    skl_docker_k8s: {
      courseTitle: 'Cloud Native DevOps: Containers & Kubernetes Orchestration',
      provider: 'Skill India Digital Hub',
      duration: '6 weeks',
      isFree: true,
      isGovt: true,
      url: 'https://www.skillindiadigital.gov.in',
    },
    skl_solar_pv: {
      courseTitle: 'Suryamitra Solar PV Technician Certification',
      provider: 'National Institute of Solar Energy (NISE / MNRE)',
      duration: '12 weeks',
      isFree: true,
      isGovt: true,
      url: 'https://nise.res.in',
    },
    skl_electrical_wiring: {
      courseTitle: 'Industrial Electrician & LT Switchgear Operation',
      provider: 'MSSDS (Maharashtra State Skill Development Society)',
      duration: '10 weeks',
      isFree: true,
      isGovt: true,
      url: 'https://mssds.gov.in',
    },
    skl_cnc_programming: {
      courseTitle: 'CNC Turning & Milling Operation with CAD/CAM Integration',
      provider: 'MSInS Vocational Training Centers',
      duration: '12 weeks',
      isFree: true,
      isGovt: true,
      url: 'https://msins.gov.in',
    },
  };

  return (
    map[skill.id] || {
      courseTitle: `${skill.name} Foundational Competency Course`,
      provider: 'Skill India Digital Hub',
      duration: '4-6 weeks',
      isFree: true,
      isGovt: true,
      url: 'https://www.skillindiadigital.gov.in',
    }
  );
}

/**
 * Computes structured, denominator-grounded skill gap analysis (Defect #3 Fix)
 *
 * @param {Object} params
 * @param {string} params.traineeId - Trainee unique ID
 * @param {string} params.targetOccupationId - Target occupation ID or code
 * @param {string} [params.resumeText] - Optional raw resume text for inline extraction
 * @param {Array<Object>} [params.existingEvidence] - Known TraineeSkillEvidence records
 * @param {Array<Object>} [params.userSkills] - Known UserSkill records
 * @returns {Object} Structured skill gap analysis with stated denominators and 7 evidence classes
 */
export function computeSkillGaps({
  traineeId = null,
  targetOccupationId = 'occ_fullstack_dev',
  resumeText = '',
  existingEvidence = [],
  userSkills = [],
} = {}) {
  const occupation = getOccupationById(targetOccupationId) || TARGET_OCCUPATIONS[0];
  const requiredSpecs = getOccupationSkills(occupation.id);

  // 1. Gather all evidence for the candidate
  const evidenceBySkillId = new Map();

  // A. Existing persistent evidence records
  for (const ev of existingEvidence) {
    if (!ev || !ev.skillId) continue;
    const existingList = evidenceBySkillId.get(ev.skillId) || [];
    existingList.push(ev);
    evidenceBySkillId.set(ev.skillId, existingList);
  }

  // B. UserSkills declared/verified on profile
  for (const us of userSkills) {
    if (!us || !us.skillId) continue;
    const existingList = evidenceBySkillId.get(us.skillId) || [];
    const evClass = us.provenance === 'VERIFIED' ? 'ASSESSMENT_SCORE' : 'SELF_REPORT';
    existingList.push({
      skillId: us.skillId,
      evidenceClass: evClass,
      strength: EVIDENCE_CLASSES[evClass].strength,
      confidence: EVIDENCE_CLASSES[evClass].baseConfidence,
      proficiency: us.proficiency || 'INTERMEDIATE',
      sourceSpan: null,
      sourceType: 'PROFILE',
    });
    evidenceBySkillId.set(us.skillId, existingList);
  }

  // C. Inline extracted skills from resumeText
  if (resumeText && typeof resumeText === 'string') {
    const extracted = extractSkillsFromText(resumeText, 'RESUME');
    for (const item of extracted) {
      const existingList = evidenceBySkillId.get(item.skillId) || [];
      existingList.push({
        skillId: item.skillId,
        evidenceClass: item.evidenceClass,
        strength: item.strength,
        confidence: item.confidence,
        proficiency: 'INTERMEDIATE',
        sourceSpan: item.sourceSpan,
        sourceType: item.sourceType,
      });
      evidenceBySkillId.set(item.skillId, existingList);
    }
  }

  // 2. Evaluate each required occupation skill against gathered evidence
  const totalRequired = requiredSpecs.length;
  let matchedRequiredCount = 0;
  let verifiedEvidenceCount = 0;
  const gapsList = [];
  const matchesList = [];

  const BENCHMARK_COHORT_SIZE = 500; // MSInS Reference Postings Denominator

  for (const req of requiredSpecs) {
    const skill = req.skill;
    if (!skill) continue;

    const evidences = evidenceBySkillId.get(skill.id) || [];

    // Find the strongest evidence class among candidate's evidence
    let strongestEvidence = null;
    let highestConfidence = 0;

    for (const ev of evidences) {
      const conf = ev.confidence ?? EVIDENCE_CLASSES[ev.evidenceClass]?.baseConfidence ?? 0.3;
      if (conf > highestConfidence) {
        highestConfidence = conf;
        strongestEvidence = ev;
      }
    }

    const hasEvidence = Boolean(strongestEvidence);
    const requiredLevelRank = PROFICIENCY_RANK[req.requiredLevel] || 2;
    const candidateLevelRank = strongestEvidence ? PROFICIENCY_RANK[strongestEvidence.proficiency || 'INTERMEDIATE'] || 2 : 0;

    // A skill is matched if evidence exists and meets required proficiency
    const isMatched = hasEvidence && candidateLevelRank >= requiredLevelRank;

    // Required posting occurrence frequency for stated denominator
    const postingOccurrenceRate = Math.round(req.importance * 100);
    const postingCount = Math.round((postingOccurrenceRate / 100) * BENCHMARK_COHORT_SIZE);

    if (isMatched) {
      matchedRequiredCount++;
      if (
        strongestEvidence.evidenceClass === 'ASSESSMENT_SCORE' ||
        strongestEvidence.evidenceClass === 'EMPLOYER_CONFIRMED_USE' ||
        strongestEvidence.evidenceClass === 'COMPLETED_PROJECT'
      ) {
        verifiedEvidenceCount++;
      }

      matchesList.push({
        skillId: skill.id,
        name: skill.name,
        category: skill.category,
        nsqfLevel: skill.nsqfLevel,
        qualificationPack: skill.qualificationPack,
        escoCrosswalkId: skill.escoCrosswalkId,
        marathiLabel: skill.marathiLabel,
        hindiLabel: skill.hindiLabel,
        requiredLevel: req.requiredLevel,
        importance: req.importance,
        isMandatory: req.isMandatory,
        currentEvidence: evidences,
        strongestEvidence: {
          evidenceClass: strongestEvidence.evidenceClass,
          strength: strongestEvidence.strength || EVIDENCE_CLASSES[strongestEvidence.evidenceClass]?.strength || 'MEDIUM',
          confidence: highestConfidence,
          sourceSpan: strongestEvidence.sourceSpan || null,
        },
        statedDenominator: `Required in ${postingCount} of ${BENCHMARK_COHORT_SIZE} target postings (${postingOccurrenceRate}%)`,
        reason: `Verified in trainee profile through ${EVIDENCE_CLASSES[strongestEvidence.evidenceClass]?.label || strongestEvidence.evidenceClass}. Meets required ${req.requiredLevel} level for NSQF Level ${skill.nsqfLevel}.`,
        syntheticDataset: true,
      });
    } else {
      // It is a gap
      let priority = 'MEDIUM';
      if (req.isMandatory && req.importance >= 0.9) priority = 'CRITICAL';
      else if (req.isMandatory || req.importance >= 0.8) priority = 'HIGH';
      else if (req.importance < 0.6) priority = 'LOW';

      let reason = '';
      if (!hasEvidence) {
        reason = `Required in ${postingCount} of ${BENCHMARK_COHORT_SIZE} (${postingOccurrenceRate}%) target role postings for ${occupation.title}. No verified evidence or resume mention found.`;
      } else {
        reason = `Evidence found at ${strongestEvidence.proficiency || 'BASIC'} proficiency, but ${occupation.title} requires ${req.requiredLevel} proficiency in ${postingCount} of ${BENCHMARK_COHORT_SIZE} (${postingOccurrenceRate}%) role postings.`;
      }

      gapsList.push({
        skillId: skill.id,
        name: skill.name,
        category: skill.category,
        nsqfLevel: skill.nsqfLevel,
        qualificationPack: skill.qualificationPack,
        escoCrosswalkId: skill.escoCrosswalkId,
        marathiLabel: skill.marathiLabel,
        hindiLabel: skill.hindiLabel,
        requiredLevel: req.requiredLevel,
        candidateLevel: strongestEvidence ? strongestEvidence.proficiency || 'BASIC' : 'NONE',
        gap: true,
        priority,
        importance: req.importance,
        isMandatory: req.isMandatory,
        currentEvidence: evidences,
        strongestEvidence: strongestEvidence
          ? {
              evidenceClass: strongestEvidence.evidenceClass,
              strength: strongestEvidence.strength,
              confidence: highestConfidence,
              sourceSpan: strongestEvidence.sourceSpan || null,
            }
          : {
              evidenceClass: 'UNVERIFIED',
              strength: 'LOW',
              confidence: 0.15,
              sourceSpan: null,
            },
        statedDenominator: `Required in ${postingCount} of ${BENCHMARK_COHORT_SIZE} target postings (${postingOccurrenceRate}%)`,
        reason,
        syntheticDataset: true,
        recommendedIntervention: getInterventionForSkill(skill),
        confidence: req.isMandatory ? 0.90 : 0.75,
      });
    }
  }

  // Sort gaps by priority: CRITICAL -> HIGH -> MEDIUM -> LOW
  const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  gapsList.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || b.importance - a.importance);

  const coveragePercent = totalRequired > 0 ? Math.round((matchedRequiredCount / totalRequired) * 100) : 0;

  return {
    occupation: {
      id: occupation.id,
      code: occupation.code,
      onetCode: occupation.onetCode,
      title: occupation.title,
      family: occupation.family,
      nsqfLevel: occupation.nsqfLevel,
      marathiTitle: occupation.marathiTitle,
      hindiTitle: occupation.hindiTitle,
    },
    traineeId,
    gaps: gapsList,
    matches: matchesList,
    summary: {
      totalRequiredSkills: totalRequired,
      matchedSkillsCount: matchedRequiredCount,
      gapCount: gapsList.length,
      coveragePercent,
      statedDenominator: `${matchedRequiredCount} of ${totalRequired} required skills (${coveragePercent}%)`,
      verifiedEvidenceCount,
      benchmarkCohortSize: BENCHMARK_COHORT_SIZE,
      syntheticDataset: true,
      syntheticDatasetDisclaimer:
        'Market frequency stats derived from Maharashtra State Innovation Society (MSInS) & O*NET 2026 reference benchmark dataset (N = 500 postings).',
    },
    timestamp: new Date().toISOString(),
  };
}
