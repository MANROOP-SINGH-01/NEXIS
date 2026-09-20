/**
 * FILE: server/services/documentNormalizer.js
 * PURPOSE: Canonical ResumeDocument data model, extraction heuristics, and multi-format normalization.
 * SPEC: Phase 1 Structured Resume Model & Normalizer.
 */

export function createEmptyResumeDocument(metadata = {}) {
  return {
    metadata: {
      sourceFormat: metadata.sourceFormat || 'unknown',
      extractedAt: metadata.extractedAt || new Date().toISOString(),
      version: '1.0.0',
      fileName: metadata.fileName || '',
    },
    contact: {
      name: '',
      title: '',
      email: '',
      phone: '',
      location: '',
      links: [],
    },
    summary: '',
    education: [],
    experience: [],
    projects: [],
    skills: {
      core: [],
      tools: [],
      cloud: [],
      frameworks: [],
    },
    certifications: [],
    achievements: [],
    sections: [],
  }
}

export function isSectionHeader(line) {
  const clean = String(line || '').trim()
  if (!clean || clean.length > 50) return false

  const u = clean.toUpperCase().replace(/[^A-Z\s&/]/g, '').trim()
  const knownHeaders = [
    'PROFESSIONAL SUMMARY', 'SUMMARY', 'OBJECTIVE', 'PROFILE', 'ABOUT', 'ABOUT ME',
    'SKILLS', 'TECHNICAL SKILLS', 'CORE SKILLS', 'KEY SKILLS', 'LANGUAGES & TECHNOLOGIES',
    'EXPERIENCE', 'WORK EXPERIENCE', 'PROFESSIONAL EXPERIENCE', 'EMPLOYMENT', 'WORK HISTORY',
    'PROJECTS', 'KEY PROJECTS', 'PERSONAL PROJECTS', 'SIDE PROJECTS', 'ACADEMIC PROJECTS',
    'EDUCATION', 'ACADEMIC BACKGROUND', 'ACADEMICS', 'EDUCATIONAL QUALIFICATIONS',
    'CERTIFICATIONS', 'CERTIFICATES', 'LICENSES',
    'AWARDS', 'AWARDS & ACHIEVEMENTS', 'ACHIEVEMENTS', 'HONORS',
    'EXTRACURRICULAR', 'EXTRACURRICULAR ACTIVITIES', 'ACTIVITIES',
    'INTERESTS', 'HOBBIES', 'PUBLICATIONS', 'RESEARCH', 'RELEVANT COURSEWORK',
  ]

  if (knownHeaders.includes(u)) return true

  // Check for common prefix/compound patterns e.g., "Key Projects", "Technical Skills"
  if (/^(TECHNICAL SKILLS|KEY PROJECTS|WORK EXPERIENCE|AWARDS & ACHIEVEMENTS|AWARDS AND ACHIEVEMENTS|AREAS OF EXPERTISE)$/i.test(clean)) return true

  // Require matching a known section keyword so candidate names like "PRAKHAR JAISWAL" are never misclassified
  const sectionKeywords = /\b(SUMMARY|PROFILE|OBJECTIVE|SKILLS|EXPERIENCE|EMPLOYMENT|PROJECTS|EDUCATION|ACADEMIC|CERTIFICATIONS|CERTIFICATES|AWARDS|ACHIEVEMENTS|HONORS|ACTIVITIES|INTERESTS|HOBBIES|PUBLICATIONS|RESEARCH|COURSEWORK)\b/i
  if (sectionKeywords.test(clean) && clean.length < 40 && clean.split(/\s+/).length <= 4) {
    return true
  }

  return false
}

export function classifySectionType(headerText) {
  const u = String(headerText || '').toUpperCase().replace(/[^A-Z\s&]/g, '').trim()
  if (/SUMMARY|OBJECTIVE|PROFILE|ABOUT/.test(u)) return 'summary'
  if (/SKILL|TECHNOLOG/.test(u)) return 'skills'
  if (/EXPERIENCE|EMPLOYMENT|WORK/.test(u)) return 'experience'
  if (/PROJECT/.test(u)) return 'projects'
  if (/EDUCATION|ACADEMIC/.test(u)) return 'education'
  if (/CERTIFICATION|CERTIFICATE|LICENSE/.test(u)) return 'certifications'
  if (/AWARD|ACHIEVEMENT|HONOR/.test(u)) return 'achievements'
  if (/EXTRACURRICULAR|ACTIVIT/.test(u)) return 'extracurricular'
  if (/INTEREST|HOBB/.test(u)) return 'interests'
  return 'other'
}

