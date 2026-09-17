import { Router } from 'express'
import { PDFParse } from 'pdf-parse'
import prisma from '../lib/prisma.js'
import { upload } from '../middleware/upload.js'
import { GEMINI_API_KEY, DEFAULT_SARVAM_KEY, DEFAULT_RESUME_STRUCTURER_KEY } from '../config.js'
import { generate, structuredOutput } from '../services/aiRouter.js'
import {
  buildFallbackStrategist,
  buildFallbackTailoredResume,
  buildAnalysis,
  normalizeAnalysisShape,
  normalizeStructuredResume,
  structuredToResumeText,
  ensureStructuredResume,
  normalizeSkillProfile,
  buildFallbackSkillProfile,
} from '../services/resumeBuilder.js'
import { buildResumePdfFromStructured } from '../services/pdfGenerator.js'
import { normalizeSarvamError, requireEnv } from '../utils/errors.js'
import { tryParseJsonLoose } from '../utils/helpers.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { aiLimiter } from '../middleware/rateLimit.js'
import agentActivityService from '../services/agentActivityService.js'

const router = Router()

router.post('/resume/extract', requireAuth, aiLimiter, upload.single('resumePdf'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Missing resume PDF file' })
    return
  }

  try {
    const parser = new PDFParse({ data: req.file.buffer })
    const textResult = await parser.getText()
    await parser.destroy()
    const text = (textResult.text || '').trim()
    if (!text) {
      res.status(422).json({ error: 'Unable to extract text from PDF' })
      return
    }

    res.json({
      fileName: req.file.originalname,
      pages: textResult.pages?.length || 1,
      text,
    })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to parse PDF' })
  }
})

router.post('/resume/bullet', requireAuth, aiLimiter, async (req, res) => {
  const userGeminiKey = req.body?.keys?.gemini
  const runtimeGeminiKey = userGeminiKey || GEMINI_API_KEY
  if (!requireEnv('GEMINI_API_KEY', runtimeGeminiKey, res)) return
  const repoData = req.body?.repoData
  if (!repoData) {
    res.status(400).json({ error: 'Missing repoData payload' })
    return
  }

  const prompt = `Based on these code commits ${JSON.stringify(repoData, null, 2)}, write one high-impact, quantified resume bullet point using Action Verbs.`

  try {
    const bullet = await generate({
      task: 'RESUME_TAILOR',
      prompt,
      systemInstruction: 'You are Nexus-Writer. Output exactly one resume bullet as plain text with measurable impact.',
      fallbackKeys: { gemini: runtimeGeminiKey }
    })
    res.json({ bullet: bullet || 'Improved system reliability and delivery velocity across key repositories with measurable impact.' })
  } catch (err) {
    const fallbackBullet = `Engineered ${repoData?.repository || 'core services'} with ${repoData?.commits || 0}+ commit contributions, improving delivery velocity and production stability across high-impact features.`
    res.json({
      bullet: fallbackBullet,
      fallback: true,
      warning: '',
    })
  }
})

async function persistSkillGapSnapshotIfTrainee({ traineeId, jd, skillProfile, analysis }) {
  if (!traineeId || typeof traineeId !== 'string' || !traineeId.trim()) {
    return
  }

  try {
    const cleanTraineeId = traineeId.trim()
    const trainee = await prisma.trainee.findUnique({
      where: { id: cleanTraineeId },
      select: { id: true },
    })

    if (!trainee) {
      console.warn(`[resume/tailor] Trainee with ID "${cleanTraineeId}" not found; skipping snapshot persistence.`)
      return
    }

    const jdTitle = (
      skillProfile?.jd_role_title ||
      jd.split('\n').map((x) => x.trim()).filter(Boolean)[0] ||
      'Target Role'
    ).slice(0, 255)

    let missingSkills = []
    if (skillProfile && Array.isArray(skillProfile.jd_required_skills)) {
      const candidateSkillNames = new Set(
        (skillProfile.candidate_skills || []).map((s) => String(s?.skill || '').trim().toLowerCase())
      )
      const reqGaps = (skillProfile.jd_required_skills || []).filter(
        (s) => !candidateSkillNames.has(String(s).trim().toLowerCase())
      )
      const niceGaps = (skillProfile.jd_nice_to_have_skills || []).filter(
        (s) => !candidateSkillNames.has(String(s).trim().toLowerCase())
      )
      missingSkills = [...reqGaps, ...niceGaps]
    }
    if (missingSkills.length === 0 && Array.isArray(analysis?.skillGaps)) {
      missingSkills = analysis.skillGaps
        .filter((g) => g.status === 'gap' || g.status === 'needs-proof')
        .map((g) => g.skill)
    }

    const seen = new Set()
    const uniqueMissingSkills = []
    for (const s of missingSkills) {
      const trimmed = String(s || '').trim()
      if (trimmed && !seen.has(trimmed.toLowerCase())) {
        seen.add(trimmed.toLowerCase())
        uniqueMissingSkills.push(trimmed)
      }
    }

    const atsScore = typeof analysis?.atsCompatibility === 'number' ? analysis.atsCompatibility : null

    await prisma.skillGapSnapshot.create({
      data: {
        traineeId: trainee.id,
        jdTitle,
        missingSkills: JSON.stringify(uniqueMissingSkills),
        atsScore,
      },
    })
  } catch (err) {
    console.warn('[resume/tailor] Failed to persist SkillGapSnapshot:', err)
  }
}

