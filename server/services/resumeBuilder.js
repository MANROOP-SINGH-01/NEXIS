/**
 * FILE: server/services/resumeBuilder.js
 * PURPOSE: Resume normalization, structured resume building, analysis generation, and fallback strategies.
 * DEPENDENCIES: server/services/resumeParser.js, server/services/sarvam.js, server/utils/helpers.js
 * USED BY: routes/resume.js
 */

import { extractFromResumeText } from './resumeParser.js'
import { structuredOutput } from './aiRouter.js'
import { tokenize, tryParseJsonLoose } from '../utils/helpers.js'

const COMMON_SKILL_CATALOG = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Golang', 'Rust', 'C++', 'C#', 'Ruby', 'PHP', 'Swift', 'Kotlin',
  'React', 'Next.js', 'Vue', 'Angular', 'Node.js', 'Express', 'NestJS', 'Django', 'FastAPI', 'Flask', 'Spring Boot',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Cassandra', 'Elasticsearch', 'GraphQL', 'REST API', 'gRPC', 'Kafka', 'RabbitMQ',
  'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Terraform', 'CI/CD', 'GitHub Actions', 'Linux', 'Microservices', 'Distributed Systems'
];

function extractSkillsHeuristic(text) {
  const normalized = ' ' + String(text || '').toLowerCase() + ' ';
  const matched = [];
  for (const skill of COMMON_SKILL_CATALOG) {
    const escaped = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, (match) => '\\' + match);
    const pattern = new RegExp('[^a-z0-9]' + escaped + '[^a-z0-9]', 'i');
    if (pattern.test(normalized)) {
      matched.push(skill);
    }
  }
  return matched;
}

export function buildFallbackStrategist(resume, jd) {
  const jdSkills = extractSkillsHeuristic(jd);
  const resumeSkills = new Set(extractSkillsHeuristic(resume).map((s) => s.toLowerCase()));

  const gaps = jdSkills.filter((s) => !resumeSkills.has(s.toLowerCase()));
  const strengths = jdSkills.filter((s) => resumeSkills.has(s.toLowerCase()));
  const priorities = jdSkills.slice(0, 5);

  return {
    priorities: priorities.length ? priorities : ['Technical Core Capabilities', 'Production System Engineering'],
    gaps: gaps.length ? gaps.slice(0, 5) : ['System Architecture Proof'],
    strengths: strengths.length ? strengths.slice(0, 5) : ['Core Software Engineering'],
  };
}

export function buildFallbackTailoredResume(resume, jd, strategist) {
  const jdLine = jd.split('\n').map((x) => x.trim()).filter(Boolean)[0] || 'target role requirements'
  const highlight = strategist.priorities.slice(0, 3).join(', ')
  const base = resume.trim()

  const additions = [
    'PROFESSIONAL SUMMARY',
    `Results-oriented candidate aligned to ${jdLine}.`,
    `Core focus areas: ${highlight}.`,
    '',
    'TARGETED IMPACT BULLETS',
    '- Delivered production-grade features with measurable impact on reliability, speed, and user outcomes.',
    '- Collaborated across stakeholders to convert requirements into scalable, maintainable implementations.',
    '- Improved execution quality through structured testing, monitoring, and iterative optimization.',
  ].join('\n')

  return `${base}\n\n${additions}`.trim()
}

