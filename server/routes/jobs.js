/**
 * FILE: server/routes/jobs.js
 * PURPOSE: Nexus-Hunter Job Discovery & Deterministic 6-Factor Matching Endpoint.
 * SPEC: Master Implementation Spec Section 4.2, Section 18.1-18.3, and Phase 7 (Defect #2 Fix).
 * RULES: Zero fallback to generic Google searches. Real clickable Adzuna postings only.
 */

import { Router } from 'express';
import { SERPER_API_KEY, ADZUNA_APP_ID, ADZUNA_APP_KEY, GEMINI_API_KEY } from '../config.js';
import { structuredOutput } from '../services/aiRouter.js';
import { activeProviderSearch, getProviderStatus } from '../services/jobSearchProvider.js';
import { inferJobMetaFromLink } from '../utils/helpers.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import {
  calculateJobTrustScore,
  calculateMultiSignalMatch,
  calculateAdzunaSixFactorMatch,
  DEFAULT_ADZUNA_WEIGHTS,
} from '../services/jobTrustEngine.js';
import agentActivityService from '../services/agentActivityService.js';

const router = Router();

/**
 * GET /api/jobs/weights — Inspect and configure the deterministic 6-factor matching weights
 */
router.get('/jobs/weights', (req, res) => {
  res.json({
    formula: 'M = 0.40S + 0.20E + 0.15L + 0.10Q + 0.10R + 0.05P',
    defaultWeights: DEFAULT_ADZUNA_WEIGHTS,
    descriptions: {
      S: 'Required-skill coverage (weight: 0.40)',
      E: 'Experience evidence (weight: 0.20)',
      L: 'Location compatibility (weight: 0.15)',
      Q: 'Qualification / certification match (weight: 0.10)',
      R: 'Role relevance to training (weight: 0.10)',
      P: 'Preference compatibility (weight: 0.05)',
    },
    attributionNotice: 'All job data sourced from Adzuna India API (developer.adzuna.com)',
  });
});

/**
 * GET /api/jobs/provider-status — Inspect Adzuna API health, rate limits, and licensing status
 */
router.get('/jobs/provider-status', (req, res) => {
  res.json(getProviderStatus());
});

/**
 * GET /api/jobs/discover — Direct authenticated Adzuna job search
 */
router.get('/jobs/discover', requireAuth, async (req, res) => {
  const query = String(req.query.what || req.query.targetRole || 'Software Engineer').trim();
  const location = String(req.query.country || req.query.location || 'in').trim().toLowerCase();

  try {
    const results = await activeProviderSearch({ query, location });
    return res.json({
      results,
      total: results.length,
      provider: 'adzuna',
      country: location,
      attribution: 'Jobs by Adzuna',
      attributionUrl: 'https://www.adzuna.in',
    });
  } catch (error) {
    console.error('[jobs.get] Error:', error.message);
    return res.status(502).json({ error: 'Adzuna provider temporarily unavailable', provider: 'adzuna' });
  }
});

/**
 * POST /api/jobs/discover — Nexus-Hunter AI Discovery & Deterministic 6-Factor Matching
 */
