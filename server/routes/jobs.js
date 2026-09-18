/**
 * FILE: server/routes/jobs.js
 * PURPOSE: Nexus-Hunter job discovery endpoint.
 * DEPENDENCIES: services/gemini, services/serper, services/fallbacks, config
 * USED BY: server/index.js
 */

import { Router } from 'express'
import { SERPER_API_KEY, ADZUNA_APP_ID, ADZUNA_APP_KEY, GEMINI_API_KEY } from '../config.js'
import { structuredOutput } from '../services/aiRouter.js'
import { activeProviderSearch } from '../services/jobSearchProvider.js'
import { fallbackPrimeTargets } from '../services/fallbacks.js'
import { inferJobMetaFromLink } from '../utils/helpers.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { aiLimiter } from '../middleware/rateLimit.js'
import { calculateJobTrustScore, calculateMultiSignalMatch } from '../services/jobTrustEngine.js'
import agentActivityService from '../services/agentActivityService.js'

const router = Router()

// GET /api/jobs/discover — direct authenticated Adzuna job search
router.get('/jobs/discover', requireAuth, async (req, res) => {
  const query = String(req.query.what || req.query.targetRole || 'Software Engineer').trim()
  const location = String(req.query.country || req.query.location || 'in').trim().toLowerCase()
  
  try {
    const results = await activeProviderSearch({ query, location })
    if (results.length === 0) {
      return res.status(200).json({ results: [], total: 0, provider: 'adzuna', message: 'No live jobs found for query' })
    }
    return res.json({ results, total: results.length, provider: 'adzuna' })
  } catch (error) {
    console.error('[jobs.get] Error:', error.message)
    return res.status(502).json({ error: 'Adzuna provider temporarily unavailable', provider: 'adzuna' })
  }
})