router.post('/resume/tailor', requireAuth, aiLimiter, async (req, res) => {
  // Start event
  agentActivityService.logAgentEvent(req.user?.id || null, 'NEXUS_DIRECTOR', 'RESUME_OPTIMIZATION_STARTED');

  const resume = String(req.body?.resume || '').trim()
  const jd = String(req.body?.jd || '').trim()
  const traineeId = req.body?.traineeId
  const keys = req.body?.keys || {}
  const runtimeSarvamKey = String(keys.sarvam || DEFAULT_SARVAM_KEY || '').trim()
  const runtimeGeminiKey = String(keys.gemini || GEMINI_API_KEY || '').trim()
  const structurerKey = String(keys.structurer || DEFAULT_RESUME_STRUCTURER_KEY).trim()

  if (!resume || !jd) {
    res.status(400).json({ error: 'Resume and JD are required.' })
    return
  }

  const hasAnyKey = Boolean(runtimeSarvamKey || runtimeGeminiKey)
  if (!hasAnyKey) {
    agentActivityService.logAgentEvent(req.user?.id || null, 'NEXUS_DIRECTOR', 'RESUME_OPTIMIZATION_FAILED', { error: 'No AI API keys configured (Sarvam/Gemini).' })
    res.status(503).json({ error: 'AI Structuring Service is currently offline. Missing valid credentials or provider is down.' })
    return
  }
  void structurerKey

  try {
    const singlePassPrompt = [
      'You are Nexus-Director & Nexus-Strategist. Build one complete, high-precision resume optimization and skill-gap analysis package.',
      '',
      '=== CRITICAL ACCURACY & GROUNDING CONSTRAINTS ===',
      '1. You must ONLY use information explicitly present in the candidate\'s original resume.',
      '2. NEVER invent, fabricate, or embellish skills, job titles, companies, achievements, dates, or metrics not found in the original resume text.',
      '3. Do NOT add skills from the JD to the candidate\'s profile or resume that the candidate has not demonstrated.',
      '4. Do NOT upgrade experience levels, project scopes, or impact numbers beyond what the resume states.',
      '',
      '=== SKILL GAP & ANALYSIS COMPUTATION RULES ===',
      '1. Extract CONCRETE, specific skills, tools, frameworks, and technologies actually present in the candidate resume (e.g. "PostgreSQL", "Docker", "Python", "React", "Kafka"). Do NOT include vague paraphrased soft categories.',
      '2. Extract CONCRETE requirements actually present in the pasted JD text.',
      '3. Distinguish REQUIRED skills (explicitly required/core in the JD) from NICE-TO-HAVE skills (bonus/preferred/implied by seniority).',
      '4. Compute gaps as a strict SET DIFFERENCE between JD requirements and candidate skills:',
      '   - "required gaps": JD required skills that are NOT demonstrated in the candidate resume.',
      '   - "nice-to-have gaps": JD nice-to-have skills that are NOT demonstrated in the candidate resume.',
      '5. BAN VAGUE SOFT-SKILL FILLER: Under no circumstances output generic filler like "communication skills", "team player", "problem-solving", "passionate", "critical thinking", "collaboration", "adaptability", "fast learner" unless the JD explicitly and specifically names them as an essential evaluation criteria.',
      '6. In "skillProfile.candidate_skills", mark demonstrated=true ONLY when the resume contains concrete evidence (used in a project bullet, job experience, or verified certification). Mark demonstrated=false if the skill is only mentioned in a standalone keyword list with no project context.',
      '7. In "analysis.skillGaps", provide a structured list of key skills evaluated with status:',
      '   - "verified": skill is required/preferred by JD AND candidate demonstrated concrete proof.',
      '   - "needs-proof": skill is mentioned by candidate but lacks measurable context or depth.',
      '   - "gap": skill is required or preferred by JD but completely missing from candidate resume.',
      '',
      '=== WORKED FEW-SHOT EXAMPLE ===',
      'Sample Resume:',
      '"Full Stack Developer with 3 years experience. Built REST APIs using Node.js, Express, and PostgreSQL. Implemented frontend interfaces with React and TailwindCSS. Deployed containers using Docker on AWS EC2."',
      'Sample JD:',
      '"Senior Backend Engineer. Requirements: 5+ years experience, Go (Golang), Kubernetes, PostgreSQL, gRPC, Distributed Systems. Nice-to-have: AWS, Kafka, Terraform."',
      'Expected Output Segment:',
      '{',
      '  "strategist": {',
      '    "priorities": ["Go (Golang)", "Kubernetes", "gRPC", "Distributed Systems"],',
      '    "gaps": ["Go (Golang)", "Kubernetes", "gRPC", "Distributed Systems", "Kafka", "Terraform"],',
      '    "strengths": ["PostgreSQL", "AWS", "Docker", "Node.js"]',
      '  },',
      '  "analysis": {',
      '    "atsCompatibility": 52,',
      '    "skillGaps": [',
      '      { "skill": "Go (Golang)", "status": "gap" },',
      '      { "skill": "Kubernetes", "status": "gap" },',
      '      { "skill": "gRPC", "status": "gap" },',
      '      { "skill": "Distributed Systems", "status": "gap" },',
      '      { "skill": "PostgreSQL", "status": "verified" },',
      '      { "skill": "AWS", "status": "verified" }',
      '    ],',
      '    "interviewReadiness": { "technicalDeepDive": 45, "behavioralQuestions": 70, "systemDesign": 50 }',
      '  },',
      '  "skillProfile": {',
      '    "jd_role_title": "Senior Backend Engineer",',
      '    "jd_seniority": "Senior",',
      '    "jd_required_skills": ["Go (Golang)", "Kubernetes", "PostgreSQL", "gRPC", "Distributed Systems"],',
      '    "jd_nice_to_have_skills": ["AWS", "Kafka", "Terraform"],',
      '    "candidate_skills": [',
      '      { "skill": "Node.js", "demonstrated": true },',
      '      { "skill": "Express", "demonstrated": true },',
      '      { "skill": "PostgreSQL", "demonstrated": true },',
      '      { "skill": "React", "demonstrated": true },',
      '      { "skill": "TailwindCSS", "demonstrated": true },',
      '      { "skill": "Docker", "demonstrated": true },',
      '      { "skill": "AWS", "demonstrated": true }',
      '    ],',
      '    "candidate_experience_summary": { "level": "Mid-level", "years": 3, "domains": ["Web Development", "Backend API"] }',
      '  }',
      '}',
      '',
      '=== TARGET JSON SCHEMA (Return ONLY valid JSON matching this schema) ===',
      '{',
      '  "strategist": { "priorities": string[], "gaps": string[], "strengths": string[] },',
      '  "analysis": {',
      '    "atsCompatibility": number(0-100),',
      '    "dimensions": {',
      '      "keywordAlignment": number(0-100),',
      '      "quantifiedImpact": number(0-100),',
      '      "evidenceDepth": number(0-100),',
      '      "structuralQuality": number(0-100),',
      '      "seniorityFit": number(0-100)',
      '    },',
      '    "overallScore": number(0-100),',
      '    "skillGaps": [{"skill": string, "status": "verified"|"needs-proof"|"gap"}],',
      '    "interviewReadiness": { "technicalDeepDive": number, "behavioralQuestions": number, "systemDesign": number }',
      '  },',
      '  "skillProfile": {',
      '    "jd_role_title": string,',
      '    "jd_seniority": string ("Junior"|"Mid"|"Senior"|"Lead"|"Staff"|"Principal"),',
      '    "jd_required_skills": string[],',
      '    "jd_nice_to_have_skills": string[],',
      '    "candidate_skills": [{ "skill": string, "demonstrated": boolean, "provenance": "VERIFIED"|"DECLARED"|"INFERRED"|"UNSUPPORTED", "evidenceSource": string }],',
      '    "candidate_experience_summary": { "level": string, "years": number, "domains": string[] }',
      '  },',
      '  "structuredResume": {',
      '    "header": { "name": string, "title": string, "email": string, "phone": string, "location": string, "links": string[] },',
      '    "summary": string,',
      '    "skills": { "core": string[], "tools": string[], "cloud": string[] },',
      '    "experience": [{ "title": string, "company": string, "location": string, "start": string, "end": string, "bullets": string[] }],',
      '    "projects": [{ "name": string, "bullets": string[] }],',
      '    "education": [{ "degree": string, "school": string, "year": string }],',
      '    "certifications": string[],',
      '    "targetJobSummary": string',
      '  }',
      '}',
      '',
      `JOB DESCRIPTION:\n${jd}`,
      '',
      `RESUME:\n${resume}`,
    ].join('\n\n')

    let modelUsed = 'ai-router'

    const parsedPackage = await structuredOutput({
      task: 'RESUME_TAILOR',
      prompt: singlePassPrompt,
      systemInstruction: 'You are Nexus-Director & Nexus-Strategist. Return strict JSON only, with no markdown code fences or conversational text.',
      attempts: 3,
      timeout: 60000,
      fallbackKeys: { gemini: runtimeGeminiKey, sarvam: runtimeSarvamKey },
      schemaValidator: (obj) => {
        if (!obj || typeof obj !== 'object') throw new Error('Expected object payload');
        if (!obj.strategist || typeof obj.strategist !== 'object') throw new Error('Missing strategist object');
        if (!obj.analysis || typeof obj.analysis !== 'object') throw new Error('Missing analysis object');
      }
    })

    const strategist = parsedPackage?.strategist
    const analysis = parsedPackage?.analysis

    if (!strategist || !analysis) {
      throw new Error('AI provider returned an incomplete payload.')
    }

    let structuredResume = normalizeStructuredResume(parsedPackage?.structuredResume || null, resume, jd)
    if (!structuredResume?.experience?.length) {
      structuredResume = await ensureStructuredResume({
        resumeText: resume,
        jd,
        sarvamKey: runtimeSarvamKey,
        geminiKey: runtimeGeminiKey,
        structurerKey,
      })
    }

    const structuredResumeText = structuredToResumeText(structuredResume)
    const skillProfile = normalizeSkillProfile(parsedPackage?.skillProfile || null)

    await persistSkillGapSnapshotIfTrainee({ traineeId, jd, skillProfile, analysis })

    agentActivityService.logAgentEvent(req.user?.id || null, 'NEXUS_DIRECTOR', 'RESUME_OPTIMIZATION_COMPLETE', { model: modelUsed });

    res.json({
      tailoredResume: structuredResumeText,
      structuredResume,
      structured: structuredResume,
      analysis,
      strategist,
      skillProfile,
      modelUsed,
      structurer: structurerKey ? 'resume-maker-structured-pdf' : 'resume-maker-structured-pdf',
      warning: '',
    })
  } catch (err) {
    console.error('[resume/tailor] model error:', err)
    agentActivityService.logAgentEvent(req.user?.id || null, 'NEXUS_DIRECTOR', 'RESUME_OPTIMIZATION_FAILED', { error: err.message });
    return res.status(503).json({ error: 'AI Structuring Service is currently offline. Missing valid credentials or provider is down.' });
  }
})

