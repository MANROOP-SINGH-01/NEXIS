/**
 * FILE: server/routes/interview.js
 * PURPOSE: Interview question generation, pre-briefing, and low-latency cross-questioning endpoints.
 * DEPENDENCIES: services/sarvam, services/interviewEngine, services/aiRouter, config
 * USED BY: server/index.js
 */

import { Router } from 'express'
import { GEMINI_API_KEY, DEFAULT_SARVAM_KEY, FAST_INTERVIEW_MODELS } from '../config.js'
import { structuredOutput } from '../services/aiRouter.js'
import { normalizeSarvamError } from '../utils/errors.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { aiLimiter } from '../middleware/rateLimit.js'
import agentActivityService from '../services/agentActivityService.js'
import {
  interviewCache,
  LATENCY_BUDGETS,
  getInterviewBriefCached,
  getInterviewQuestionsCached,
  crossQuestionWithFastPath,
  createSSEStreamHandler,
} from '../services/interviewEngine.js'

const router = Router()

/**
 * GET /api/interview/performance
 * Telemetry endpoint reporting cache efficiency, latency budgets, and active fast-tier model configuration.
 */
router.get('/interview/performance', requireAuth, (req, res) => {
  res.json({
    status: 'ok',
    agent: 'nexus-mirror',
    cache: interviewCache.getStats(),
    budgets: LATENCY_BUDGETS,
    fastModels: FAST_INTERVIEW_MODELS,
    timestamp: new Date().toISOString(),
  })
})

/**
 * POST /api/interview/brief
 * High-performance pre-interview briefing with in-memory caching and fast model fallback.
 */
router.post('/interview/brief', requireAuth, aiLimiter, async (req, res) => {
  const reqStart = Date.now()
  const roleTitle = String(req.body?.roleTitle || '').trim()
  const seniority = String(req.body?.seniority || '').trim()
  const requiredGaps = Array.isArray(req.body?.requiredGaps) ? req.body.requiredGaps : []
  const niceGaps = Array.isArray(req.body?.niceGaps) ? req.body.niceGaps : []
  const matchedSkills = Array.isArray(req.body?.matchedSkills) ? req.body.matchedSkills : []

  if (!roleTitle) {
    return res.status(400).json({ error: 'roleTitle is required for interview brief.' })
  }

  const prompt = [
    `You are Nexus-Strategist preparing a candidate for a ${seniority} ${roleTitle} interview.`,
    `The candidate's matched skills are: ${matchedSkills.join(', ') || 'various technical skills'}.`,
    `Their required skill gaps (topics they will be grilled on): ${requiredGaps.join(', ') || 'none identified'}.`,
    `Nice-to-have gaps: ${niceGaps.join(', ') || 'none'}.`,
    `Generate a focused pre-interview briefing with EXACTLY this JSON shape:`,
    `{`,
    `  "focus_areas": [{ "category": "technical"|"behavioral"|"system-design", "topic": string, "why": string, "tip": string }],`,
    `  "gap_topics": [{ "skill": string, "likely_question_angle": string, "prep_suggestion": string }],`,
    `  "key_strength_to_lead_with": string,`,
    `  "overall_readiness_note": string`,
    `}`,
    `Rules:`,
    `- focus_areas: exactly 4 entries, mix of technical, behavioral, system-design categories`,
    `- gap_topics: one entry per required gap skill (max 5)`,
    `- Be specific to the actual role title and seniority level — no generic boilerplate`,
    `- For gap_topics, give a concrete prep suggestion (e.g., "Build a toy X in 2 hours to get hands-on experience")`,
  ].join('\n\n')

  try {
    const briefResult = await getInterviewBriefCached({
      roleTitle,
      seniority,
      requiredGaps,
      niceGaps,
      matchedSkills,
      fetcher: async () => {
        try {
          const parsed = await structuredOutput({
            task: 'INTERVIEW_GENERATION',
            prompt,
            systemInstruction: 'You are Nexus-Strategist. Return strict JSON only, no markdown.',
            attempts: 1, // Snappy single attempt before fallback
            timeout: 6000, // 6s fast-tier budget
            modelCandidates: FAST_INTERVIEW_MODELS,
            schemaValidator: (obj) => {
              if (!obj || typeof obj !== 'object') throw new Error('Expected object payload')
              if (!Array.isArray(obj.focus_areas)) throw new Error('focus_areas must be an array')
              if (!Array.isArray(obj.gap_topics)) throw new Error('gap_topics must be an array')
            },
          })

          return {
            focus_areas: Array.isArray(parsed.focus_areas) ? parsed.focus_areas.slice(0, 4) : [],
            gap_topics: Array.isArray(parsed.gap_topics) ? parsed.gap_topics.slice(0, 5) : [],
            key_strength_to_lead_with: String(parsed.key_strength_to_lead_with || ''),
            overall_readiness_note: String(parsed.overall_readiness_note || ''),
          }
        } catch (err) {
          console.warn('[interview/brief] Fast AI call timed out or failed, using grounded role briefing:', err.message)
          return {
            focus_areas: [
              {
                category: 'technical',
                topic: `${roleTitle} Architecture & Core Patterns`,
                why: `Primary technical evaluation metric for ${seniority || 'engineering'} roles.`,
                tip: 'Anchor answers on latency, throughput trade-offs, and state management.',
              },
              {
                category: 'system-design',
                topic: 'Failure Recovery & Scalability',
                why: 'Evaluates resilience under production stress and traffic spikes.',
                tip: 'Walk through circuit breakers, retry policies, and idempotent mutations.',
              },
              {
                category: 'behavioral',
                topic: 'Production Incident Diagnosis',
                why: 'Measures systematic root-cause debugging and stakeholder communication.',
                tip: 'Use the STAR format with concrete verifiable metrics.',
              },
              {
                category: 'technical',
                topic: 'Data Modeling & Query Optimization',
                why: 'Critical for avoiding resource leaks and indexing bottlenecks.',
                tip: 'Highlight compound indices, connection pooling, and schema normalization.',
              },
            ],
            gap_topics: requiredGaps.slice(0, 5).map((skill) => ({
              skill,
              likely_question_angle: `Practical trade-offs and edge-case handling when implementing ${skill}`,
              prep_suggestion: `Build a minimal prototype in 2 hours verifying edge-case resilience with ${skill}.`,
            })),
            key_strength_to_lead_with: matchedSkills[0]
              ? `Demonstrated production proficiency in ${matchedSkills[0]}`
              : `Solid foundation in modular architectural design`,
            overall_readiness_note: `Candidate displays strong alignment for ${roleTitle}. Drill the ${requiredGaps.length} identified gap areas to maximize offer probability.`,
            fallback: true,
          }
        }
      },
    })

    const totalElapsed = Date.now() - reqStart
    res.setHeader('X-Response-Time-Ms', String(totalElapsed))
    return res.json({
      ...briefResult,
      timing_ms: totalElapsed,
    })
  } catch (err) {
    res.status(503).json({
      error: 'AI Briefing generation failed. Please check AI provider configuration.',
      details: err instanceof Error ? err.message : 'Unknown error',
    })
  }
})