export function buildAnalysis(strategist) {
  const atsCompatibility = Math.min(95, Math.max(58, 70 + strategist.priorities.length * 4 - strategist.gaps.length * 3))
  const activityFeed = [
    {
      id: `a_${Date.now()}_1`,
      timestamp: Date.now(),
      agent: 'Nexus-Writer',
      action: 'Resume Tailoring Complete',
      details: 'Generated role-specific bullet upgrades using JD priorities.',
      status: 'completed',
    },
    {
      id: `a_${Date.now()}_2`,
      timestamp: Date.now() - 60000,
      agent: 'Nexus-Strategist',
      action: 'JD Intent Mining',
      details: `${strategist.priorities.length} priorities and ${strategist.gaps.length} gaps identified.`,
      status: strategist.gaps.length > 0 ? 'warning' : 'success',
    },
  ]

  const pipeline = [
    {
      id: 'discovery',
      title: 'Job Discovery',
      cards: [{ id: 'd1', title: 'Target Role Selected', status: 'JD Parsed' }],
    },
    {
      id: 'tailoring',
      title: 'Resume Tailoring',
      cards: [{ id: 't1', title: 'Tailored Resume Draft', status: 'Nexus-Writer Complete', progress: 100 }],
    },
    {
      id: 'proof-check',
      title: 'Proof-of-Work Verification',
      cards: strategist.gaps.map((g, i) => ({ id: `p${i}`, title: g, status: 'Needs proof' })),
    },
    {
      id: 'ready',
      title: 'Ready to Submit',
      cards: [{ id: 'r1', title: 'Tailored Package', status: 'Ready' }],
    },
    {
      id: 'submitted',
      title: 'Submitted & Tracking',
      cards: [],
    },
  ]

  return {
    atsCompatibility,
    skillGaps: [
      ...strategist.strengths.slice(0, 2).map((s) => ({ skill: s, status: 'verified' })),
      ...strategist.gaps.slice(0, 3).map((g) => ({ skill: g, status: 'gap' })),
    ],
    interviewReadiness: {
      technicalDeepDive: Math.min(96, atsCompatibility + 5),
      behavioralQuestions: Math.max(55, 78 - strategist.gaps.length * 4),
      systemDesign: Math.min(94, atsCompatibility + 2),
    },
    activityFeed,
    pipeline,
  }
}

export function normalizeAnalysisShape(rawAnalysis, fallbackAnalysis) {
  const atsCompatibility = Number(rawAnalysis?.atsCompatibility)
  const toPercent = (v, fallback) => {
    const n = Number(v)
    if (Number.isFinite(n)) return Math.max(0, Math.min(100, Math.round(n)))
    return fallback
  }

  const normalizeStatus = (s) => {
    const v = String(s || '').toLowerCase()
    if (v === 'verified' || v === 'needs-proof' || v === 'gap') return v
    return 'gap'
  }

  const skillGaps = Array.isArray(rawAnalysis?.skillGaps)
    ? rawAnalysis.skillGaps
      .slice(0, 8)
      .map((x) => ({
        skill: String(x?.skill || '').trim(),
        status: normalizeStatus(x?.status),
      }))
      .filter((x) => x.skill)
    : fallbackAnalysis.skillGaps

  const rawDims = rawAnalysis?.dimensions || {}
  const ats = Number.isFinite(atsCompatibility)
    ? Math.max(0, Math.min(100, Math.round(atsCompatibility)))
    : fallbackAnalysis.atsCompatibility

  // Deterministic fallbacks for dimensions based on analysis & ats
  const dimensions = {
    keywordAlignment: toPercent(rawDims.keywordAlignment, Math.min(100, Math.max(40, ats - 5))),
    quantifiedImpact: toPercent(rawDims.quantifiedImpact, Math.min(100, Math.max(35, ats - 12))),
    evidenceDepth: toPercent(rawDims.evidenceDepth, Math.min(100, Math.max(30, ats - 8))),
    structuralQuality: toPercent(rawDims.structuralQuality, Math.min(100, Math.max(50, ats + 2))),
    seniorityFit: toPercent(rawDims.seniorityFit, Math.min(100, Math.max(45, ats - 4))),
  }

  const computedOverall = Math.round(
    dimensions.keywordAlignment * 0.30 +
    dimensions.quantifiedImpact * 0.25 +
    dimensions.evidenceDepth * 0.20 +
    dimensions.structuralQuality * 0.15 +
    dimensions.seniorityFit * 0.10
  )
  const overallScore = toPercent(rawAnalysis?.overallScore, computedOverall)

  return {
    atsCompatibility: ats,
    dimensions,
    overallScore,
    skillGaps: skillGaps.length ? skillGaps : fallbackAnalysis.skillGaps,
    interviewReadiness: {
      technicalDeepDive: toPercent(interview.technicalDeepDive, fallbackAnalysis.interviewReadiness.technicalDeepDive),
      behavioralQuestions: toPercent(interview.behavioralQuestions, fallbackAnalysis.interviewReadiness.behavioralQuestions),
      systemDesign: toPercent(interview.systemDesign, fallbackAnalysis.interviewReadiness.systemDesign),
    },
    activityFeed: fallbackAnalysis.activityFeed,
    pipeline: fallbackAnalysis.pipeline,
  }
}