router.post('/resume/render-pdf', requireAuth, aiLimiter, async (req, res) => {
  let structuredResume = req.body?.structuredResume
  const resumeText = String(req.body?.resume || '').trim()
  const jd = String(req.body?.jd || '').trim()
  const keys = req.body?.keys || {}
  const runtimeSarvamKey = String(keys.sarvam || DEFAULT_SARVAM_KEY).trim()
  const runtimeGeminiKey = String(keys.gemini || GEMINI_API_KEY).trim()
  const structurerKey = String(keys.structurer || DEFAULT_RESUME_STRUCTURER_KEY).trim()

  if ((!structuredResume || typeof structuredResume !== 'object') && resumeText) {
    structuredResume = await ensureStructuredResume({
      resumeText,
      jd,
      sarvamKey: runtimeSarvamKey,
      geminiKey: runtimeGeminiKey,
      structurerKey,
    })
  }

  if (!structuredResume || typeof structuredResume !== 'object') {
    res.status(400).json({ error: 'structuredResume JSON is required, or provide resume text for auto-structuring.' })
    return
  }

  try {
    const pdfBuffer = await buildResumePdfFromStructured(structuredResume)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="forgev3-structured-resume-${Date.now()}.pdf"`)
    res.send(pdfBuffer)
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to render resume PDF' })
  }
})

export default router