/**
 * POST /api/interview/generate
 * Generates tailored interview question pairs with in-memory caching and fast model fallback.
 */
router.post('/interview/generate', requireAuth, aiLimiter, async (req, res) => {
  const reqStart = Date.now()
  agentActivityService.logAgentEvent(req.user?.id || null, 'NEXUS_MIRROR', 'INTERVIEW_GENERATION_STARTED')
  const resume = String(req.body?.resume || '').trim()
  const jd = String(req.body?.jd || '').trim()

  if (!resume || !jd) {
    return res.status(400).json({ error: 'Resume and JD are required for interview generation.' })
  }

  const prompt = [
    'Generate 8 interview question-answer pairs tailored to the candidate resume and job description.',
    'Output strict JSON array with objects:',
    '{ "question": string, "answer": string, "category": "technical"|"behavioral"|"system-design" }',
    `JOB DESCRIPTION:\n${jd}`,
    `RESUME:\n${resume}`,
  ].join('\n\n')

  try {
    const questionResult = await getInterviewQuestionsCached({
      resume,
      jd,
      fetcher: async () => {
        const parsed = await structuredOutput({
          task: 'INTERVIEW_GENERATION',
          prompt,
          systemInstruction: 'You are Nexus-Mirror. Return strict JSON array only, no markdown.',
          attempts: 1,
          timeout: 7000, // 7s fast-tier budget
          modelCandidates: FAST_INTERVIEW_MODELS,
          schemaValidator: (arr) => {
            if (!Array.isArray(arr)) throw new Error('Expected array of interview questions')
          },
        })

        const items = (Array.isArray(parsed) ? parsed : [])
          .slice(0, 8)
          .map((item, idx) => ({
            id: `nmx_${Date.now()}_${idx}`,
            question: String(item?.question || '').trim(),
            answer: String(item?.answer || '').trim(),
            category: ['technical', 'behavioral', 'system-design'].includes(String(item?.category || '').toLowerCase())
              ? String(item.category).toLowerCase()
              : (idx % 3 === 0 ? 'technical' : idx % 3 === 1 ? 'behavioral' : 'system-design'),
          }))
          .filter((x) => x.question && x.answer)

        if (items.length === 0) {
          throw new Error('AI provider returned empty interview question set')
        }

        return { items }
      },
    })

    const totalElapsed = Date.now() - reqStart
    res.setHeader('X-Response-Time-Ms', String(totalElapsed))
    agentActivityService.logAgentEvent(req.user?.id || null, 'NEXUS_MIRROR', 'INTERVIEW_GENERATION_COMPLETE', {
      cached: questionResult.cached,
      timing_ms: totalElapsed,
    })

    return res.json({
      ...questionResult,
      timing_ms: totalElapsed,
    })
  } catch (err) {
    console.warn('[interview/generate] Unexpected failure, falling back to grounded questions:', err.message)
    const fallbackItems = [
      {
        id: `nmx_${Date.now()}_0`,
        question: 'How have you architected and scaled production applications in your technical projects?',
        answer: 'I focused on modular code separation, strict interface typing, automated testing, and optimizing query and network performance with proper indexing.',
        category: 'technical',
      },
      {
        id: `nmx_${Date.now()}_1`,
        question: 'Can you walk through a complex production debugging incident you diagnosed and resolved?',
        answer: 'I systematically traced logs, isolated the failure with a minimal reproducible test case, implemented the fix safely, and verified zero regressions.',
        category: 'behavioral',
      },
      {
        id: `nmx_${Date.now()}_2`,
        question: 'How do you design backend services and data models for high fault-tolerance and clean error recovery?',
        answer: 'I enforce schema validation, graceful degradation fallbacks, idempotent mutations, and granular transactional boundaries.',
        category: 'system-design',
      },
    ]

    const totalElapsed = Date.now() - reqStart
    res.setHeader('X-Response-Time-Ms', String(totalElapsed))
    agentActivityService.logAgentEvent(req.user?.id || null, 'NEXUS_MIRROR', 'INTERVIEW_GENERATION_COMPLETE', { fallback: true })
    return res.json({ items: fallbackItems, fallback: true, timing_ms: totalElapsed, cached: false })
  }
})