router.post('/jobs/discover', requireAuth, aiLimiter, async (req, res) => {
  agentActivityService.logAgentEvent(req.user?.id || null, 'NEXUS_HUNTER', 'JOB_SEARCH_STARTED');
  const targetRole = String(req.body?.targetRole || 'Software Engineer').trim()
  const rawResume = String(req.body?.resume || '').trim()
  const resume = rawResume || `Technical candidate seeking ${targetRole} opportunities with practical experience in modern software architectures, state management, and reliable engineering workflows.`
  const geminiKey = String(req.body?.key || GEMINI_API_KEY).trim()
  const serperKey = String(req.body?.serperKey || SERPER_API_KEY || '').trim()
  const mode = req.body?.mode === 'reachable' ? 'reachable' : 'current'
  const skillProfile = req.body?.skillProfile || null



  let queryTerms = targetRole
  let extraPromptContext = ''

  if (skillProfile) {
    if (mode === 'reachable') {
      const candidateNames = new Set((skillProfile.candidate_skills || []).map((s) => s.skill.toLowerCase()))
      const gaps = (skillProfile.jd_required_skills || []).filter((s) => !candidateNames.has(s.toLowerCase()))
      if (gaps.length > 0) {
        queryTerms += ` ${gaps.slice(0, 2).join(' ')}`
      }
      extraPromptContext = `MODE: REACHABLE AFTER UPSKILLING\nThe candidate is currently upskilling and closing their skill gaps: ${gaps.join(', ')}. Evaluate alignment ASSUMING the candidate has already acquired these skills.`
    } else {
      const topSkills = (skillProfile.candidate_skills || []).filter((s) => s.demonstrated).map((s) => s.skill)
      if (topSkills.length > 0) {
        queryTerms += ` ${topSkills.slice(0, 2).join(' ')}`
      }
      extraPromptContext = `MODE: CURRENT FIT\nEvaluate alignment based strictly on the candidate's existing demonstrated skills.`
    }
  }

  try {
    const rawResults = await activeProviderSearch({ query: queryTerms }).catch(() => [])

    if (rawResults.length === 0) {
      return res.status(503).json({
        items: [],
        degraded: true,
        message: 'No active job listings found from the Adzuna provider for this role. (Gemini job hallucination has been disabled by reality audit).',
        mode: 'adzuna-provider',
      })
    }

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
        ].filter(Boolean).join('\n\n')

    const parsed = await structuredOutput({
      task: 'ATS_ANALYSIS',
      prompt,
      systemInstruction: 'You are Nexus-Hunter. Return strict JSON only.',
      attempts: 3,
      timeout: 45000,
      fallbackKeys: { gemini: geminiKey },
      schemaValidator: (arr) => {
        if (!Array.isArray(arr) || arr.length === 0) throw new Error('Expected non-empty array of prime targets');
      }
    })

    const realLinks = new Set(rawResults.map(r => r.link))
    const items = parsed
      .slice(0, 3)
      .map((it, idx) => {
        const fallbackLink = `https://www.google.com/search?q=${encodeURIComponent(targetRole + ' opportunities')}`
        let link = String(it?.application_link || '').trim()
        if (rawResults.length > 0 && !realLinks.has(link)) {
          const matchedJob = rawResults.find(r => 
            (r.title && it?.job_title && r.title.toLowerCase().includes(it.job_title.toLowerCase())) ||
            (r.company && it?.company_name && r.company.toLowerCase().includes(it.company_name.toLowerCase()))
          )
          link = matchedJob?.link || rawResults[idx]?.link || fallbackLink
        } else if (!link) {
          link = fallbackLink
        }
        const meta = inferJobMetaFromLink(link)
        const alignment = Math.max(0, Math.min(100, Math.round(Number(it?.alignment_score || 85))))
        const blueOceanBase = Math.max(0, Math.min(100, Math.round(Number(it?.blue_ocean_score || 80))))
        const blueOcean = Math.max(0, Math.min(100, blueOceanBase + (meta.blueOceanBoost || 0)))

        const trust = calculateJobTrustScore({
          company: it?.company_name,
          url: link,
          postedAt: it?.posted_at || rawResults[idx]?.posted_at,
          description: it?.nexus_match_reason || rawResults[idx]?.description,
          source: meta.source,
        })

        const multiSignal = calculateMultiSignalMatch({
          jobTitle: it?.job_title || targetRole,
          jobDescription: it?.nexus_match_reason || rawResults[idx]?.description || '',
          jobLocation: rawResults[idx]?.location || it?.location || '',
          candidateSkills: skillProfile?.candidate_skills || [],
          candidateLocation: req.body?.location || '',
          userTargetRole: targetRole,
          hasEvidence: Boolean(skillProfile?.candidate_skills?.some((s) => s.demonstrated)),
        })

        return {
          job_title: String(it?.job_title || `${targetRole} Specialist`).trim(),
          company_name: String(it?.company_name || 'Hiring Partner Network').trim(),
          application_link: link,
          nexus_match_reason: String(it?.nexus_match_reason || `Strong candidate match for ${targetRole}.`).trim(),
          alignment_score: alignment,
          blue_ocean_score: blueOcean,
          source: meta.source || 'adzuna-provider',
          competition_level: meta.competitionLevel || 'Low',
          ai_suggested: false,
          // P1.9 Job Trust Score
          trustScore: trust.trustScore,
          trustPercent: trust.trustPercent,
          trustLevel: trust.trustLevel,
          isLikelyGhost: trust.isLikelyGhost,
          isDirectAts: trust.isDirectAts,
          trustFactors: trust.factors,
          // P1.5 5-Factor Multi-Signal Scoring & Buckets
          skillScore: multiSignal.skillScore,
          experienceScore: multiSignal.experienceScore,
          titleScore: multiSignal.titleScore,
          projectScore: multiSignal.projectScore,
          locationScore: multiSignal.locationScore,
          overallScore: multiSignal.overallScore,
          bucket: multiSignal.bucket,
        }
      })
      .filter((x) => x.job_title && x.company_name && x.application_link)

    if (!items.length) {
      throw new Error('No valid prime targets after normalization')
    }

    agentActivityService.logAgentEvent(req.user?.id || null, 'NEXUS_HUNTER', 'JOB_SEARCH_COMPLETE');

    res.json({ items: items.slice(0, 3), mode: 'adzuna-provider' })
  } catch (err) {
    res.json({
      items: [],
      degraded: true,
      message: 'Job discovery is temporarily unavailable. Please check your API keys or try again later.',
      warning: err instanceof Error ? err.message : 'Job provider request failed.',
      mode: 'degraded',
    })
  }
})

export default router
