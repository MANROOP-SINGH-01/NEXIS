/**
 * FILE: server/routes/interview.js
 * PURPOSE: Interview question generation and cross-questioning endpoints.
 * DEPENDENCIES: services/sarvam, services/interviewEngine, config
 * USED BY: server/index.js
 */

import { Router } from 'express'
import { GEMINI_API_KEY, DEFAULT_SARVAM_KEY, SARVAM_MODEL } from '../config.js'
import { structuredOutput } from '../services/aiRouter.js'

import { normalizeSarvamError } from '../utils/errors.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { aiLimiter } from '../middleware/rateLimit.js'
import agentActivityService from '../services/agentActivityService.js'

const router = Router()

router.post('/interview/brief', requireAuth, aiLimiter, async (req, res) => {
  const roleTitle = String(req.body?.roleTitle || '').trim()
  const seniority = String(req.body?.seniority || '').trim()
  const requiredGaps = Array.isArray(req.body?.requiredGaps) ? req.body.requiredGaps : []
  const niceGaps = Array.isArray(req.body?.niceGaps) ? req.body.niceGaps : []
  const matchedSkills = Array.isArray(req.body?.matchedSkills) ? req.body.matchedSkills : []
  const geminiKey = String(req.body?.key || GEMINI_API_KEY).trim()

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
    console.time('brief-gemini-total');
    const parsed = await structuredOutput({
      task: 'INTERVIEW_GENERATION',
      prompt,
      systemInstruction: 'You are Nexus-Strategist. Return strict JSON only, no markdown.',
      attempts: 3,
      timeout: 45000,
      schemaValidator: (obj) => {
        if (!obj || typeof obj !== 'object') throw new Error('Expected object payload');
        if (!Array.isArray(obj.focus_areas)) throw new Error('focus_areas must be an array');
        if (!Array.isArray(obj.gap_topics)) throw new Error('gap_topics must be an array');
      }
    })
    console.timeEnd('brief-gemini-total');

    res.json({
      focus_areas: Array.isArray(parsed.focus_areas) ? parsed.focus_areas.slice(0, 4) : [],
      gap_topics: Array.isArray(parsed.gap_topics) ? parsed.gap_topics.slice(0, 5) : [],
      key_strength_to_lead_with: String(parsed.key_strength_to_lead_with || ''),
      overall_readiness_note: String(parsed.overall_readiness_note || ''),
    })
  } catch (err) {
    res.status(503).json({
      error: 'AI Briefing generation failed. Please check AI provider configuration.',
      details: err instanceof Error ? err.message : 'Unknown error',
    })
  }
})


router.post('/interview/generate', requireAuth, aiLimiter, async (req, res) => {
  agentActivityService.logAgentEvent(req.user?.id || null, 'NEXUS_MIRROR', 'INTERVIEW_GENERATION_STARTED');
  const resume = String(req.body?.resume || '').trim()
  const jd = String(req.body?.jd || '').trim()
  const geminiKey = String(req.body?.key || GEMINI_API_KEY).trim()

  if (!resume || !jd) {
    res.status(400).json({ error: 'Resume and JD are required for interview generation.' })
    return
  }

  const prompt = [
    'Generate 8 interview question-answer pairs tailored to the candidate resume and job description.',
    'Output strict JSON array with objects:',
    '{ "question": string, "answer": string, "category": "technical"|"behavioral"|"system-design" }',
    `JOB DESCRIPTION:\n${jd}`,
    `RESUME:\n${resume}`,
  ].join('\n\n')

  try {
    console.time('generate-gemini-total');
    const parsed = await structuredOutput({
      task: 'INTERVIEW_GENERATION',
      prompt,
      systemInstruction: 'You are Nexus-Mirror. Return strict JSON array only, no markdown.',
      attempts: 3,
      timeout: 60000,
      schemaValidator: (arr) => {
        if (!Array.isArray(arr)) throw new Error('Expected array of interview questions');
      }
    })
    console.timeEnd('generate-gemini-total');

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
      throw new Error('Sarvam returned empty interview set')
    }

    agentActivityService.logAgentEvent(req.user?.id || null, 'NEXUS_MIRROR', 'INTERVIEW_GENERATION_COMPLETE');

    res.json({ items })
  } catch (err) {
    res.status(503).json({
      error: 'AI Interview generation failed. Please check AI provider configuration.',
      details: err instanceof Error ? err.message : 'Unknown error',
    })
  }
})

router.post('/interview/cross-question', requireAuth, aiLimiter, async (req, res) => {
  agentActivityService.logAgentEvent(req.user?.id || null, 'NEXUS_MIRROR', 'CROSS_QUESTION_STARTED');
  const question = String(req.body?.question || '').trim()
  const userAnswer = String(req.body?.answer || '').trim()
  const category = String(req.body?.category || 'technical').trim().toLowerCase()
  const key = String(req.body?.key || DEFAULT_SARVAM_KEY).trim()

  if (!question || !userAnswer) {
    res.status(400).json({ error: 'Question and answer are required.' })
    return
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
    console.time('cross-question-sarvam-total');
    const parsed = await structuredOutput({
      task: 'INTERVIEW_EVALUATION',
      messages: [
        { role: 'system', content: 'You are Nexus-Mirror. Return strict JSON only.' },
        { role: 'user', content: prompt },
      ],
      attempts: 3,
      timeout: 30000,
      schemaValidator: (obj) => {
        if (!obj || typeof obj !== 'object') throw new Error('Expected object payload');
        if (!obj.phaseA || typeof obj.phaseA !== 'object') throw new Error('Missing phaseA');
        if (!obj.phaseB || typeof obj.phaseB !== 'object') throw new Error('Missing phaseB');
      }
    })
    console.timeEnd('cross-question-sarvam-total');

    const phaseA = parsed.phaseA && typeof parsed.phaseA === 'object' ? parsed.phaseA : {}
    const phaseB = parsed.phaseB && typeof parsed.phaseB === 'object' ? parsed.phaseB : {}
    const delta = Number(parsed.pressureDelta)

    const payload = {
      phaseA: {
        detectedType: String(phaseA.detectedType || '').toLowerCase() === 'unsupported-quantitative-claim' ? 'unsupported-quantitative-claim' : String(phaseA.detectedType || '').toLowerCase() === 'technical-claim' ? 'technical-claim' : 'logic-gap',
        technicalClaim: String(phaseA.technicalClaim || '').trim(),
        logicGap: String(phaseA.logicGap || '').trim(),
        unsupportedQuantitativeClaim: String(phaseA.unsupportedQuantitativeClaim || '').trim(),
        thinOrNonTechnical: Boolean(phaseA.thinOrNonTechnical),
        reason: String(phaseA.reason || '').trim(),
      },
      phaseB: {
        followUpQuestion: String(phaseB.followUpQuestion || '').trim(),
      },
      pressureDelta: Number.isFinite(delta) ? Math.max(0, Math.min(30, Math.round(delta))) : 10,
      mode: 'sarvam',
    }

    if (!payload.phaseB.followUpQuestion) {
      throw new Error('Missing follow-up question in cross-questioning response')
    }

    agentActivityService.logAgentEvent(req.user?.id || null, 'NEXUS_MIRROR', 'CROSS_QUESTION_COMPLETE');

    res.json(payload)
  } catch (err) {
    res.status(503).json({
      error: 'AI Cross-Questioning failed. Please check AI provider configuration.',
      details: normalizeSarvamError(err),
    })
  }
})

export default router