router.post('/jobs/discover', requireAuth, aiLimiter, async (req, res) => {
  agentActivityService.logAgentEvent(req.user?.id || null, 'NEXUS_HUNTER', 'JOB_SEARCH_STARTED');
  const targetRole = String(req.body?.targetRole || 'Software Engineer').trim();
  const rawResume = String(req.body?.resume || '').trim();
  const resume =
    rawResume ||
    `Technical candidate seeking ${targetRole} opportunities with practical experience in modern software architectures, state management, and reliable engineering workflows.`;
  const geminiKey = String(req.body?.key || GEMINI_API_KEY).trim();
  const mode = req.body?.mode === 'reachable' ? 'reachable' : 'current';
  const skillProfile = req.body?.skillProfile || null;
  const userWeights = req.body?.weights || DEFAULT_ADZUNA_WEIGHTS;

  let queryTerms = targetRole;
  let extraPromptContext = '';

  if (skillProfile) {
    if (mode === 'reachable') {
      const candidateNames = new Set((skillProfile.candidate_skills || []).map((s) => s.skill.toLowerCase()));
      const gaps = (skillProfile.jd_required_skills || []).filter((s) => !candidateNames.has(s.toLowerCase()));
      if (gaps.length > 0) {
        queryTerms += ` ${gaps.slice(0, 2).join(' ')}`;
      }
      extraPromptContext = `MODE: REACHABLE AFTER UPSKILLING\nThe candidate is currently upskilling and closing their skill gaps: ${gaps.join(
        ', '
      )}. Evaluate alignment ASSUMING the candidate has already acquired these skills.`;
    } else {
      const topSkills = (skillProfile.candidate_skills || []).filter((s) => s.demonstrated).map((s) => s.skill);
      if (topSkills.length > 0) {
        queryTerms += ` ${topSkills.slice(0, 2).join(' ')}`;
      }
      extraPromptContext = `MODE: CURRENT FIT\nEvaluate alignment based strictly on the candidate's existing demonstrated skills.`;
    }
  }

  try {
    const rawResults = await activeProviderSearch({ query: queryTerms, location: 'in' });

    if (rawResults.length === 0) {
      return res.status(503).json({
        items: [],
        degraded: true,
        message: 'No active job listings found from the Adzuna provider for this role.',
        mode: 'adzuna-provider',
      });
    }

    const candidateProfile = {
      skills: skillProfile?.candidate_skills || [{ skill: 'Core Engineering', demonstrated: true }],
      experienceYears: req.body?.experienceYears || 2,
      location: req.body?.location || 'Pune, Maharashtra',
      targetRole,
      education: req.body?.education || 'B.Tech in Computer Science',
      mode,
    };

    let items = [];

    // Optional LLM Reasoning step for prime target selection (guarded by valid key & bounded timeout)
    const hasValidKey = Boolean(geminiKey && geminiKey.length > 10 && !geminiKey.includes('placeholder') && !geminiKey.includes('test'));
    if (hasValidKey && !req.body?.deterministicOnly) {
      try {
        const prompt = [
          'You are Nexus-Hunter autonomous discovery engine (CrewAI style).',
          'Task: choose top 3 Prime Targets from discovered jobs using deep reasoning.',
          'Apply alignment filtering against the resume.',
          'Compute Blue Ocean preference.',
          extraPromptContext,
          'Return strict JSON array with exactly 3 objects and fields:',
          '{',
          '  "job_title": string,',
          '  "company_name": string,',
          '  "application_link": string,',
          '  "nexus_match_reason": string,',
          '  "alignment_score": number(0-100),',
          '  "blue_ocean_score": number(0-100)',
          '}',
          `TARGET ROLE: ${targetRole}`,
          `RESUME:\n${resume}`,
          `DISCOVERED JOB CANDIDATES:\n${JSON.stringify(rawResults, null, 2)}`,
        ]
          .filter(Boolean)
          .join('\n\n');

        const parsed = await structuredOutput({
          task: 'ATS_ANALYSIS',
          prompt,
          systemInstruction: 'You are Nexus-Hunter. Return strict JSON only.',
          attempts: 1,
          timeout: 6000,
          fallbackKeys: { gemini: geminiKey },
          schemaValidator: (arr) => {
            if (!Array.isArray(arr) || arr.length === 0) throw new Error('Expected non-empty array of prime targets');
          },
        });

      if (Array.isArray(parsed) && parsed.length > 0) {
        items = parsed.slice(0, 3).map((it, idx) => {
          // Zero Google Fallback Guarantee: Must be a real Adzuna link from rawResults
          const matchingRaw =
            rawResults.find(
              (r) =>
                (r.title && it?.job_title && r.title.toLowerCase().includes(it.job_title.toLowerCase())) ||
                (r.company && it?.company_name && r.company.toLowerCase().includes(it.company_name.toLowerCase()))
            ) || rawResults[idx] || rawResults[0];

          const link = matchingRaw?.link;
          const meta = inferJobMetaFromLink(link);

          // 6-Factor Deterministic Match
          const sixFactor = calculateAdzunaSixFactorMatch({
            job: matchingRaw,
            candidate: candidateProfile,
            weights: userWeights,
          });

          const trust = calculateJobTrustScore({
            company: matchingRaw.company,
            url: link,
            postedAt: matchingRaw.created,
            description: matchingRaw.description,
            source: 'adzuna',
          });

          return {
            job_title: matchingRaw.title,
            company_name: matchingRaw.company,
            application_link: link,
            nexus_match_reason: String(it?.nexus_match_reason || `Matched based on Adzuna 6-factor score (${sixFactor.matchScore}%).`).trim(),
            alignment_score: sixFactor.matchScore,
            blue_ocean_score: Math.max(0, Math.min(100, Math.round(Number(it?.blue_ocean_score || 80)))),
            source: 'adzuna',
            competition_level: meta.competitionLevel || 'Low',
            ai_suggested: false,
            // 6-Factor Breakdown (Master Spec Section 18.2)
            sixFactorMatch: sixFactor,
            trustScore: trust.trustScore,
            trustPercent: trust.trustPercent,
            trustLevel: trust.trustLevel,
            isLikelyGhost: trust.isLikelyGhost,
            isDirectAts: trust.isDirectAts,
            trustFactors: trust.factors,
          };
        });
      }
    } catch (aiErr) {
      console.warn('[jobs/discover] AI reasoning fallback, using deterministic matching directly:', aiErr.message);
    }
  }

  // If AI failed or returned empty, perform pure deterministic 6-factor ranking
    if (items.length === 0) {
      items = rawResults.slice(0, 3).map((raw) => {
        const sixFactor = calculateAdzunaSixFactorMatch({
          job: raw,
          candidate: candidateProfile,
          weights: userWeights,
        });

        const trust = calculateJobTrustScore({
          company: raw.company,
          url: raw.link,
          postedAt: raw.created,
          description: raw.description,
          source: 'adzuna',
        });

        return {
          job_title: raw.title,
          company_name: raw.company,
          application_link: raw.link,
          nexus_match_reason: `Deterministic 6-factor match score: ${sixFactor.matchScore}% (Skill coverage: ${sixFactor.breakdown.S}%, Experience: ${sixFactor.breakdown.E}%).`,
          alignment_score: sixFactor.matchScore,
          blue_ocean_score: 82,
          source: 'adzuna',
          competition_level: 'Low',
          ai_suggested: false,
          sixFactorMatch: sixFactor,
          trustScore: trust.trustScore,
          trustPercent: trust.trustPercent,
          trustLevel: trust.trustLevel,
          isLikelyGhost: trust.isLikelyGhost,
          isDirectAts: trust.isDirectAts,
          trustFactors: trust.factors,
        };
      });
    }

    agentActivityService.logAgentEvent(req.user?.id || null, 'NEXUS_HUNTER', 'JOB_SEARCH_COMPLETE');

    res.json({
      items,
      total: items.length,
      mode: 'adzuna-provider',
      matchingFormula: 'M = 0.40S + 0.20E + 0.15L + 0.10Q + 0.10R + 0.05P',
      attribution: {
        provider: 'Adzuna India',
        attributionBadgeRequired: true,
        attributionUrl: 'https://www.adzuna.in',
      },
    });
  } catch (err) {
    console.error('[jobs/discover] Error:', err);
    res.json({
      items: [],
      degraded: true,
      message: 'Job discovery is temporarily unavailable.',
      warning: err instanceof Error ? err.message : 'Job provider request failed.',
      mode: 'degraded',
    });
  }
});

export default router;
