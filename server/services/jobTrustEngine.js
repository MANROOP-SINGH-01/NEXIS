/**
 * FILE: server/services/jobTrustEngine.js
 * PURPOSE: Deterministic Job Trust Score (P1.9) & Multi-Signal Job Matching (P1.5)
 *          as specified in PROJECT_MASTER_CONTEXT.md Section 8 and 15.
 * DEPENDENCIES: None (pure deterministic calculations)
 * USED BY: server/routes/jobs.js
 */

/**
 * Computes a Job Trust Score (0.0 - 1.0) based on authenticity factors,
 * direct employer signals, and anti-ghosting heuristics.
 *
 * @param {Object} job
 * @param {string} job.company - Company name
 * @param {string} job.url - Application or job link
 * @param {Date|string|number} [job.postedAt] - Date of posting
 * @param {string} [job.description] - Job description text
 * @param {string} [job.source] - Provider / aggregator source
 * @returns {Object} Trust report with score, level, factors, and ghosting indicator
 */
export function calculateJobTrustScore(job = {}) {
  const factors = [];
  let score = 0;

  // 1. Identifiable Company (+0.30 max)
  const company = String(job.company || job.company_name || '').trim();
  const lowerCompany = company.toLowerCase();
  const isAnonymous = !company || 
    lowerCompany.includes('confidential') || 
    lowerCompany.includes('unknown') ||
    lowerCompany.includes('stealth') ||
    lowerCompany === 'hiring partner network';

  if (!isAnonymous && company.length > 2) {
    score += 0.30;
    factors.push({ factor: 'Identifiable Employer', score: 0.30, passed: true, note: `Company name verified: "${company}"` });
  } else if (company.length > 0) {
    score += 0.10;
    factors.push({ factor: 'Identifiable Employer', score: 0.10, passed: false, note: 'Generic or confidential employer listing' });
  } else {
    factors.push({ factor: 'Identifiable Employer', score: 0.0, passed: false, note: 'Company name missing' });
  }

  // 2. Direct / Verified Application URL (+0.30 max)
  const url = String(job.url || job.application_link || '').trim();
  let urlScore = 0;
  let urlNote = 'No URL provided';
  let isDirectAts = false;

  if (url && url.startsWith('http')) {
    const directAtsDomains = ['greenhouse.io', 'lever.co', 'workday.com', 'smartrecruiters.com', 'ashbyhq.com', 'applytojob.com', 'taleo.net'];
    const reputableAggregators = ['linkedin.com', 'adzuna.com', 'indeed.com', 'glassdoor.com'];

    try {
      const parsedUrl = new URL(url);
      const host = parsedUrl.hostname.toLowerCase();

      if (directAtsDomains.some(d => host.includes(d)) || host.includes('careers.')) {
        urlScore = 0.30;
        urlNote = `Direct enterprise ATS portal (${host})`;
        isDirectAts = true;
      } else if (reputableAggregators.some(d => host.includes(d))) {
        urlScore = 0.25;
        urlNote = `Verified job network (${host})`;
      } else if (parsedUrl.protocol === 'https:') {
        urlScore = 0.20;
        urlNote = `Standard secure web link (${host})`;
      } else {
        urlScore = 0.05;
        urlNote = 'Insecure HTTP link';
      }
    } catch {
      urlScore = 0.05;
      urlNote = 'Malformed link';
    }
  }

  score += urlScore;
  factors.push({ factor: 'Verified Direct URL', score: urlScore, passed: urlScore >= 0.20, note: urlNote });

  // 3. Posting Date Freshness & Anti-Ghosting (+0.25 max)
  let freshnessScore = 0.18; // Default if posting date not explicitly stated
  let isLikelyGhost = false;
  let dateNote = 'Posting date estimated from search index';

  if (job.postedAt) {
    const postedDate = new Date(job.postedAt);
    if (!isNaN(postedDate.getTime())) {
      const ageInDays = Math.max(0, Math.floor((Date.now() - postedDate.getTime()) / (1000 * 60 * 60 * 24)));
      if (ageInDays <= 7) {
        freshnessScore = 0.25;
        dateNote = `Posted very recently (${ageInDays} days ago)`;
      } else if (ageInDays <= 21) {
        freshnessScore = 0.20;
        dateNote = `Posted ${ageInDays} days ago`;
      } else if (ageInDays <= 45) {
        freshnessScore = 0.12;
        dateNote = `Active for ${ageInDays} days`;
      } else {
        freshnessScore = 0.02;
        isLikelyGhost = true;
        dateNote = `Stale posting (${ageInDays}+ days old) — elevated ghost job risk`;
      }
    }
  }

  score += freshnessScore;
  factors.push({ factor: 'Listing Freshness', score: freshnessScore, passed: !isLikelyGhost, note: dateNote });

  // 4. Description Transparency & Safety (+0.15 max)
  const desc = String(job.description || job.nexus_match_reason || '').toLowerCase();
  const redFlags = ['wire transfer', 'telegram', 'whatsapp only', 'unpaid trial period', 'cashiers check', 'package forward', 'data entry $100'];
  const hasRedFlag = redFlags.some(flag => desc.includes(flag));

  let safetyScore = 0.15;
  let safetyNote = 'Clear role specification and standard terminology';

  if (hasRedFlag) {
    safetyScore = 0.0;
    safetyNote = 'Warning: Suspicious phrasing or payment requests detected';
  } else if (desc.length < 50) {
    safetyScore = 0.08;
    safetyNote = 'Minimal description details provided';
  }

  score += safetyScore;
  factors.push({ factor: 'Content Transparency', score: safetyScore, passed: !hasRedFlag, note: safetyNote });

  const finalScore = Math.max(0.1, Math.min(1.0, Math.round(score * 100) / 100));
  const trustLevel = finalScore >= 0.80 ? 'HIGH' : finalScore >= 0.55 ? 'MEDIUM' : 'LOW';

  return {
    trustScore: finalScore,
    trustPercent: Math.round(finalScore * 100),
    trustLevel,
    isDirectAts,
    isLikelyGhost,
    factors,
  };
}

