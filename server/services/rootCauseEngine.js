/**
 * FILE: server/services/rootCauseEngine.js
 * PURPOSE: Deterministic rule engine mapping observed signals to 10 root causes.
 * SPECIFICATION: Master Spec Section 14.5, 15.3, 19.5
 *
 * GUARANTEES:
 * - Deterministic, rule-based classification — no hallucinated causes.
 * - Exact mapping to 10 root-cause taxonomy categories.
 * - Evidence references collected for every diagnosed root cause.
 */

export const ROOT_CAUSES = {
  SKILL_MISMATCH: {
    code: 'SKILL_MISMATCH',
    name: 'Skill Mismatch',
    interventionType: 'REMEDIAL_MODULE',
    defaultTitle: 'Targeted Remedial Skill Module',
    defaultAction: 'Enroll in modular bridge skilling course focused on missing mandatory competencies.',
    targetAgent: 'NEXUS_STRATEGIST',
  },
  EXPERIENCE_GAP: {
    code: 'EXPERIENCE_GAP',
    name: 'Lack of Experience',
    interventionType: 'APPRENTICESHIP_MATCH',
    defaultTitle: 'NAPS Apprenticeship & Applied Project Placement',
    defaultAction: 'Match with structured 6-month industrial apprenticeship or project-based learning.',
    targetAgent: 'NEXUS_HUNTER',
  },
  LOCATION_MISMATCH: {
    code: 'LOCATION_MISMATCH',
    name: 'Location Mismatch',
    interventionType: 'LOCAL_MOBILITY',
    defaultTitle: 'Local Micro-Cluster Matching & Commute Support',
    defaultAction: 'Prioritize hyper-local employers within 15km or provide state transit pass facilitation.',
    targetAgent: 'NEXUS_HUNTER',
  },
  SALARY_MISMATCH: {
    code: 'SALARY_MISMATCH',
    name: 'Salary Mismatch',
    interventionType: 'CAREER_COUNSELLING',
    defaultTitle: 'Wage Progression & Market Benchmark Counselling',
    defaultAction: 'Provide transparent wage benchmarks and career ladder counselling for higher-band progression.',
    targetAgent: 'NEXUS_STRATEGIST',
  },
  TRANSPORT: {
    code: 'TRANSPORT',
    name: 'Transport Barrier',
    interventionType: 'LOCAL_MOBILITY',
    defaultTitle: 'Transit Pass Facilitation & Cluster Transport',
    defaultAction: 'Connect with employer bus routes or facilitate Maharashtra MSRTC concession.',
    targetAgent: 'NEXUS_HUNTER',
  },
  LANGUAGE: {
    code: 'LANGUAGE',
    name: 'Language Barrier',
    interventionType: 'REMEDIAL_MODULE',
    defaultTitle: 'Workplace Communication & English Bridge Course',
    defaultAction: 'Deliver targeted 15-day spoken English & workplace vocabulary module.',
    targetAgent: 'NEXUS_MIRROR',
  },
  INTERVIEW_PERFORMANCE: {
    code: 'INTERVIEW_PERFORMANCE',
    name: 'Interview Performance',
    interventionType: 'MOCK_INTERVIEW',
    defaultTitle: 'Nexus-Mirror AI Mock Interview Drills',
    defaultAction: 'Schedule 3 automated mock interview simulations with personalized answer coaching.',
    targetAgent: 'NEXUS_MIRROR',
  },
  COURSE_RELEVANCE: {
    code: 'COURSE_RELEVANCE',
    name: 'Course Relevance Deficit',
    interventionType: 'CURRICULUM_REVIEW',
    defaultTitle: 'District Curriculum Review & Modular Cross-Skilling',
    defaultAction: 'Recommend provider curriculum update to match local industrial park demands.',
    targetAgent: 'NEXUS_DIRECTOR',
  },
  EMPLOYER_DEMAND: {
    code: 'EMPLOYER_DEMAND',
    name: 'Low Employer Demand',
    interventionType: 'CURRICULUM_REVIEW',
    defaultTitle: 'Sector Capacity Reallocation & Dual-Trade Transition',
    defaultAction: 'Guide trainee toward adjacent high-demand occupational clusters in neighboring districts.',
    targetAgent: 'NEXUS_DIRECTOR',
  },
  CAREGIVING: {
    code: 'CAREGIVING',
    name: 'Caregiving Responsibility',
    interventionType: 'CAREER_COUNSELLING',
    defaultTitle: 'Flexible Remote & Gig-Work Opportunity Matching',
    defaultAction: 'Filter for hybrid/remote opportunities or flexible freelance micro-contracts.',
    targetAgent: 'NEXUS_STRATEGIST',
  },
};

