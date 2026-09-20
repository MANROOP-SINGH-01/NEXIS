/**
 * FILE: server/services/jobFitScorer.js
 * PURPOSE: Transparent, multi-dimensional Job Description (JD) Fit Scoring Engine for NEXIS Phase 3.
 * SPEC: Phase 3 Explainable 0–100 JD Fit Score.
 */

export const SKILL_TAXONOMY = [
  'Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'Go', 'Golang', 'Rust', 'C#', 'SQL',
  'React', 'Next.js', 'Vue', 'Node.js', 'Express', 'FastAPI', 'Django', 'Flask', 'Spring Boot',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Qdrant', 'Chroma', 'Neo4j', 'GraphQL', 'REST API', 'gRPC',
  'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Terraform', 'CI/CD', 'Git', 'Linux',
  'LLMs', 'Multi-Agent AI', 'LangChain', 'LangGraph', 'RAG', 'YOLOv8', 'OpenCV', 'MediaPipe', 'HuggingFace', 'ROS 2',
  'Microservices', 'Distributed Systems', 'Computer Vision', 'Cybersecurity', 'Anomaly Detection'
]

/**
 * Extract matched skills from text using taxonomy and alias normalizations.
 */
export function extractSkillsFromText(text) {
  const norm = ' ' + String(text || '').toLowerCase().replace(/[^a-z0-9+#.]/g, ' ') + ' '
  const found = new Set()

  for (const skill of SKILL_TAXONOMY) {
    const sLower = skill.toLowerCase()
    const pattern = new RegExp(`[\\s,;]${sLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s,;]`, 'i')
    if (pattern.test(norm)) {
      found.add(skill)
    }
  }

  // Common aliases
  if (norm.includes(' nextjs ') || norm.includes(' next.js ')) found.add('Next.js')
  if (norm.includes(' postgres ') || norm.includes(' postgresql ')) found.add('PostgreSQL')
  if (norm.includes(' multi agent ') || norm.includes(' multi-agent ')) found.add('Multi-Agent AI')
  if (norm.includes(' langchain ')) found.add('LangChain')
  if (norm.includes(' ros2 ') || norm.includes(' ros 2 ')) found.add('ROS 2')
  if (norm.includes(' yolo ') || norm.includes(' yolov8 ')) found.add('YOLOv8')

  return Array.from(found)
}

/**
 * Calculate a fully explainable, transparent 0–100 JD Fit Score.
 * 
 * Dimensions:
 * 1. Skills Alignment (30%)
 * 2. Experience & Role Fit (25%)
 * 3. Projects Relevance (20%)
 * 4. Keywords & ATS Density (15%)
 * 5. Education & Credentials (10%)
 */
export function computeJdFitScore(resumeDocument, jdText) {
  if (!resumeDocument || typeof resumeDocument !== 'object') {
    throw new Error('Valid resumeDocument object is required for fit scoring.')
  }

  const cleanJD = String(jdText || '').trim()
  const jdLower = cleanJD.toLowerCase()

  // ── 1. Skills Dimension (30% weight) ──────────────────────────────────────
  const jdSkills = extractSkillsFromText(cleanJD)
  const candidateSkillsList = [
    ...(resumeDocument?.skills?.core || []),
    ...(resumeDocument?.skills?.frameworks || []),
    ...(resumeDocument?.skills?.tools || []),
    ...(resumeDocument?.skills?.cloud || []),
  ]
  const candidateSkillsSet = new Set(candidateSkillsList.map((s) => s.toLowerCase()))

  const matchedSkills = []
  const missingSkills = []

  for (const skill of jdSkills) {
    if (candidateSkillsSet.has(skill.toLowerCase())) {
      matchedSkills.push(skill)
    } else {
      missingSkills.push(skill)
    }
  }

  let skillsScore = 50 // baseline
  if (jdSkills.length > 0) {
    skillsScore = Math.round((matchedSkills.length / jdSkills.length) * 100)
  } else {
    // If JD is short or generic, evaluate candidate core skill breadth
    skillsScore = Math.min(95, Math.max(50, candidateSkillsList.length * 4))
  }

  // ── 2. Experience & Role Fit (25% weight) ──────────────────────────────────
  const experiences = resumeDocument.experience || []
  let expScore = 40
  if (experiences.length >= 1) expScore = 65
  if (experiences.length >= 2) expScore = 80
  if (experiences.length >= 3) expScore = 90

  // Check title or company domain alignment with JD
  for (const exp of experiences) {
    const titleLower = String(exp.title || '').toLowerCase()
    const bulletsText = (exp.bullets || []).join(' ').toLowerCase()
    if (jdLower.includes(titleLower) || (titleLower.includes('engineer') && jdLower.includes('engineer'))) {
      expScore = Math.min(100, expScore + 10)
    }
    // Check if bullets evidence JD keywords
    for (const ms of matchedSkills) {
      if (bulletsText.includes(ms.toLowerCase())) {
        expScore = Math.min(100, expScore + 3)
      }
    }
  }

  // ── 3. Projects Relevance (20% weight) ─────────────────────────────────────
  const projects = resumeDocument.projects || []
  let projScore = 40
  const matchedProjects = []

  for (const proj of projects) {
    const pName = String(proj.name || '')
    const pText = `${pName} ${(proj.technologies || []).join(' ')} ${(proj.bullets || []).join(' ')}`.toLowerCase()
    let hasOverlap = false

    for (const ms of matchedSkills) {
      if (pText.includes(ms.toLowerCase())) {
        hasOverlap = true
        break
      }
    }

    if (hasOverlap || jdLower.includes(pName.toLowerCase())) {
      matchedProjects.push(pName)
    }
  }

  if (projects.length >= 1) projScore = 55
  if (projects.length >= 2) projScore = 70
  if (projects.length >= 3) projScore = 85
  if (matchedProjects.length >= 2) projScore = Math.min(100, projScore + 10)
  if (matchedProjects.length >= 3) projScore = Math.min(100, projScore + 15)

  // ── 4. Keywords & ATS Density (15% weight) ────────────────────────────────
  const fullResumeText = JSON.stringify(resumeDocument).toLowerCase()
  const criticalKeywords = ['architecture', 'api', 'docker', 'system', 'testing', 'performance', 'database', 'optimization', 'autonomous', 'production']
  let keywordHits = 0
  for (const kw of criticalKeywords) {
    if (jdLower.includes(kw) && fullResumeText.includes(kw)) {
      keywordHits++
    }
  }
  const keywordsScore = Math.min(100, Math.max(45, 50 + keywordHits * 10))

  // ── 5. Education & Credentials (10% weight) ────────────────────────────────
  const education = resumeDocument.education || []
  let eduScore = 50
  if (education.length > 0) {
    eduScore = 80
    const eduText = JSON.stringify(education).toLowerCase()
    if (eduText.includes('computer science') || eduText.includes('engineering') || eduText.includes('b.tech')) {
      eduScore = 95
    }
  }
  if ((resumeDocument.achievements || []).length > 0) {
    eduScore = Math.min(100, eduScore + 5)
  }

  // ── Weighted Composite Calculation ─────────────────────────────────────────
  const weightedOverall = Math.round(
    skillsScore * 0.30 +
    expScore * 0.25 +
    projScore * 0.20 +
    keywordsScore * 0.15 +
    eduScore * 0.10
  )

  const overallScore = Math.min(99, Math.max(25, weightedOverall))

  // Explainability narrative
  const explanation = `Score: ${overallScore}/100 based on ${matchedSkills.length} matched technical skills (${matchedSkills.slice(0, 4).join(', ') || 'general engineering'}), ${matchedProjects.length} JD-aligned projects, and ${experiences.length} verified roles. ${
    missingSkills.length > 0
      ? `Identified ${missingSkills.length} skill gap(s): ${missingSkills.slice(0, 3).join(', ')}.`
      : 'Demonstrates comprehensive technical requirement coverage.'
  }`

  return {
    overallScore,
    dimensions: {
      skills: skillsScore,
      experience: expScore,
      projects: projScore,
      keywords: keywordsScore,
      education: eduScore,
    },
    matchedSkills,
    missingSkills,
    matchedProjects,
    explanation,
  }
}