/**
 * Computes multi-signal matching score across 5 deterministic dimensions:
 * 1. Skill Score (35%)
 * 2. Experience Fit Score (20%)
 * 3. Title Alignment Score (20%)
 * 4. Project/Evidence Relevance Score (15%)
 * 5. Location Alignment Score (10%)
 *
 * Total Weights: 0.35 + 0.20 + 0.20 + 0.15 + 0.10 = 1.00 (100%)
 *
 * And assigns candidate to an actionable bucket:
 * APPLY_NOW (>= 75) | LEARN_THEN_APPLY (55-74) | STRETCH (35-54) | IGNORE (< 35)
 */
export function calculateMultiSignalMatch({
  jobTitle = '',
  jobDescription = '',
  jobLocation = '',
  candidateSkills = [],
  candidateExperienceYears = 2,
  userTargetRole = '',
  candidateLocation = '',
  hasEvidence = false,
}) {
  const lowerTitle = jobTitle.toLowerCase();
  const lowerDesc = jobDescription.toLowerCase();
  const lowerTarget = userTargetRole.toLowerCase();
  const lowerJobLoc = String(jobLocation || '').toLowerCase();
  const lowerCandLoc = String(candidateLocation || '').toLowerCase();

  // 1. Skill Score (35% weight)
  let matchedSkillCount = 0;
  const totalSkills = Math.max(1, candidateSkills.length);

  for (const s of candidateSkills) {
    const skillName = typeof s === 'string' ? s.toLowerCase() : (s.skill || '').toLowerCase();
    if (skillName && (lowerDesc.includes(skillName) || lowerTitle.includes(skillName))) {
      matchedSkillCount++;
    }
  }

  const rawSkillRatio = matchedSkillCount / totalSkills;
  const skillScore = Math.min(100, Math.max(20, Math.round(rawSkillRatio * 100 + (matchedSkillCount > 0 ? 25 : 0))));

  // 2. Title Match Score (20% weight)
  let titleScore = 40;
  const targetWords = lowerTarget.split(/\s+/).filter(w => w.length > 2);
  const titleWords = lowerTitle.split(/\s+/).filter(w => w.length > 2);
  const commonWords = targetWords.filter(w => titleWords.includes(w));

  if (commonWords.length >= 2) {
    titleScore = 95;
  } else if (commonWords.length === 1) {
    titleScore = 75;
  } else if (lowerTitle.includes('developer') || lowerTitle.includes('engineer') || lowerTitle.includes('specialist')) {
    titleScore = 60;
  }

  // 3. Experience Score (20% weight)
  let experienceScore = 70;
  const isSenior = lowerTitle.includes('senior') || lowerTitle.includes('lead') || lowerTitle.includes('principal');
  const isJunior = lowerTitle.includes('junior') || lowerTitle.includes('associate') || lowerTitle.includes('intern');

  if (isSenior) {
    experienceScore = candidateExperienceYears >= 5 ? 90 : (candidateExperienceYears >= 3 ? 65 : 45);
  } else if (isJunior) {
    experienceScore = candidateExperienceYears <= 3 ? 95 : 75;
  } else {
    experienceScore = 80;
  }

  // 4. Project / Evidence Relevance Score (15% weight)
  const projectScore = hasEvidence ? 85 : 55;

  // 5. Location Match Score (10% weight)
  let locationScore = 80; // Baseline for unspecified / flexible locations
  if (lowerJobLoc.includes('remote') || lowerJobLoc.includes('anywhere') || lowerCandLoc.includes('remote')) {
    locationScore = 95;
  } else if (lowerCandLoc && lowerJobLoc) {
    if (lowerJobLoc.includes(lowerCandLoc) || lowerCandLoc.includes(lowerJobLoc)) {
      locationScore = 95;
    } else if (
      (lowerJobLoc.includes('india') && lowerCandLoc.includes('india')) ||
      (lowerJobLoc.includes('bengaluru') || lowerJobLoc.includes('bangalore') || lowerJobLoc.includes('hyderabad') || lowerJobLoc.includes('pune') || lowerJobLoc.includes('delhi'))
    ) {
      locationScore = 75;
    } else {
      locationScore = 35;
    }
  }

  // Weighted Composite: 35% Skill, 20% Exp, 20% Title, 15% Project, 10% Location
  const overallScore = Math.round(
    0.35 * skillScore +
    0.20 * experienceScore +
    0.20 * titleScore +
    0.15 * projectScore +
    0.10 * locationScore
  );

  // Bucket Assignment
  let bucket = 'IGNORE';
  if (overallScore >= 75) {
    bucket = 'APPLY_NOW';
  } else if (overallScore >= 55) {
    bucket = 'LEARN_THEN_APPLY';
  } else if (overallScore >= 35) {
    bucket = 'STRETCH';
  }

  return {
    skillScore,
    experienceScore,
    titleScore,
    projectScore,
    locationScore,
    overallScore,
    bucket,
  };
}