/**
 * Normalizes text extracted from PDF or DOCX into a structured ResumeDocument.
 */
export function normalizeTextToResumeDocument(rawText, metadata = {}) {
  const doc = createEmptyResumeDocument(metadata)
  if (!rawText || typeof rawText !== 'string') return doc

  // Clean form feeds and page markers like "-- 1 of 2 --"
  const cleanedText = rawText
    .replace(/\f/g, '\n')
    .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '')
    .replace(/\r\n/g, '\n')

  const lines = cleanedText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length === 0) return doc

  // 1. Extract Contact Info from entire text and header block
  const fullText = cleanedText

  // Email
  const emailMatch = fullText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  if (emailMatch) doc.contact.email = emailMatch[0]

  // Phone: matches international formats like +91-7891516041, (123) 456-7890, +1 555 123 4567
  const phoneMatch = fullText.match(/(?:\+?\d{1,3}[-\s]?)?\(?\d{2,4}\)?[-\s]?\d{3,5}[-\s]?\d{3,5}/)
  if (phoneMatch && phoneMatch[0].replace(/\D/g, '').length >= 7) {
    doc.contact.phone = phoneMatch[0].trim()
  }

  // Links
  const linkMatches = fullText.match(/(?:https?:\/\/[^\s,]+|(?:linkedin\.com\/in\/|github\.com\/)[^\s,|]+)/gi)
  if (linkMatches) {
    const cleanLinks = linkMatches
      .map((l) => l.replace(/^[|•\s]+|[|•\s]+$/g, '').trim())
      .filter((l) => l.includes('linkedin.com') || l.includes('github.com') || l.startsWith('http'))
    doc.contact.links = [...new Set(cleanLinks)].slice(0, 6)
  }

  // Name: First non-empty line before section headers or contact rows
  for (let i = 0; i < Math.min(4, lines.length); i++) {
    const line = lines[i]
    if (
      line.length >= 2 &&
      line.length < 50 &&
      !line.includes('@') &&
      !line.includes('|') &&
      !isSectionHeader(line) &&
      !/^\+?\d/.test(line) &&
      !line.toLowerCase().includes('github.com') &&
      !line.toLowerCase().includes('linkedin.com')
    ) {
      doc.contact.name = line
      break
    }
  }

  // Secondary contact line parse (check if line 2 or 3 contains title or location)
  for (let i = 1; i < Math.min(5, lines.length); i++) {
    const line = lines[i]
    if (line === doc.contact.name) continue
    if (isSectionHeader(line)) break

    // Check location
    if (/(?:Maharashtra|Mumbai|Delhi|Bengaluru|Bangalore|Hyderabad|Pune|California|Remote|India|USA)/i.test(line)) {
      const locMatch = line.match(/([A-Za-z\s]+(?:,\s*[A-Za-z\s]+)*)/)
      if (locMatch && !doc.contact.location && !line.includes('@') && !line.includes('http')) {
        // Only take if short enough to be a location
        if (line.split('|').length <= 2 && line.length < 50) {
          doc.contact.location = line.replace(/[|•]/g, '').trim()
        }
      }
    }
    // Check title/role if present
    if (
      !doc.contact.title &&
      line.length < 60 &&
      !line.includes('@') &&
      !line.includes('|') &&
      !/^\+?\d/.test(line) &&
      !line.toLowerCase().includes('http') &&
      /(?:Engineer|Developer|Architect|Researcher|Student|Specialist|Designer|Lead)/i.test(line)
    ) {
      doc.contact.title = line
    }
  }

  // 2. Partition text into sections
  const sections = []
  let currentSec = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (isSectionHeader(line)) {
      if (currentSec) sections.push(currentSec)
      currentSec = {
        header: line,
        type: classifySectionType(line),
        lines: [],
      }
    } else if (currentSec) {
      currentSec.lines.push(line)
    }
  }
  if (currentSec) sections.push(currentSec)

  function getLinesForType(type) {
    const found = sections.filter((s) => s.type === type)
    return found.flatMap((s) => s.lines)
  }

  // Summary
  const summaryLines = getLinesForType('summary')
  if (summaryLines.length > 0) {
    doc.summary = summaryLines
      .filter((l) => !/^[-•*·δ]\s/.test(l))
      .join(' ')
      .trim()
  }

  // Skills
  const skillLines = getLinesForType('skills')
  for (const sl of skillLines) {
    const cleanSl = sl.replace(/^[-•*·]\s*/, '').trim()
    const languagesMatch = cleanSl.match(/^(?:Languages?|Core\s*Languages?|Core)[:\s]+(.+)/i)
    const frameworksMatch = cleanSl.match(/^(?:Frameworks?\s*(?:&|and)?\s*Tools?|Tools?|Libraries?)[:\s]+(.+)/i)
    const aimlMatch = cleanSl.match(/^(?:AI\/ML\s*(?:&|and)?\s*(?:Vision|Cloud)?|AI|Machine Learning|Cloud)[:\s]+(.+)/i)

    if (languagesMatch) {
      const items = languagesMatch[1].split(/[,;•·|]/).map((s) => s.trim()).filter(Boolean)
      doc.skills.core.push(...items)
    } else if (frameworksMatch) {
      const items = frameworksMatch[1].split(/[,;•·|]/).map((s) => s.trim()).filter(Boolean)
      doc.skills.tools.push(...items)
    } else if (aimlMatch) {
      const items = aimlMatch[1].split(/[,;•·|]/).map((s) => s.trim()).filter(Boolean)
      doc.skills.cloud.push(...items)
    } else {
      // General skill list (comma, bullet, or pipe separated)
      const items = cleanSl.split(/[,;•·|]/).map((s) => s.trim()).filter(Boolean)
      if (items.length > 1) {
        doc.skills.core.push(...items)
      } else if (cleanSl.length > 1 && cleanSl.length < 35) {
        doc.skills.core.push(cleanSl)
      }
    }
  }
  // Deduplicate skills
  doc.skills.core = [...new Set(doc.skills.core)]
  doc.skills.tools = [...new Set(doc.skills.tools)]
  doc.skills.cloud = [...new Set(doc.skills.cloud)]

  // Experience Parser
  const experienceLines = getLinesForType('experience')
  doc.experience = parseExperienceEntries(experienceLines)

  // Projects Parser
  const projectLines = getLinesForType('projects')
  doc.projects = parseProjectEntries(projectLines)

  // Education Parser
  const educationLines = getLinesForType('education')
  doc.education = parseEducationEntries(educationLines)

  // Achievements & Awards
  const achievementLines = getLinesForType('achievements')
  for (const al of achievementLines) {
    const cleanAl = al.replace(/^[-•*·δ]\s*/, '').trim()
    if (cleanAl.length > 3) {
      doc.achievements.push(cleanAl)
    }
  }

  // Certifications
  const certLines = getLinesForType('certifications')
  for (const cl of certLines) {
    const cleanCl = cl.replace(/^[-•*·δ]\s*/, '').trim()
    if (cleanCl.length > 3) {
      doc.certifications.push(cleanCl)
    }
  }

  // Store any extra sections (Interests, Publications, etc.)
  const handledTypes = new Set(['summary', 'skills', 'experience', 'projects', 'education', 'achievements', 'certifications'])
  for (const sec of sections) {
    if (!handledTypes.has(sec.type)) {
      doc.sections.push({
        id: sec.type,
        title: sec.header,
        content: sec.lines,
      })
    }
  }

  return doc
}

