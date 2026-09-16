/**
 * ponytail: Pre-baked demo dataset. No API calls, no network.
 * Hydrates coreStore so a judge can see the full loop instantly.
 */

import { useCoreStore } from '../integration/store/coreStore';
import { useUiStore } from '../integration/store/uiStore';

const DEMO_RESUME = `PRIYA SHARMA
Senior Software Engineer | Bengaluru, India
priya.sharma@email.com | +91-98765-43210 | github.com/priyasharma

SUMMARY
Full-stack engineer with 4+ years building scalable web applications.
Expertise in React, Node.js, Python, and cloud-native architectures.
Led migration of monolith to microservices serving 2M+ daily users.

EXPERIENCE
Senior Software Engineer — Flipkart (2022–Present)
- Architected real-time inventory system reducing stock-out events by 34%
- Led team of 6 engineers delivering payment gateway integration (₹850Cr GMV)
- Implemented ML-based recommendation engine increasing CTR by 22%

Software Engineer — Zoho Corp (2020–2022)
- Built React dashboard consumed by 50,000+ enterprise users
- Reduced API latency by 40% via Redis caching and query optimization
- Designed CI/CD pipeline cutting deployment time from 2hrs to 15min

EDUCATION
B.Tech Computer Science — IIT Madras (2020) | CGPA: 8.7/10

SKILLS
React, TypeScript, Node.js, Python, PostgreSQL, Redis, Docker, AWS, Kubernetes, 
TensorFlow, System Design, Microservices, GraphQL, CI/CD`;

const DEMO_JD = `Senior Full-Stack Engineer — Razorpay
Location: Bengaluru | Experience: 4-7 years

We're looking for engineers who can build reliable, scalable payment infrastructure.

Requirements:
- Strong proficiency in React/TypeScript and Node.js
- Experience with distributed systems and microservices
- Database design (PostgreSQL, Redis)
- CI/CD and containerization (Docker, Kubernetes)
- Experience leading small engineering teams
- Bonus: ML/data pipeline experience

What you'll do:
- Design and build core payment processing systems
- Lead architecture decisions for new product features
- Mentor junior engineers and establish coding standards`;

const DEMO_JOBS = [
  {
    id: 'demo-job-1',
    title: 'Senior Full-Stack Engineer',
    company: 'Razorpay',
    url: 'https://razorpay.com/careers',
    alignmentScore: 92,
    blueOceanScore: 78,
    nexusMatchReason: 'Direct skills overlap: React, Node.js, microservices, payments domain. Leadership experience matches team-lead requirement.',
    competitionLevel: 'Medium' as const,
    discoveredAt: Date.now() - 86400000,
    source: 'company-careers' as const,
  },
  {
    id: 'demo-job-2',
    title: 'Platform Engineer',
    company: 'Zerodha',
    url: 'https://zerodha.com/careers',
    alignmentScore: 85,
    blueOceanScore: 91,
    nexusMatchReason: 'Strong infrastructure overlap. Low applicant volume — blue ocean opportunity.',
    competitionLevel: 'Low' as const,
    discoveredAt: Date.now() - 172800000,
    source: 'hidden' as const,
  },
  {
    id: 'demo-job-3',
    title: 'Lead Backend Engineer',
    company: 'CRED',
    url: 'https://cred.club/careers',
    alignmentScore: 88,
    blueOceanScore: 65,
    nexusMatchReason: 'System design and Python/Node overlap. High competition but strong fit.',
    competitionLevel: 'High' as const,
    discoveredAt: Date.now() - 43200000,
    source: 'linkedin' as const,
  },
];

const DEMO_ANALYSIS = {
  atsCompatibility: 87,
  dimensions: {
    keywordAlignment: 85,
    quantifiedImpact: 92,
    evidenceDepth: 78,
    structuralQuality: 90,
    seniorityFit: 88,
  },
  overallScore: 87,
  skillGaps: [
    { skill: 'React', status: 'verified' as const },
    { skill: 'Node.js', status: 'verified' as const },
    { skill: 'TypeScript', status: 'verified' as const },
    { skill: 'System Design', status: 'needs-proof' as const },
    { skill: 'GraphQL', status: 'gap' as const },
  ],
  interviewReadiness: {
    technicalDeepDive: 82,
    behavioralQuestions: 75,
    systemDesign: 70,
  },
  activityFeed: [
    { id: 'a1', timestamp: Date.now() - 300000, agent: 'Nexus-Strategist', action: 'Resume Optimization', details: 'Aligned 12 keywords to JD requirements', status: 'completed' as const },
    { id: 'a2', timestamp: Date.now() - 240000, agent: 'Nexus-Hunter', action: 'Job Discovery', details: 'Found 3 high-fit opportunities', status: 'success' as const },
    { id: 'a3', timestamp: Date.now() - 180000, agent: 'Nexus-Director', action: 'Strategy Update', details: 'Recommended focusing on Razorpay role first', status: 'completed' as const },
  ],
  pipeline: [],
};

export function loadDemoData() {
  const core = useCoreStore.getState();

  core.setCurrentResumeContent(DEMO_RESUME);
  core.setTargetJD(DEMO_JD);
  core.setDiscoveredJobs(DEMO_JOBS);
  core.setResumeAnalysis(DEMO_ANALYSIS);
  core.setSkillVerifications({
    'react': { skill: 'React', claimed: true, verified: true, evidence: { type: 'github', url: 'https://github.com/priyasharma/dashboard', summary: 'Built React dashboard used by 50k+ users' } },
    'nodejs': { skill: 'Node.js', claimed: true, verified: true, evidence: { type: 'github', url: 'https://github.com/priyasharma/api-gateway', summary: 'Payment gateway API serving ₹850Cr GMV' } },
    'python': { skill: 'Python', claimed: true, verified: false },
    'system-design': { skill: 'System Design', claimed: true, verified: false },
  });

  core.addNexusActivityEntry({ agentType: 'director', action: 'Demo Mode Activated', result: 'Loaded demonstration dataset for Priya Sharma', impact: 'positive' });
  core.addNexusActivityEntry({ agentType: 'strategist', action: 'Resume Analysis Complete', result: 'ATS score: 87%, 12 keywords aligned', impact: 'positive' });
  core.addNexusActivityEntry({ agentType: 'hunter', action: 'Job Discovery', result: '3 high-fit roles found across Razorpay, Zerodha, CRED', impact: 'positive' });

  // Set demo flag in localStorage
  localStorage.setItem('nexis-demo-mode', 'true');
}

export function clearDemoData() {
  useCoreStore.getState().resetProject();
  localStorage.removeItem('nexis-demo-mode');
}

export function isDemoMode(): boolean {
  return localStorage.getItem('nexis-demo-mode') === 'true';
}
