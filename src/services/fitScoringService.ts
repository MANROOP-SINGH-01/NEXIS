import { CareerPreferences, DiscoveredJob, FitEvaluation, FitRating, WorkHistoryProfile } from '../types';

/**
 * Fit Scoring Engine adapted from Proficiently Architecture
 * Evaluates jobs against explicit candidate constraints in strict order:
 * 1. Dealbreakers (instant SKIP if triggered)
 * 2. Must-Haves (HIGH if all met, MEDIUM if 1-2 missing, LOW if >2 missing)
 * 3. Nice-to-Haves (bonus scoring boost)
 * Returns a fully transparent, evidence-backed breakdown with zero mysterious numbers.
 */
export function evaluateJobFit(
  job: DiscoveredJob,
  preferences: CareerPreferences,
  profile?: WorkHistoryProfile
): FitEvaluation {
  const dealbreakersTriggered: string[] = [];
  const mustHavesMatched: string[] = [];
  const mustHavesMissing: string[] = [];
  const niceToHavesMatched: string[] = [];

  const requiredList = job.requiredSkills || [];
  const jobText = `${job.title} ${job.company} ${job.location || ''} ${job.description || ''} ${requiredList.join(' ')}`.toLowerCase();

  // ── 1. Dealbreaker Evaluation (Instant Disqualification) ────────────
  if (preferences.dealbreakers && preferences.dealbreakers.length > 0) {
    for (const dealbreaker of preferences.dealbreakers) {
      const dbLower = dealbreaker.toLowerCase().trim();
      if (!dbLower) continue;

      // Work mode dealbreakers
      if (dbLower.includes('no onsite') || dbLower.includes('remote only')) {
        const isStrictlyOnsite =
          (job.location?.toLowerCase().includes('on-site') || job.location?.toLowerCase().includes('onsite')) &&
          !job.location?.toLowerCase().includes('remote');
        if (isStrictlyOnsite) {
          dealbreakersTriggered.push(`Remote only required: Job is designated on-site (${job.location})`);
        }
      }

      // Keyword dealbreakers (e.g. "no legacy java", "no relocation")
      if (dbLower.includes('no ') && jobText.includes(dbLower.replace('no ', ''))) {
        dealbreakersTriggered.push(`Contains excluded requirement: "${dealbreaker}"`);
      }

      // Explicit clearance or visa constraint dealbreakers
      if (dbLower.includes('no clearance') && (jobText.includes('security clearance') || jobText.includes('ts/sci'))) {
        dealbreakersTriggered.push('Requires government security clearance which you excluded');
      }
    }
  }

  // Work Mode Preference Constraint
  if (preferences.workModes && preferences.workModes.length > 0) {
    const prefersOnlyRemote = preferences.workModes.length === 1 && preferences.workModes[0] === 'REMOTE';
    if (prefersOnlyRemote) {
      const isRemote =
        jobText.includes('remote') ||
        jobText.includes('work from home') ||
        job.location?.toLowerCase().includes('remote');
      if (!isRemote) {
        dealbreakersTriggered.push(`Remote-only required: Job location is "${job.location || 'Not specified as remote'}"`);
      }
    }
  }

  // Salary Floor Constraint
  if (preferences.minimumSalary && job.salary) {
    const minDesired = typeof preferences.minimumSalary === 'number'
      ? preferences.minimumSalary
      : parseInt(preferences.minimumSalary.replace(/[^0-9]/g, ''), 10);

    const salaryNums = job.salary.replace(/[^0-9-]/g, '').split('-').map((s) => parseInt(s, 10)).filter((n) => !isNaN(n));
    if (salaryNums.length > 0 && minDesired > 0) {
      const maxOffered = Math.max(...salaryNums);
      // Normalized check: if offered salary max is below candidate floor
      if (maxOffered > 0 && maxOffered < minDesired && maxOffered > 1000) {
        dealbreakersTriggered.push(`Salary below floor: Job offers up to ${job.salary}, minimum requested is ${preferences.minimumSalary}`);
      }
    }
  }

  if (dealbreakersTriggered.length > 0) {
    return {
      rating: 'SKIP',
      dealbreakersTriggered,
      mustHavesMatched: [],
      mustHavesMissing: preferences.mustHaves || [],
      niceToHavesMatched: [],
      scorePercent: 0,
      reason: `Disqualified by ${dealbreakersTriggered.length} dealbreaker(s): ${dealbreakersTriggered.join('; ')}`,
    };
  }

  // ── 2. Must-Haves Evaluation ──────────────────────────────────────────
  const candidateSkills = new Set<string>();
  if (profile) {
    profile.roles.forEach((r) => {
      r.tools.forEach((t) => candidateSkills.add(t.toLowerCase()));
      r.accomplishments.forEach((a) => {
        a.metrics.forEach((m) => candidateSkills.add(m.toLowerCase()));
      });
    });
    profile.superpowers.forEach((s) => candidateSkills.add(s.toLowerCase()));
  }

  // Also include skills from job.requiredSkills if user has them
  const targetMustHaves = preferences.mustHaves && preferences.mustHaves.length > 0
    ? preferences.mustHaves
    : (job.requiredSkills || []).slice(0, 4); // fallback to core required skills of the job

  for (const mustHave of targetMustHaves) {
    const mhLower = mustHave.toLowerCase().trim();
    if (!mhLower) continue;

    const matched =
      candidateSkills.has(mhLower) ||
      Array.from(candidateSkills).some((cs) => cs.includes(mhLower) || mhLower.includes(cs)) ||
      job.matchedSkills?.some((ms) => ms.toLowerCase().includes(mhLower));

    if (matched) {
      mustHavesMatched.push(mustHave);
    } else {
      mustHavesMissing.push(mustHave);
    }
  }

  // ── 3. Nice-to-Haves Evaluation ───────────────────────────────────────
  if (preferences.niceToHaves && preferences.niceToHaves.length > 0) {
    for (const niceToHave of preferences.niceToHaves) {
      const nthLower = niceToHave.toLowerCase().trim();
      if (!nthLower) continue;

      const matched =
        candidateSkills.has(nthLower) ||
        jobText.includes(nthLower) ||
        job.matchedSkills?.some((ms) => ms.toLowerCase().includes(nthLower));

      if (matched) {
        niceToHavesMatched.push(niceToHave);
      }
    }
  }

  // ── 4. Rating & Score Calculation ─────────────────────────────────────
  let rating: FitRating = 'LOW';
  const totalMustHaves = targetMustHaves.length || 1;
  const mustHaveRatio = mustHavesMatched.length / totalMustHaves;

  if (mustHavesMissing.length === 0 && mustHaveRatio >= 0.8) {
    rating = 'HIGH';
  } else if (mustHavesMissing.length <= 1 && mustHaveRatio >= 0.5) {
    rating = 'MEDIUM';
  } else {
    rating = 'LOW';
  }

  // Score percent calculation (Must-haves = 70% weight, Nice-to-haves = 30% weight)
  const mustHaveScore = mustHaveRatio * 70;
  const niceToHaveScore = preferences.niceToHaves && preferences.niceToHaves.length > 0
    ? (niceToHavesMatched.length / preferences.niceToHaves.length) * 30
    : 20; // default baseline if no nice-to-haves specified

  const finalScorePercent = Math.min(100, Math.round(mustHaveScore + niceToHaveScore));

  const reasonParts: string[] = [];
  if (mustHavesMatched.length > 0) {
    reasonParts.push(`Matches ${mustHavesMatched.length}/${totalMustHaves} must-haves: ${mustHavesMatched.slice(0, 3).join(', ')}`);
  }
  if (mustHavesMissing.length > 0) {
    reasonParts.push(`Missing: ${mustHavesMissing.join(', ')}`);
  }
  if (niceToHavesMatched.length > 0) {
    reasonParts.push(`Includes nice-to-haves: ${niceToHavesMatched.join(', ')}`);
  }

  return {
    rating,
    dealbreakersTriggered: [],
    mustHavesMatched,
    mustHavesMissing,
    niceToHavesMatched,
    scorePercent: finalScorePercent,
    reason: reasonParts.join(' • ') || 'Good baseline fit for target role criteria.',
  };
}