function parseExperienceEntries(lines) {
  const entries = []
  let current = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const isBullet = /^[-•*·δ]\s/.test(line) || /^[δ·]\s/.test(line)
    const hasPipe = line.includes('|')
    const dateMatch = line.match(/(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4})\s*[-–—]\s*(?:Present|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4})/i)

    if (isBullet && current) {
      current.bullets.push(line.replace(/^[-•*·δ]\s*/, '').trim())
    } else if (hasPipe && !isBullet) {
      if (current && (current.title || current.bullets.length)) entries.push(current)
      const parts = line.split('|').map((p) => p.trim())
      const datePart = parts.find((p) => /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4}|\d{4}\s*[-–—]/i.test(p))
      const nonDateParts = parts.filter((p) => p !== datePart)

      let company = nonDateParts[0] || ''
      let title = nonDateParts[1] || ''
      let location = nonDateParts[2] || ''

      // If only title was given e.g. "Freelance Technical Content Writer"
      if (!title && /(?:Writer|Engineer|Developer|Researcher|Intern|Lead)/i.test(company)) {
        title = company
        company = ''
      }

      current = {
        title,
        company,
        location,
        start: '',
        end: '',
        bullets: [],
      }

      if (datePart) {
        const splitDate = datePart.split(/\s*[-–—]\s*/)
        current.start = splitDate[0]?.trim() || ''
        current.end = splitDate[1]?.trim() || datePart.trim()
      }
    } else if (dateMatch && !isBullet) {
      if (current && (current.title || current.bullets.length)) entries.push(current)
      const rawDate = dateMatch[0]
      const beforeDate = line.replace(rawDate, '').trim()
      const splitDate = rawDate.split(/\s*[-–—]\s*/)

      current = {
        title: beforeDate,
        company: '',
        location: '',
        start: splitDate[0]?.trim() || '',
        end: splitDate[1]?.trim() || '',
        bullets: [],
      }
    } else if (current && current.bullets.length > 0 && !hasDateMatch(line) && isContinuationLine(line)) {
      // Continuation of previous bullet
      current.bullets[current.bullets.length - 1] += ' ' + line.trim()
    } else if (!isBullet && line.length > 2 && line.length < 100) {
      if (current && !current.company && !current.bullets.length) {
        current.company = line
      } else {
        if (current && (current.title || current.bullets.length)) entries.push(current)
        current = {
          title: line,
          company: '',
          location: '',
          start: '',
          end: '',
          bullets: [],
        }
      }
    }
  }

  if (current && (current.title || current.bullets.length)) entries.push(current)
  return entries
}

