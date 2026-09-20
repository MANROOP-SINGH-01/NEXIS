import { test, expect } from '@playwright/test'
import {
  fetchUserRepositories,
  generateAntiHallucinationBullets,
  matchRepositoriesToJobDescription,
  injectProjectsIntoResumeDocument,
  getTrendingProjectSuggestions,
  BENCHMARK_PRKHR_REPOS,
} from '../../server/services/githubService.js'

test.describe('Phase 2: GitHub Intelligence & Anti-Hallucination Pipeline', () => {
  test('Benchmark GitHub repository ingestion retrieves prkhrexists repositories', async () => {
    const repos = await fetchUserRepositories('prkhrexists')
    expect(Array.isArray(repos)).toBe(true)
    expect(repos.length).toBeGreaterThanOrEqual(7)

    const repoNames = repos.map((r) => r.name)
    expect(repoNames).toContain('FORGEv1')
    expect(repoNames).toContain('CrewYard')
    expect(repoNames).toContain('BOI_PS1')
  })

  test('Anti-Hallucination bullet generation preserves strict truth without inventing metrics', () => {
    const testRepo = {
      id: 'test_boi',
      name: 'BOI_PS1',
      fullName: 'prkhrexists/BOI_PS1',
      description: 'FRAUD APK DETECTION',
      language: 'Python',
      topics: ['cybersecurity', 'fraud-detection'],
      stars: 0,
      isFork: false,
    }

    const bullets = generateAntiHallucinationBullets(testRepo)
    expect(bullets.length).toBeGreaterThanOrEqual(2)

    const fullBulletText = bullets.join(' ')
    // Must contain grounded language and description
    expect(fullBulletText.toLowerCase()).toContain('python')
    expect(fullBulletText.toLowerCase()).toContain('fraud apk detection')
    // Anti-hallucination constraint: must NOT invent fake users, revenue, or production scale
    expect(fullBulletText).not.toMatch(/\b(10[0-9]k|million|500 users|\$|revenue)\b/i)
  })

  test('Job Description matching ranks cyber/fraud repos highest for security JDs', () => {
    const securityJD = `
      Information Security & Anti-Fraud Software Engineer
      Requirements:
      - Python, Cybersecurity, Fraud Detection, Malware Analysis
      - Experience analyzing APKs or reverse engineering threats
    `

    const matches = matchRepositoriesToJobDescription(BENCHMARK_PRKHR_REPOS, securityJD)
    expect(matches.length).toBeGreaterThan(0)

    const topMatch = matches[0]
    expect(topMatch.name).toMatch(/BOI_PS/i)
    expect(topMatch.relevanceScore).toBeGreaterThanOrEqual(75)
    expect(topMatch.matchedTerms).toContain('Python')
  })

  test('Project Injection into ResumeDocument updates projects array without duplicate collisions', () => {
    const mockResumeDoc = {
      metadata: { sourceFormat: 'pdf', extractedAt: new Date().toISOString(), version: '1.0.0', fileName: 'test.pdf' },
      contact: { name: 'Prakhar Jaiswal', title: '', email: 'prkhr.exists@gmail.com', phone: '', location: '', links: [] },
      summary: '',
      education: [],
      experience: [],
      projects: [
        { name: 'ResQ Live Ops', bullets: ['Built drone disaster system'] },
      ],
      skills: { core: ['Python', 'Docker'] },
    }

    const selectedProjects = [
      {
        name: 'BOI_PS1',
        language: 'Python',
        topics: ['cybersecurity'],
        groundedBullets: ['Engineered automated fraud APK detection pipeline utilizing Python.'],
      },
      {
        name: 'FORGEv1',
        language: 'TypeScript',
        topics: ['agentic-ai'],
        groundedBullets: ['Architected autonomous multi-agent career orchestration platform.'],
      },
    ]

    const result = injectProjectsIntoResumeDocument(mockResumeDoc, selectedProjects)
    expect(result.injectedCount).toBe(2)
    expect(result.totalProjects).toBe(3)
    expect(result.updatedDocument.projects.map((p: any) => p.name)).toEqual([
      'ResQ Live Ops',
      'BOI_PS1',
      'FORGEv1',
    ])
  })

  test('Trending project suggestions recommend high-impact blueprints for missing skills', () => {
    const aiAgentJD = 'Senior AI Engineer specializing in LangGraph, Autonomous Multi-Agent Workflows, and Vector Databases'
    const candidateSkills = ['Python', 'JavaScript']

    const blueprints = getTrendingProjectSuggestions(aiAgentJD, candidateSkills)
    expect(blueprints.length).toBeGreaterThanOrEqual(3)

    const topBlueprint = blueprints[0]
    expect(topBlueprint.title).toContain('Autonomous Multi-Agent')
    expect(topBlueprint.techStack).toContain('FastAPI')
    expect(topBlueprint.readinessBullets.length).toBeGreaterThanOrEqual(3)
    expect(topBlueprint.trendingScore).toBeGreaterThanOrEqual(90)
  })
})