export const INTERVENTION_TYPES = [
  'REMEDIAL_MODULE',
  'APPRENTICESHIP_MATCH',
  'LOCAL_MOBILITY',
  'CAREER_COUNSELLING',
  'MOCK_INTERVIEW',
  'CURRICULUM_REVIEW',
];

/**
 * Deterministically evaluates candidate signals and produces prioritized root cause diagnoses.
 * 
 * @param {Object} signals
 * @param {Array} [signals.skillGaps] - Detected skill deficiencies
 * @param {Array} [signals.applicationRejections] - Job applications rejected with recorded reasons
 * @param {Array} [signals.interviewScores] - Historical interview performance scores (0-100)
 * @param {Object} [signals.surveyFeedback] - Self-reported barriers from follow-up surveys
 * @param {number} [signals.districtDemandRatio] - Vacancy-to-trainee ratio in local district
 * @param {number} [signals.locationDistanceKm] - Commute distance to target employers
 * @param {number} [signals.unplacedDays] - Days elapsed since certification without placement
 * @param {boolean} [signals.relocationWillingness] - Whether trainee can relocate
 * @param {number} [signals.totalExperienceMonths] - Recorded experience in months
 * @param {any} [signals.candidateProfile] - Trainee profile object
 * @param {boolean} [signals.courseObsolescenceFlag] - Course obsolescence flag
 * @returns {Array<Object>} List of diagnosed root causes with confidence, priority, and evidence
 */