function hasDateMatch(line) {
  return /(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4})\s*[-–—]\s*(?:Present|\d{4})/i.test(line)
}

function isContinuationLine(line) {
  const trimmed = line.trim()
  if (trimmed.length > 150) return false
  if (isSectionHeader(trimmed)) return false
  if (hasDateMatch(trimmed)) return false
  // Lines that start with lowercase or common conjunctions/prepositions are continuations
  if (/^[a-z]/.test(trimmed)) return true
  // If line ends with a period and starts with a capital, and previous bullet already ends with period, it's NOT a continuation
  if (trimmed.endsWith('.') && /^[A-Z]/.test(trimmed) && trimmed.length > 50) return false
  // If line looks like a title or project name (Capitalized, no period at end, reasonable length)
  if (/^[A-Z][A-Za-z0-9\s/—\-&|:]{3,70}$/.test(trimmed) && !trimmed.endsWith('.') && !trimmed.endsWith(',')) {
    return false
  }
  // Check if line looks like a sentence fragment (no colon, no pipe)
  if (!trimmed.includes('|') && !trimmed.includes(':') && !/^(19|20)\d{2}/.test(trimmed)) {
    return true
  }
  return false
}

function parseProjectEntries(lines) {
  const projects = []
  let current = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const isBullet = /^[-•*·δ]\s/.test(line) || /^[δ·]\s/.test(line)

    if (isBullet && current) {
      current.bullets.push(line.replace(/^[-•*·δ]\s*/, '').trim())
    } else if (current && current.bullets.length > 0 && isContinuationLine(line)) {
      // Continuation of previous bullet in project
      current.bullets[current.bullets.length - 1] += ' ' + line.trim()
    } else if (!isBullet && line.length > 1 && line.length < 120) {
      if (current && (current.name || current.bullets.length)) projects.push(current)
      // Extract title and possible subtitle/role e.g. "CREWYARD | Founder & Builder — Developer Community Platform"
      let name = line
      let role = ''
      if (line.includes('|')) {
        const parts = line.split('|').map((p) => p.trim())
        name = parts[0]
        role = parts.slice(1).join(' | ')
      }
      current = {
        name,
        role,
        bullets: [],
        technologies: [],
      }
    }
  }

  if (current && (current.name || current.bullets.length)) projects.push(current)
  return projects
}