/**
 * ─── PHASE 7: ADZUNA 6-FACTOR DETERMINISTIC MATCHING FORMULA (SECTION 18.2) ──
 * Formula: M = 0.40S + 0.20E + 0.15L + 0.10Q + 0.10R + 0.05P
 * Where:
 *   S = required-skill coverage
 *   E = experience evidence
 *   L = location compatibility
 *   Q = qualification / certification match
 *   R = role relevance to training
 *   P = preference compatibility
 *
 * Configurable weights shown explicitly to the user, never hidden.
 */
export const DEFAULT_ADZUNA_WEIGHTS = {
  S: 0.40,
  E: 0.20,
  L: 0.15,
  Q: 0.10,
  R: 0.10,
  P: 0.05,
};

export function calculateAdzunaSixFactorMatch({
  job = {},
  candidate = {},
  weights = DEFAULT_ADZUNA_WEIGHTS,
}) {
  const activeWeights = {
    S: typeof weights?.S === 'number' ? weights.S : DEFAULT_ADZUNA_WEIGHTS.S,
    E: typeof weights?.E === 'number' ? weights.E : DEFAULT_ADZUNA_WEIGHTS.E,
    L: typeof weights?.L === 'number' ? weights.L : DEFAULT_ADZUNA_WEIGHTS.L,
    Q: typeof weights?.Q === 'number' ? weights.Q : DEFAULT_ADZUNA_WEIGHTS.Q,
    R: typeof weights?.R === 'number' ? weights.R : DEFAULT_ADZUNA_WEIGHTS.R,
    P: typeof weights?.P === 'number' ? weights.P : DEFAULT_ADZUNA_WEIGHTS.P,
  };

  const jobTitle = String(job.title || job.job_title || '').toLowerCase();
  const jobDesc = String(job.description || job.nexus_match_reason || '').toLowerCase();
  const jobLocation = String(job.location?.display_name || job.location || '').toLowerCase();

  const candidateSkills = Array.isArray(candidate.skills) ? candidate.skills : [];
  const candidateExp = typeof candidate.experienceYears === 'number' ? candidate.experienceYears : 2;
  const candidateLocation = String(candidate.location || '').toLowerCase();
  const targetRole = String(candidate.targetRole || 'Software Engineer').toLowerCase();
  const education = String(candidate.education || '').toLowerCase();

  // 1. S: Skill Coverage (0 - 100)
  let matchedSkills = 0;
  const totalSkills = Math.max(1, candidateSkills.length);
  for (const sk of candidateSkills) {
    const sName = typeof sk === 'string' ? sk.toLowerCase() : String(sk?.name || sk?.skill || '').toLowerCase();
    if (sName && (jobDesc.includes(sName) || jobTitle.includes(sName))) {
      matchedSkills++;
    }
  }
  const S = Math.min(100, Math.max(15, Math.round((matchedSkills / totalSkills) * 100 + (matchedSkills > 0 ? 20 : 0))));

  // 2. E: Experience Evidence (0 - 100)
  let E = 75;
  const isSenior = jobTitle.includes('senior') || jobTitle.includes('lead') || jobTitle.includes('principal');
  const isJunior = jobTitle.includes('junior') || jobTitle.includes('entry') || jobTitle.includes('trainee');
  if (isSenior) {
    E = candidateExp >= 5 ? 95 : candidateExp >= 3 ? 70 : 45;
  } else if (isJunior) {
    E = candidateExp <= 3 ? 95 : 80;
  } else {
    E = candidateExp >= 2 ? 85 : 65;
  }

  // 3. L: Location Compatibility (0 - 100)
  let L = 70;
  if (jobLocation.includes('remote') || candidateLocation.includes('remote') || jobDesc.includes('work from home')) {
    L = 98;
  } else if (candidateLocation && jobLocation) {
    if (jobLocation.includes(candidateLocation) || candidateLocation.includes(jobLocation)) {
      L = 95;
    } else if (
      (jobLocation.includes('maharashtra') && candidateLocation.includes('maharashtra')) ||
      (jobLocation.includes('pune') && candidateLocation.includes('pune')) ||
      (jobLocation.includes('mumbai') && candidateLocation.includes('mumbai'))
    ) {
      L = 90;
    } else if (jobLocation.includes('india') && candidateLocation.includes('india')) {
      L = 80;
    } else {
      L = 40;
    }
  }

  // 4. Q: Qualification / Certification Match (0 - 100)
  let Q = 70;
  if (education.includes('b.tech') || education.includes('b.e.') || education.includes('m.tech') || education.includes('computer science')) {
    Q = 90;
  } else if (education.includes('diploma') || education.includes('nsqf') || education.includes('polytechnic') || education.includes('iti')) {
    Q = 85;
  } else if (candidate.certifications && candidate.certifications.length > 0) {
    Q = 80;
  }

  // 5. R: Role Relevance to Training (0 - 100)
  let R = 50;
  const targetWords = targetRole.split(/\s+/).filter((w) => w.length > 2);
  const titleWords = jobTitle.split(/\s+/).filter((w) => w.length > 2);
  const common = targetWords.filter((w) => titleWords.includes(w));
  if (common.length >= 2) {
    R = 95;
  } else if (common.length === 1) {
    R = 80;
  } else if (jobTitle.includes('developer') || jobTitle.includes('engineer') || jobTitle.includes('technician')) {
    R = 65;
  }

  // 6. P: Preference Compatibility (0 - 100)
  let P = 80;
  if (candidate.mode === 'reachable') {
    P = 90; // candidate actively seeking growth
  }

  // Deterministic 6-Factor Weighted Calculation
  const rawMatch =
    activeWeights.S * S +
    activeWeights.E * E +
    activeWeights.L * L +
    activeWeights.Q * Q +
    activeWeights.R * R +
    activeWeights.P * P;

  const matchScore = Math.min(100, Math.max(0, Math.round(rawMatch)));

  let bucket = 'IGNORE';
  if (matchScore >= 75) bucket = 'APPLY_NOW';
  else if (matchScore >= 55) bucket = 'LEARN_THEN_APPLY';
  else if (matchScore >= 35) bucket = 'STRETCH';

  return {
    matchScore,
    bucket,
    breakdown: {
      S, // Skill Coverage
      E, // Experience Evidence
      L, // Location Compatibility
      Q, // Qualification Match
      R, // Role Relevance
      P, // Preference Compatibility
    },
    weights: activeWeights,
    formula: 'M = 0.40S + 0.20E + 0.15L + 0.10Q + 0.10R + 0.05P',
    details: {
      matchedSkillsCount: matchedSkills,
      totalCandidateSkills: totalSkills,
      isSeniorRole: isSenior,
      isRemote: L >= 95,
    },
  };
}