export function diagnoseRootCauses(signals = {}) {
  const diagnoses = [];

  // 1. SKILL_MISMATCH
  const missingSkills = (signals.skillGaps || []).filter(
    (g) => (typeof g === 'string') || (g && (g.isMissing || g.gap > 0 || g.importance >= 0.5))
  );
  const skillRejections = (signals.applicationRejections || []).filter(
    (r) => {
      const reason = typeof r === 'string' ? r : r.rejectionReason || r.reason;
      return reason && (reason.includes('SKILL') || reason.includes('QUALIFICATION'));
    }
  );

  if (missingSkills.length > 0 || skillRejections.length > 0) {
    const evidenceRefs = [];
    if (missingSkills.length > 0) {
      evidenceRefs.push(`MISSING_SKILLS: count=${missingSkills.length} [${missingSkills.slice(0, 3).map(s => typeof s === 'string' ? s : (s.skillName || s.name || 'unnamed')).join(', ')}]`);
    }
    if (skillRejections.length > 0) {
      evidenceRefs.push(`REJECTIONS_FOR_SKILL: count=${skillRejections.length}`);
    }
    const confidence = Math.min(0.95, 0.5 + (missingSkills.length * 0.1) + (skillRejections.length * 0.15));
    diagnoses.push({
      rootCause: ROOT_CAUSES.SKILL_MISMATCH.code,
      name: ROOT_CAUSES.SKILL_MISMATCH.name,
      confidence: parseFloat(confidence.toFixed(2)),
      priority: confidence >= 0.8 ? 'HIGH' : 'MEDIUM',
      evidenceRefs,
      recommendedIntervention: {
        type: ROOT_CAUSES.SKILL_MISMATCH.interventionType,
        title: ROOT_CAUSES.SKILL_MISMATCH.defaultTitle,
        action: ROOT_CAUSES.SKILL_MISMATCH.defaultAction,
        targetAgent: ROOT_CAUSES.SKILL_MISMATCH.targetAgent,
      },
    });
  }

  // 2. EXPERIENCE_GAP
  const expRejections = (signals.applicationRejections || []).filter(
    (r) => {
      const reason = typeof r === 'string' ? r : r.rejectionReason || r.reason;
      return reason && (reason.includes('EXPERIENCE') || reason.includes('TENURE'));
    }
  );
  const totalExperienceMonths = signals.totalExperienceMonths ?? (signals.candidateProfile?.yearsOfExperience ? signals.candidateProfile.yearsOfExperience * 12 : 0);
  const isZeroExp = totalExperienceMonths === 0;

  if (expRejections.length > 0 || (isZeroExp && signals.unplacedDays > 45)) {
    const evidenceRefs = [];
    if (expRejections.length > 0) evidenceRefs.push(`REJECTIONS_FOR_EXPERIENCE: count=${expRejections.length}`);
    if (isZeroExp) evidenceRefs.push('ZERO_FORMAL_EXPERIENCE_RECORDED');
    const confidence = expRejections.length > 0 ? 0.85 : 0.65;
    diagnoses.push({
      rootCause: ROOT_CAUSES.EXPERIENCE_GAP.code,
      name: ROOT_CAUSES.EXPERIENCE_GAP.name,
      confidence,
      priority: confidence >= 0.8 ? 'HIGH' : 'MEDIUM',
      evidenceRefs,
      recommendedIntervention: {
        type: ROOT_CAUSES.EXPERIENCE_GAP.interventionType,
        title: ROOT_CAUSES.EXPERIENCE_GAP.defaultTitle,
        action: ROOT_CAUSES.EXPERIENCE_GAP.defaultAction,
        targetAgent: ROOT_CAUSES.EXPERIENCE_GAP.targetAgent,
      },
    });
  }

  // 3. LOCATION_MISMATCH
  const locRejections = (signals.applicationRejections || []).filter(
    (r) => {
      const reason = typeof r === 'string' ? r : r.rejectionReason || r.reason;
      return reason && reason.includes('LOCATION');
    }
  );
  const distanceExcess = signals.locationDistanceKm && signals.locationDistanceKm > 30;
  const noRelocation = signals.relocationWillingness === false;

  if (locRejections.length > 0 || (distanceExcess && noRelocation) || signals.surveyFeedback?.location_mismatch) {
    const evidenceRefs = [];
    if (locRejections.length > 0) evidenceRefs.push(`REJECTIONS_FOR_LOCATION: count=${locRejections.length}`);
    if (distanceExcess) evidenceRefs.push(`COMMUTE_DISTANCE_KM: ${signals.locationDistanceKm}`);
    if (noRelocation) evidenceRefs.push('RELOCATION_CONSTRAINED');
    if (signals.surveyFeedback?.location_mismatch) evidenceRefs.push('SURVEY_LOCATION_CONSTRAINT_REPORTED');
    const confidence = locRejections.length > 0 ? 0.85 : 0.70;
    diagnoses.push({
      rootCause: ROOT_CAUSES.LOCATION_MISMATCH.code,
      name: ROOT_CAUSES.LOCATION_MISMATCH.name,
      confidence,
      priority: 'MEDIUM',
      evidenceRefs,
      recommendedIntervention: {
        type: ROOT_CAUSES.LOCATION_MISMATCH.interventionType,
        title: ROOT_CAUSES.LOCATION_MISMATCH.defaultTitle,
        action: ROOT_CAUSES.LOCATION_MISMATCH.defaultAction,
        targetAgent: ROOT_CAUSES.LOCATION_MISMATCH.targetAgent,
      },
    });
  }

  // 4. SALARY_MISMATCH
  const salRejections = (signals.applicationRejections || []).filter(
    (r) => {
      const reason = typeof r === 'string' ? r : r.rejectionReason || r.reason;
      return reason && (reason.includes('SALARY') || reason.includes('COMPENSATION'));
    }
  );
  if (salRejections.length > 0 || signals.surveyFeedback?.salary_below_expectation || signals.surveyFeedback?.salary_mismatch) {
    const evidenceRefs = [];
    if (salRejections.length > 0) evidenceRefs.push(`REJECTIONS_FOR_SALARY: count=${salRejections.length}`);
    if (signals.surveyFeedback?.salary_below_expectation) evidenceRefs.push('SURVEY_WAGE_EXPECTATION_GAP');
    diagnoses.push({
      rootCause: ROOT_CAUSES.SALARY_MISMATCH.code,
      name: ROOT_CAUSES.SALARY_MISMATCH.name,
      confidence: 0.80,
      priority: 'MEDIUM',
      evidenceRefs,
      recommendedIntervention: {
        type: ROOT_CAUSES.SALARY_MISMATCH.interventionType,
        title: ROOT_CAUSES.SALARY_MISMATCH.defaultTitle,
        action: ROOT_CAUSES.SALARY_MISMATCH.defaultAction,
        targetAgent: ROOT_CAUSES.SALARY_MISMATCH.targetAgent,
      },
    });
  }

  // 5. TRANSPORT
  if (signals.surveyFeedback?.commute_barrier || signals.surveyFeedback?.transport_deficit || signals.surveyFeedback?.transit_barrier) {
    diagnoses.push({
      rootCause: ROOT_CAUSES.TRANSPORT.code,
      name: ROOT_CAUSES.TRANSPORT.name,
      confidence: 0.85,
      priority: 'HIGH',
      evidenceRefs: ['SURVEY_TRANSIT_DEFICIT_REPORTED', 'COMMUTE_BARRIER_FLAG'],
      recommendedIntervention: {
        type: ROOT_CAUSES.TRANSPORT.interventionType,
        title: ROOT_CAUSES.TRANSPORT.defaultTitle,
        action: ROOT_CAUSES.TRANSPORT.defaultAction,
        targetAgent: ROOT_CAUSES.TRANSPORT.targetAgent,
      },
    });
  }

  // 6. LANGUAGE
  const langRejections = (signals.applicationRejections || []).filter(
    (r) => {
      const reason = typeof r === 'string' ? r : r.rejectionReason || r.reason;
      return reason && (reason.includes('COMMUNICATION') || reason.includes('LANGUAGE'));
    }
  );
  if (langRejections.length > 0 || signals.surveyFeedback?.language_barrier) {
    const evidenceRefs = [];
    if (langRejections.length > 0) evidenceRefs.push(`REJECTIONS_FOR_COMMUNICATION: count=${langRejections.length}`);
    if (signals.surveyFeedback?.language_barrier) evidenceRefs.push('SURVEY_LANGUAGE_BARRIER_REPORTED');
    diagnoses.push({
      rootCause: ROOT_CAUSES.LANGUAGE.code,
      name: ROOT_CAUSES.LANGUAGE.name,
      confidence: 0.80,
      priority: 'MEDIUM',
      evidenceRefs,
      recommendedIntervention: {
        type: ROOT_CAUSES.LANGUAGE.interventionType,
        title: ROOT_CAUSES.LANGUAGE.defaultTitle,
        action: ROOT_CAUSES.LANGUAGE.defaultAction,
        targetAgent: ROOT_CAUSES.LANGUAGE.targetAgent,
      },
    });
  }

  // 7. INTERVIEW_PERFORMANCE
  const interviewRejections = (signals.applicationRejections || []).filter(
    (r) => {
      const reason = typeof r === 'string' ? r : r.rejectionReason || r.reason;
      return reason && reason.includes('INTERVIEW');
    }
  );
  const lowInterviewScores = (signals.interviewScores || []).filter(
    (s) => (typeof s === 'number' ? s < 60 : (s.overallScore && s.overallScore < 60))
  );

  if (interviewRejections.length > 0 || lowInterviewScores.length > 0 || signals.surveyFeedback?.interview_struggle) {
    const evidenceRefs = [];
    if (interviewRejections.length > 0) evidenceRefs.push(`REJECTIONS_IN_INTERVIEW: count=${interviewRejections.length}`);
    if (lowInterviewScores.length > 0) evidenceRefs.push(`LOW_MOCK_INTERVIEW_SCORES: count=${lowInterviewScores.length}`);
    if (signals.surveyFeedback?.interview_struggle) evidenceRefs.push('SURVEY_INTERVIEW_ANXIETY_FLAG');
    const confidence = interviewRejections.length > 0 ? 0.90 : 0.75;
    diagnoses.push({
      rootCause: ROOT_CAUSES.INTERVIEW_PERFORMANCE.code,
      name: ROOT_CAUSES.INTERVIEW_PERFORMANCE.name,
      confidence,
      priority: confidence >= 0.85 ? 'HIGH' : 'MEDIUM',
      evidenceRefs,
      recommendedIntervention: {
        type: ROOT_CAUSES.INTERVIEW_PERFORMANCE.interventionType,
        title: ROOT_CAUSES.INTERVIEW_PERFORMANCE.defaultTitle,
        action: ROOT_CAUSES.INTERVIEW_PERFORMANCE.defaultAction,
        targetAgent: ROOT_CAUSES.INTERVIEW_PERFORMANCE.targetAgent,
      },
    });
  }

  // 8. COURSE_RELEVANCE
  if (signals.surveyFeedback?.course_unrelated_to_market || signals.courseObsolescenceFlag) {
    diagnoses.push({
      rootCause: ROOT_CAUSES.COURSE_RELEVANCE.code,
      name: ROOT_CAUSES.COURSE_RELEVANCE.name,
      confidence: 0.80,
      priority: 'MEDIUM',
      evidenceRefs: ['CURRICULUM_MARKET_MISALIGNMENT_REPORTED', 'OBSOLESCENCE_FLAG'],
      recommendedIntervention: {
        type: ROOT_CAUSES.COURSE_RELEVANCE.interventionType,
        title: ROOT_CAUSES.COURSE_RELEVANCE.defaultTitle,
        action: ROOT_CAUSES.COURSE_RELEVANCE.defaultAction,
        targetAgent: ROOT_CAUSES.COURSE_RELEVANCE.targetAgent,
      },
    });
  }

  // 9. EMPLOYER_DEMAND
  if (signals.districtDemandRatio !== undefined && signals.districtDemandRatio < 0.35) {
    diagnoses.push({
      rootCause: ROOT_CAUSES.EMPLOYER_DEMAND.code,
      name: ROOT_CAUSES.EMPLOYER_DEMAND.name,
      confidence: 0.85,
      priority: 'HIGH',
      evidenceRefs: [`DISTRICT_DEMAND_RATIO: ${signals.districtDemandRatio} (< 0.35 threshold)`],
      recommendedIntervention: {
        type: ROOT_CAUSES.EMPLOYER_DEMAND.interventionType,
        title: ROOT_CAUSES.EMPLOYER_DEMAND.defaultTitle,
        action: ROOT_CAUSES.EMPLOYER_DEMAND.defaultAction,
        targetAgent: ROOT_CAUSES.EMPLOYER_DEMAND.targetAgent,
      },
    });
  }

  // 10. CAREGIVING
  if (signals.surveyFeedback?.caregiving_obligations || signals.surveyFeedback?.domestic_care_constraint) {
    diagnoses.push({
      rootCause: ROOT_CAUSES.CAREGIVING.code,
      name: ROOT_CAUSES.CAREGIVING.name,
      confidence: 0.90,
      priority: 'HIGH',
      evidenceRefs: ['SURVEY_CAREGIVING_OBLIGATION_DECLARED'],
      recommendedIntervention: {
        type: ROOT_CAUSES.CAREGIVING.interventionType,
        title: ROOT_CAUSES.CAREGIVING.defaultTitle,
        action: ROOT_CAUSES.CAREGIVING.defaultAction,
        targetAgent: ROOT_CAUSES.CAREGIVING.targetAgent,
      },
    });
  }

  // Sort deterministically by confidence descending, then by code
  return diagnoses.sort((a, b) => b.confidence - a.confidence || a.rootCause.localeCompare(b.rootCause));
}