/**
 * POST /api/interview/cross-question
 * Recursive cross-questioning with sub-1ms heuristic phase A detection, fast-tier LLM grilling,
 * in-memory caching, and optional Server-Sent Events (SSE) streaming support.
 */
router.post('/interview/cross-question', requireAuth, aiLimiter, async (req, res) => {
  const reqStart = Date.now()
  agentActivityService.logAgentEvent(req.user?.id || null, 'NEXUS_MIRROR', 'CROSS_QUESTION_STARTED')
  const question = String(req.body?.question || '').trim()
  const userAnswer = String(req.body?.answer || '').trim()
  const category = String(req.body?.category || 'technical').trim().toLowerCase()
  const wantsStream =
    req.headers.accept?.includes('text/event-stream') ||
    req.query.stream === 'true' ||
    req.body?.stream === true

  if (!question || !userAnswer) {
    return res.status(400).json({ error: 'Question and answer are required.' })
  }

  let sse = null
  if (wantsStream) {
    sse = createSSEStreamHandler(res)
    sse.send('start', { timestamp: new Date().toISOString(), agent: 'nexus-mirror' })
  }

  const prompt = [
    'You are Nexus-Mirror operating in Recursive Cross-Questioning mode.',
    'Phase A (Scan): analyze the user answer and identify either ONE concrete technical claim, a Logic Gap, or an unsupported quantitative claim (e.g., "improved performance by 50%" without explaining how).',
    'Phase B (Grill): as a skeptical lead engineer, produce ONE challenging follow-up question strictly grounded in the Phase A finding.',
    'Return strict JSON with this shape only:',
    '{',
    '  "phaseA": {',
    '    "detectedType": "technical-claim"|"logic-gap"|"unsupported-quantitative-claim",',
    '    "technicalClaim": string,',
    '    "logicGap": string,',
    '    "unsupportedQuantitativeClaim": string,',
    '    "thinOrNonTechnical": boolean,',
    '    "reason": string',
    '  },',
    '  "phaseB": { "followUpQuestion": string },',
    '  "pressureDelta": number',
    '}',
    'Rules:',
    '- If answer is vague, generic, or non-technical, set thinOrNonTechnical=true and pressureDelta between 15 and 25.',
    '- If answer is strong technical, set pressureDelta between 5 and 12.',
    '- Ask only one follow-up question.',
    `CATEGORY: ${category}`,
    `QUESTION: ${question}`,
    `ANSWER: ${userAnswer}`,
  ].join('\n\n')

  try {
    const result = await crossQuestionWithFastPath({
      question,
      userAnswer,
      category,
      streamCallback: sse
        ? (msg) => {
            sse.send(msg.event, msg.data)
          }
        : null,
      fetcher: async () => {
        const parsed = await structuredOutput({
          task: 'INTERVIEW_EVALUATION',
          messages: [
            { role: 'system', content: 'You are Nexus-Mirror. Return strict JSON only.' },
            { role: 'user', content: prompt },
          ],
          attempts: 1,
          timeout: 5000, // Snappy 5s budget
          modelCandidates: FAST_INTERVIEW_MODELS,
          schemaValidator: (obj) => {
            if (!obj || typeof obj !== 'object') throw new Error('Expected object payload')
            if (!obj.phaseA || typeof obj.phaseA !== 'object') throw new Error('Missing phaseA')
            if (!obj.phaseB || typeof obj.phaseB !== 'object') throw new Error('Missing phaseB')
          },
        })

        const phaseA = parsed.phaseA && typeof parsed.phaseA === 'object' ? parsed.phaseA : {}
        const phaseB = parsed.phaseB && typeof parsed.phaseB === 'object' ? parsed.phaseB : {}
        const delta = Number(parsed.pressureDelta)

        const followUpQuestion = String(phaseB.followUpQuestion || '').trim()
        if (!followUpQuestion) {
          throw new Error('Missing follow-up question in cross-questioning response')
        }

        return {
          phaseA: {
            detectedType:
              String(phaseA.detectedType || '').toLowerCase() === 'unsupported-quantitative-claim'
                ? 'unsupported-quantitative-claim'
                : String(phaseA.detectedType || '').toLowerCase() === 'technical-claim'
                  ? 'technical-claim'
                  : 'logic-gap',
            technicalClaim: String(phaseA.technicalClaim || '').trim(),
            logicGap: String(phaseA.logicGap || '').trim(),
            unsupportedQuantitativeClaim: String(phaseA.unsupportedQuantitativeClaim || '').trim(),
            thinOrNonTechnical: Boolean(phaseA.thinOrNonTechnical),
            reason: String(phaseA.reason || '').trim(),
          },
          phaseB: {
            followUpQuestion,
          },
          pressureDelta: Number.isFinite(delta) ? Math.max(0, Math.min(30, Math.round(delta))) : 10,
          mode: 'gemini-fast',
        }
      },
    })

    const totalElapsed = Date.now() - reqStart
    agentActivityService.logAgentEvent(req.user?.id || null, 'NEXUS_MIRROR', 'CROSS_QUESTION_COMPLETE', {
      cached: result.cached,
      timing_ms: totalElapsed,
    })

    if (sse) {
      sse.end({ ...result, timing_ms: totalElapsed })
      return
    }

    res.setHeader('X-Response-Time-Ms', String(totalElapsed))
    return res.json({
      ...result,
      timing_ms: totalElapsed,
    })
  } catch (err) {
    if (sse) {
      sse.send('error', { error: normalizeSarvamError(err) })
      sse.end()
      return
    }
    return res.status(503).json({
      error: 'AI Cross-Questioning failed. Please check AI provider configuration.',
      details: normalizeSarvamError(err),
    })
  }
})

/**
 * GET/POST /api/interview/stream
 * Dedicated streaming endpoint for interactive Nexus-Mirror cross-question drills.
 */
router.all('/interview/stream', requireAuth, aiLimiter, async (req, res) => {
  const question = String((req.method === 'GET' ? req.query.question : req.body?.question) || '').trim()
  const userAnswer = String((req.method === 'GET' ? req.query.answer : req.body?.answer) || '').trim()
  const category = String((req.method === 'GET' ? req.query.category : req.body?.category) || 'technical').trim().toLowerCase()

  if (!question || !userAnswer) {
    return res.status(400).json({ error: 'Question and answer parameters are required for interview streaming.' })
  }

  const sse = createSSEStreamHandler(res)
  sse.send('start', { timestamp: new Date().toISOString(), agent: 'nexus-mirror' })

  try {
    const result = await crossQuestionWithFastPath({
      question,
      userAnswer,
      category,
      streamCallback: (msg) => {
        sse.send(msg.event, msg.data)
      },
      fetcher: null, // Streaming fast path executes instant heuristic scan and response
    })
    sse.end(result)
  } catch (err) {
    sse.send('error', { error: err.message })
    sse.end()
  }
})

export default router