export function normalizeStructuredResume(raw, fallbackText, jd) {
  const data = raw && typeof raw === 'object' ? raw : {}
  const extracted = extractFromResumeText(fallbackText)

  const safeArray = (value) => (Array.isArray(value) ? value : [])
  const safeString = (value, fallback = '') => (typeof value === 'string' && value.trim() ? value.trim() : fallback)

  // Detect if AI dumped everything into summary with no other sections
  const aiSummary = safeString(data?.summary, '')
  const aiExpLen = safeArray(data?.experience).filter((e) => e && (e.title || (Array.isArray(e.bullets) && e.bullets.length))).length
  const aiSkillsLen = safeArray(data?.skills?.core).length + safeArray(data?.skills?.tools).length + safeArray(data?.skills?.cloud).length
  const aiProjLen = safeArray(data?.projects).filter((p) => p && (p.name || (Array.isArray(p.bullets) && p.bullets.length))).length
  const everythingInSummary = aiSummary.length > 300 && aiExpLen === 0 && aiSkillsLen === 0 && aiProjLen === 0
  const useExtracted = !raw || everythingInSummary

  const header = {
    name: safeString(data?.header?.name, extracted.name || safeString(data?.header?.name, '')),
    title: safeString(data?.header?.title, extracted.title || ''),
    email: safeString(data?.header?.email, extracted.email || ''),
    phone: safeString(data?.header?.phone, extracted.phone || ''),
    location: safeString(data?.header?.location, extracted.location || ''),
    links: safeArray(data?.header?.links).map((x) => String(x).trim()).filter(Boolean).slice(0, 4),
  }
  if (!header.links.length && extracted.links.length) header.links = extracted.links

  const summary = useExtracted
    ? (extracted.summary || '')
    : safeString(data?.summary, extracted.summary || '')

  const aiSkillsCore = safeArray(data?.skills?.core).map((x) => String(x).trim()).filter(Boolean)
  const aiSkillsTools = safeArray(data?.skills?.tools).map((x) => String(x).trim()).filter(Boolean)
  const aiSkillsCloud = safeArray(data?.skills?.cloud).map((x) => String(x).trim()).filter(Boolean)
  const skills = {
    core: (aiSkillsCore.length && !useExtracted ? aiSkillsCore : extracted.skills.core).slice(0, 12),
    tools: (aiSkillsTools.length && !useExtracted ? aiSkillsTools : extracted.skills.tools).slice(0, 12),
    cloud: (aiSkillsCloud.length && !useExtracted ? aiSkillsCloud : extracted.skills.cloud).slice(0, 12),
  }

  let experience = safeArray(data?.experience)
    .slice(0, 6)
    .map((exp) => ({
      title: safeString(exp?.title, ''),
      company: safeString(exp?.company, ''),
      location: safeString(exp?.location, ''),
      start: safeString(exp?.start, ''),
      end: safeString(exp?.end, ''),
      bullets: safeArray(exp?.bullets).map((b) => String(b).trim()).filter(Boolean).slice(0, 5),
    }))
    .filter((exp) => exp.title || exp.bullets.length)
  if ((!experience.length || useExtracted) && extracted.experience.length) {
    experience = extracted.experience.slice(0, 6)
  }

  let projects = safeArray(data?.projects)
    .slice(0, 6)
    .map((p) => ({
      name: safeString(p?.name, ''),
      bullets: safeArray(p?.bullets).map((b) => String(b).trim()).filter(Boolean).slice(0, 5),
    }))
    .filter((p) => p.name || p.bullets.length)
  if ((!projects.length || useExtracted) && extracted.projects.length) {
    projects = extracted.projects.slice(0, 6)
  }

  let education = safeArray(data?.education)
    .slice(0, 3)
    .map((e) => ({
      degree: safeString(e?.degree, ''),
      school: safeString(e?.school, ''),
      year: safeString(e?.year, ''),
    }))
    .filter((e) => e.degree || e.school)
  if ((!education.length || useExtracted) && extracted.education.length) {
    education = extracted.education.slice(0, 3)
  }

  let certifications = safeArray(data?.certifications).map((c) => String(c).trim()).filter(Boolean).slice(0, 6)
  if (!certifications.length && extracted.certifications && extracted.certifications.length) {
    certifications = extracted.certifications.slice(0, 6)
  }

  return {
    header,
    summary,
    skills,
    experience,
    projects,
    education,
    certifications,
    targetJobSummary: safeString(data?.targetJobSummary, String(jd || '').split('\n').slice(0, 2).join(' ')),
  }
}