function parseEducationEntries(lines) {
  const education = []
  let current = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const hasDegree = /\b(B\.?Tech|M\.?Tech|B\.?S\.?|M\.?S\.?|Bachelor|Master|Ph\.?D|MBA|Diploma|Degree)/i.test(line)
    const hasInstitute = /\b(Institute|University|College|School|NMIMS|MPSTME|IIT|NIT|BITS)\b/i.test(line)
    const hasYear = /\b\d{4}\s*[-–—]\s*(?:Present|\d{4})\b|\b\d{4}\b/.test(line)
    const gpaMatch = line.match(/(?:CGPA|GPA)[:\s]*([\d.]+(?:\s*\/\s*\d+)?)/i)

    if (hasDegree || hasInstitute || line.includes('|')) {
      if (line.includes('|')) {
        const parts = line.split('|').map((p) => p.trim())
        const yearPart = parts.find((p) => /\d{4}/.test(p))
        const gpaPart = parts.find((p) => /(?:CGPA|GPA)/i.test(p))
        const degPart = parts.find((p) => /\b(B\.?Tech|M\.?Tech|B\.?S\.?|Bachelor|Master)/i.test(p)) || parts[0]

        if (!current) {
          current = { degree: degPart, school: '', location: '', year: yearPart || '', gpa: gpaPart || '' }
        } else {
          current.degree = degPart
          if (yearPart) current.year = yearPart
          if (gpaPart) current.gpa = gpaPart
        }
      } else if (hasInstitute) {
        if (current && current.school) {
          education.push(current)
          current = null
        }
        if (!current) current = { degree: '', school: line, location: '', year: '', gpa: '' }
        else current.school = line
      } else if (hasDegree) {
        if (!current) current = { degree: line, school: '', location: '', year: '', gpa: '' }
        else current.degree = line
      }

      if (gpaMatch && current) {
        current.gpa = gpaMatch[0]
      }
      if (hasYear && current && !current.year) {
        const ym = line.match(/\b\d{4}\s*[-–—]\s*(?:Present|\d{4})\b|\b\d{4}\b/)
        if (ym) current.year = ym[0]
      }
    } else if (current && !current.school && line.length > 3 && line.length < 80) {
      current.school = line
    }
  }

  if (current && (current.school || current.degree)) education.push(current)
  return education
}

/**
 * Converts ResumeDocument to legacy structured resume shape for backward compatibility.
 */
export function resumeDocumentToLegacyStructured(doc) {
  if (!doc) return null
  return {
    header: {
      name: doc.contact?.name || '',
      title: doc.contact?.title || '',
      email: doc.contact?.email || '',
      phone: doc.contact?.phone || '',
      location: doc.contact?.location || '',
      links: doc.contact?.links || [],
    },
    summary: doc.summary || '',
    skills: {
      core: doc.skills?.core || [],
      tools: doc.skills?.tools || [],
      cloud: doc.skills?.cloud || [],
    },
    experience: (doc.experience || []).map((e) => ({
      title: e.title || '',
      company: e.company || '',
      location: e.location || '',
      start: e.start || '',
      end: e.end || '',
      bullets: e.bullets || [],
    })),
    projects: (doc.projects || []).map((p) => ({
      name: p.name || '',
      bullets: p.bullets || [],
    })),
    education: (doc.education || []).map((edu) => ({
      degree: edu.degree || '',
      school: edu.school || '',
      year: edu.year || '',
    })),
    certifications: [
      ...(doc.certifications || []),
      ...(doc.achievements || []),
    ],
  }
}

/**
 * Converts legacy structured resume shape to canonical ResumeDocument.
 */
export function legacyStructuredToResumeDocument(legacy, metadata = {}) {
  const doc = createEmptyResumeDocument(metadata)
  if (!legacy || typeof legacy !== 'object') return doc

  const h = legacy.header || {}
  doc.contact = {
    name: h.name || '',
    title: h.title || '',
    email: h.email || '',
    phone: h.phone || '',
    location: h.location || '',
    links: Array.isArray(h.links) ? h.links : [],
  }

  doc.summary = legacy.summary || ''

  const s = legacy.skills || {}
  doc.skills = {
    core: Array.isArray(s.core) ? s.core : [],
    tools: Array.isArray(s.tools) ? s.tools : [],
    cloud: Array.isArray(s.cloud) ? s.cloud : [],
    frameworks: [],
  }

  doc.experience = (legacy.experience || []).map((e) => ({
    title: e.title || '',
    company: e.company || '',
    location: e.location || '',
    start: e.start || '',
    end: e.end || '',
    bullets: Array.isArray(e.bullets) ? e.bullets : [],
  }))

  doc.projects = (legacy.projects || []).map((p) => ({
    name: p.name || '',
    role: '',
    bullets: Array.isArray(p.bullets) ? p.bullets : [],
    technologies: [],
  }))

  doc.education = (legacy.education || []).map((edu) => ({
    degree: edu.degree || '',
    school: edu.school || '',
    location: '',
    year: edu.year || '',
    gpa: '',
  }))

  doc.certifications = Array.isArray(legacy.certifications) ? legacy.certifications : []
  return doc
}
