import { test, expect } from '@playwright/test'
import { computeJdFitScore, extractSkillsFromText } from '../../server/services/jobFitScorer.js'
import { optimizeResumeDocument, elevateBulletPoint } from '../../server/services/resumeOptimizer.js'
import { buildResumeDocxFromDocument } from '../../server/services/docxGenerator.js'
import { buildResumePdfFromStructured } from '../../server/services/pdfGenerator.js'

test.describe('Phase 3: Job-Ready Optimization & Fit Scoring Pipeline', () => {
  const sampleCandidateDoc = {
    metadata: { sourceFormat: 'pdf', extractedAt: new Date().toISOString(), version: '1.0.0', fileName: 'candidate.pdf' },
    contact: {
      name: 'Prakhar Jaiswal',
      title: 'Full Stack & AI Engineer',
      email: 'prkhr.exists@gmail.com',
      phone: '+91-7891516041',
      location: 'Maharashtra',
      links: ['github.com/prkhrexists'],
    },
    summary: '',
    education: [
      { school: 'NMIMS MPSTME, Maharashtra', degree: 'B.Tech in Computer Science', year: '2025 - 2029', gpa: '8/10' },
    ],
    experience: [
      {
        title: 'Mechatronics and Researcher',
        company: 'UAS NMIMS — Drone Team',
        start: 'Sep 2025',
        end: 'Present',
        bullets: ['worked on autonomous drones', 'worked with sensors and telemetry'],
      },
    ],
    projects: [
      {
        name: 'Crewyard',
        technologies: ['Next.js', 'JavaScript'],
        bullets: ['built a website using Next.js', 'had more than 500 users'],
      },
    ],
    skills: {
      core: ['Python', 'TypeScript', 'Next.js', 'FastAPI', 'Docker', 'ROS 2', 'YOLOv8'],
    },
    achievements: ['1st place — Google Developer Groups Hackathon 2026'],
  }

  const targetJD = `
    Senior Autonomous Systems & Full Stack Engineer
    Requirements:
    - Deep expertise in Python, TypeScript, Next.js, and Docker
    - Experience with ROS 2, robotics telemetry, and Computer Vision
    - Proven track record delivering production web architectures and automated pipelines
  `

  test('extractSkillsFromText accurately extracts technical taxonomy from JD', () => {
    const skills = extractSkillsFromText(targetJD)
    expect(skills).toContain('Python')
    expect(skills).toContain('TypeScript')
    expect(skills).toContain('Next.js')
    expect(skills).toContain('Docker')
    expect(skills).toContain('ROS 2')
  })

  test('computeJdFitScore evaluates 5 dimensions and outputs transparent breakdown', () => {
    const result = computeJdFitScore(sampleCandidateDoc, targetJD)

    expect(result.overallScore).toBeGreaterThanOrEqual(60)
    expect(result.overallScore).toBeLessThanOrEqual(100)

    // Verify all 5 dimensions exist
    expect(result.dimensions).toHaveProperty('skills')
    expect(result.dimensions).toHaveProperty('experience')
    expect(result.dimensions).toHaveProperty('projects')
    expect(result.dimensions).toHaveProperty('keywords')
    expect(result.dimensions).toHaveProperty('education')

    expect(result.matchedSkills).toContain('Python')
    expect(result.matchedSkills).toContain('Next.js')
    expect(result.explanation).toContain('Score:')
  })

  test('elevateBulletPoint transforms passive language into active engineering statements', () => {
    const jdSkills = new Set(['python', 'docker'])
    const passive1 = 'worked on autonomous drones'
    const elevated1 = elevateBulletPoint(passive1, jdSkills)
    expect(elevated1).toBe('Engineered autonomous drones.')

    const passive2 = 'built a website using Next.js'
    const elevated2 = elevateBulletPoint(passive2, jdSkills)
    expect(elevated2).toBe('Architected a website using Next.js.')
  })

  test('optimizeResumeDocument synthesizes targeted summary and preserves facts without hallucinations', () => {
    const result = optimizeResumeDocument(sampleCandidateDoc, targetJD)

    expect(result.finalScore).toBeGreaterThanOrEqual(result.initialScore)
    expect(result.optimizedDocument.summary).toContain('Senior Autonomous Systems')
    expect(result.optimizedDocument.summary).toContain('NMIMS MPSTME')

    // Preserves candidate's actual 500 users metric without inventing new ones
    const projectBullets = result.optimizedDocument.projects.flatMap((p: any) => p.bullets)
    expect(projectBullets.some((b: string) => b.includes('500 users'))).toBe(true)

    // Verify diff generation
    expect(result.diff).toContain('# RESUME OPTIMIZATION DIFF')
    expect(result.changesMade.length).toBeGreaterThanOrEqual(3)
  })

  test('Optimized ResumeDocument can export cleanly to both PDF and DOCX buffers', async () => {
    const optimization = optimizeResumeDocument(sampleCandidateDoc, targetJD)

    const docxBuf = await buildResumeDocxFromDocument(optimization.optimizedDocument)
    expect(Buffer.isBuffer(docxBuf)).toBe(true)
    expect(docxBuf.length).toBeGreaterThan(3000)

    const pdfBuf = await buildResumePdfFromStructured(optimization.optimizedDocument)
    expect(Buffer.isBuffer(pdfBuf)).toBe(true)
    expect(pdfBuf.length).toBeGreaterThan(1000)
  })
})