export function structuredToResumeText(sr) {
  const sections = []
  const h = sr.header || {}
  sections.push(`${h.name || 'Candidate Name'}`)
  sections.push(`${h.title || 'Target Role Candidate'}`)
  sections.push(`${h.email || ''} | ${h.phone || ''} | ${h.location || ''}`.replace(/^\s*\|\s*|\s*\|\s*$/g, ''))
  if (Array.isArray(h.links) && h.links.length) sections.push(h.links.join(' | '))
  sections.push('')

  sections.push('PROFESSIONAL SUMMARY')
  sections.push(sr.summary || '')
  sections.push('')

  sections.push('SKILLS')
  const skillLines = []
  if (sr.skills?.core?.length) skillLines.push(`Core: ${sr.skills.core.join(', ')}`)
  if (sr.skills?.tools?.length) skillLines.push(`Tools: ${sr.skills.tools.join(', ')}`)
  if (sr.skills?.cloud?.length) skillLines.push(`Cloud: ${sr.skills.cloud.join(', ')}`)
  sections.push(...skillLines)
  sections.push('')

  if (Array.isArray(sr.experience) && sr.experience.length) {
    sections.push('EXPERIENCE')
    sr.experience.forEach((exp) => {
      sections.push(`${exp.title} | ${exp.company} | ${exp.location}`)
      sections.push(`${exp.start} - ${exp.end}`)
      ;(exp.bullets || []).forEach((b) => sections.push(`- ${b}`))
      sections.push('')
    })
  }

  if (Array.isArray(sr.projects) && sr.projects.length) {
    sections.push('PROJECTS')
    sr.projects.forEach((p) => {
      sections.push(`${p.name}`)
      ;(p.bullets || []).forEach((b) => sections.push(`- ${b}`))
      sections.push('')
    })
  }

  if (Array.isArray(sr.education) && sr.education.length) {
    sections.push('EDUCATION')
    sr.education.forEach((e) => {
      sections.push(`${e.degree} | ${e.school} | ${e.year}`)
    })
    sections.push('')
  }

  if (Array.isArray(sr.certifications) && sr.certifications.length) {
    sections.push('CERTIFICATIONS')
    sr.certifications.forEach((c) => sections.push(`- ${c}`))
  }

  return sections.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export async function ensureStructuredResume({ resumeText, jd, sarvamKey, geminiKey, structurerKey }) {
  const structurerPrompt = [
    'Convert this tailored resume into strict structured JSON.',
    'Return ONLY JSON with this exact schema:',
    '{',
    '  "header": { "name": string, "title": string, "email": string, "phone": string, "location": string, "links": string[] },',
    '  "summary": string,',
    '  "skills": { "core": string[], "tools": string[], "cloud": string[] },',
    '  "experience": [{ "title": string, "company": string, "location": string, "start": string, "end": string, "bullets": string[] }],',
    '  "projects": [{ "name": string, "bullets": string[] }],',
    '  "education": [{ "degree": string, "school": string, "year": string }],',
    '  "certifications": string[],',
    '  "targetJobSummary": string',
    '}',
    `JOB DESCRIPTION:\n${jd}`,
    `TAILORED RESUME:\n${resumeText}`,
  ].join('\n\n')

  try {
    const parsed = await structuredOutput({
      task: 'RESUME_STRUCTURER',
      prompt: structurerPrompt,
      systemInstruction: 'You are a strict JSON formatter. Return valid JSON only.',
      attempts: 2,
      timeout: 30000,
      fallbackKeys: { sarvam: sarvamKey, gemini: geminiKey },
      schemaValidator: (obj) => {
        if (!obj || typeof obj !== 'object') throw new Error('Expected structured resume object');
      }
    })
    return normalizeStructuredResume(parsed, resumeText, jd)
  } catch {
    void structurerKey
    return normalizeStructuredResume(null, resumeText, jd)
  }
}

/**
 * Validates and cleans the `skillProfile` block returned by the LLM.
 * Computes match_pct server-side: matched_required / total_required * 100.
 */
export function normalizeSkillProfile(raw) {
  if (!raw || typeof raw !== 'object') return null

  const safeStrArr = (v) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : [])
  const safeStr = (v, fallback = '') => (typeof v === 'string' && v.trim() ? v.trim() : fallback)
  const safeNum = (v, fallback = 0) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback }

  const jd_required_skills = safeStrArr(raw.jd_required_skills)
  const jd_nice_to_have_skills = safeStrArr(raw.jd_nice_to_have_skills)

  const candidate_skills = Array.isArray(raw.candidate_skills)
    ? raw.candidate_skills
        .map((x) => {
          const rawProv = String(x?.provenance || '').toUpperCase();
          const provenance = ['VERIFIED', 'DECLARED', 'INFERRED', 'UNSUPPORTED'].includes(rawProv)
            ? rawProv
            : (Boolean(x?.demonstrated) ? 'DECLARED' : 'INFERRED');
          return {
            skill: safeStr(x?.skill),
            demonstrated: Boolean(x?.demonstrated),
            provenance,
            evidenceSource: safeStr(x?.evidenceSource, provenance === 'VERIFIED' ? 'Verified evidence' : 'Candidate resume profile'),
          };
        })
        .filter((x) => x.skill)
    : []

  const candidateSkillNames = new Set(candidate_skills.map((x) => x.skill.toLowerCase()))

  // Compute match_pct: required skills that appear in candidate_skills (case-insensitive)
  const matchedRequired = jd_required_skills.filter((s) =>
    candidateSkillNames.has(s.toLowerCase())
  )
  const match_pct =
    jd_required_skills.length > 0
      ? Math.round((matchedRequired.length / jd_required_skills.length) * 100)
      : null

  const expSummary = raw.candidate_experience_summary || {}

  return {
    jd_role_title: safeStr(raw.jd_role_title, 'Target Role'),
    jd_seniority: safeStr(raw.jd_seniority, 'Mid'),
    jd_required_skills,
    jd_nice_to_have_skills,
    candidate_skills,
    candidate_experience_summary: {
      level: safeStr(expSummary.level, 'Mid-level'),
      years: safeNum(expSummary.years, 0),
      domains: safeStrArr(expSummary.domains),
    },
    match_pct,
    matched_required: matchedRequired,
  }
}

/**
 * Keyword-extraction fallback when the LLM call fails entirely.
 * Uses simple tokenization to infer likely required skills from the JD.
 */
export function buildFallbackSkillProfile(resume, jd) {
  const extractedJd = extractSkillsHeuristic(jd);
  const extractedResume = extractSkillsHeuristic(resume);

  const jd_required_skills = extractedJd.length > 0 ? extractedJd.slice(0, 8) : ['Software Engineering'];
  const jd_nice_to_have_skills = extractedJd.length > 8 ? extractedJd.slice(8, 14) : [];

  const candidate_skills = (extractedResume.length > 0 ? extractedResume : ['Software Development']).map((s) => ({
    skill: s,
    demonstrated: true,
    provenance: 'DECLARED',
    evidenceSource: 'Extracted from resume text',
  }));

  const candidateSkillNames = new Set(candidate_skills.map((c) => c.skill.toLowerCase()));
  const matchedRequired = jd_required_skills.filter((s) => candidateSkillNames.has(s.toLowerCase()));
  const match_pct = jd_required_skills.length > 0
    ? Math.round((matchedRequired.length / jd_required_skills.length) * 100)
    : null;

  return {
    jd_role_title: 'Target Role',
    jd_seniority: 'Mid',
    jd_required_skills,
    jd_nice_to_have_skills,
    candidate_skills,
    candidate_experience_summary: { level: 'Mid-level', years: 2, domains: ['Engineering'] },
    match_pct,
    matched_required: matchedRequired,
  };
}

