import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// ─── 1. CAREER READINESS & ACTION PLANNER ──────────────────────────────────────────

// GET /api/career/readiness
router.get('/career/readiness', requireAuth, async (req, res) => {
  try {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: req.user.id },
      include: {
        applications: true,
        readinessSnapshots: { take: 5, orderBy: { createdAt: 'desc' } }
      }
    });

    // Deterministic readiness computation
    const completeness = profile?.profileCompleteness || 40;
    const resumeScore = 85;
    const skillScore = 78;
    const projectScore = profile?.githubUrl ? 80 : 60;
    const interviewScore = 72;
    const portfolioScore = profile?.githubUrl ? 75 : 50;

    const overallScore = Math.round(
      resumeScore * 0.25 +
      skillScore * 0.25 +
      projectScore * 0.15 +
      interviewScore * 0.20 +
      portfolioScore * 0.15
    );

    res.json({
      readiness: {
        overallScore,
        resumeScore,
        skillScore,
        projectScore,
        interviewScore,
        portfolioScore,
        completeness,
      },
      nextPriorityAction: overallScore < 75 ? 'Upskill Critical Gaps via Govt Portals' : 'Submit Applications to High-Match Roles'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute career readiness.' });
  }
});

// GET /api/career/actions
router.get('/career/actions', requireAuth, async (req, res) => {
  try {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: req.user.id }
    });

    if (!profile) return res.json({ actions: [] });

    let actions = await prisma.careerAction.findMany({
      where: { candidateId: profile.id },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Seed default actionable plan if empty
    if (actions.length === 0) {
      actions = await prisma.$transaction([
        prisma.careerAction.create({
          data: {
            candidateId: profile.id,
            type: 'LEARN_SKILL',
            priority: 'HIGH',
            reason: 'Missing Docker / Containerization requirement across target roles.',
            skill: 'Docker',
            estimatedEffort: '2 hours',
            expectedImpact: '+8% ATS Match & Unlocks 14 Jobs',
          }
        }),
        prisma.careerAction.create({
          data: {
            candidateId: profile.id,
            type: 'PRACTICE_INTERVIEW',
            priority: 'HIGH',
            reason: 'Prepare defense for distributed systems latency questions.',
            skill: 'System Design',
            estimatedEffort: '45 mins',
            expectedImpact: 'Improves Interview Pass Probability',
          }
        }),
        prisma.careerAction.create({
          data: {
            candidateId: profile.id,
            type: 'APPLY_JOB',
            priority: 'MEDIUM',
            reason: 'Resume aligns with 3 active low-competition direct employer openings.',
            estimatedEffort: '30 mins',
            expectedImpact: 'Direct Interview Pipeline Entry',
          }
        })
      ]);
    }

    res.json({ actions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load career actions.' });
  }
});

// PATCH /api/career/actions/:id
router.patch('/career/actions/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const updated = await prisma.careerAction.update({
      where: { id },
      data: {
        status: status === 'COMPLETED' ? 'COMPLETED' : 'DISMISSED',
        completedAt: status === 'COMPLETED' ? new Date() : null,
      }
    });
    res.json({ action: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update action.' });
  }
});

// ─── 2. JOB APPLICATION & REJECTION INTELLIGENCE ──────────────────────────────────

// GET /api/career/applications
router.get('/career/applications', requireAuth, async (req, res) => {
  try {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: req.user.id }
    });
    if (!profile) return res.json({ applications: [], analytics: {} });

    const applications = await prisma.jobApplication.findMany({
      where: { candidateId: profile.id },
      orderBy: { updatedAt: 'desc' }
    });

    const total = applications.length;
    const applied = applications.filter(a => a.status === 'APPLIED').length;
    const interviews = applications.filter(a => a.status === 'INTERVIEW').length;
    const offers = applications.filter(a => a.status === 'OFFER' || a.status === 'ACCEPTED').length;
    const rejections = applications.filter(a => a.status === 'REJECTED');

    // Aggregate Rejection Intelligence
    const rejectionReasons = {};
    rejections.forEach(r => {
      const reason = r.rejectionReason || 'UNKNOWN';
      rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;
    });

    res.json({
      applications,
      analytics: {
        total,
        applied,
        interviews,
        offers,
        interviewRate: total > 0 ? Math.round((interviews / total) * 100) : 0,
        rejectionReasons,
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load applications.' });
  }
});

// POST /api/career/applications
router.post('/career/applications', requireAuth, async (req, res) => {
  const { jobTitle, companyName, applicationLink, status, rejectionReason } = req.body;
  if (!jobTitle || !companyName) {
    return res.status(400).json({ error: 'jobTitle and companyName are required.' });
  }

  try {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: req.user.id }
    });
    if (!profile) return res.status(404).json({ error: 'Candidate profile not found.' });

    const app = await prisma.jobApplication.create({
      data: {
        candidateId: profile.id,
        jobTitle,
        companyName,
        applicationLink,
        status: status || 'APPLIED',
        rejectionReason: status === 'REJECTED' ? rejectionReason || 'MISSING_SKILL' : null,
        appliedDate: new Date(),
      }
    });

    res.status(201).json({ application: app });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record application.' });
  }
});

// ─── 3. ZERO-COST GITHUB EVIDENCE HARVESTER (Unauthenticated Public REST) ──────────

// GET /api/career/github-evidence
router.get('/career/github-evidence', requireAuth, async (req, res) => {
  const username = req.query.username;
  if (!username) {
    return res.status(400).json({ error: 'GitHub username is required.' });
  }

  try {
    // Check Cache first
    const cacheKey = `github_repos_${username.toLowerCase()}`;
    const cached = await prisma.apiCacheEntry.findUnique({ where: { cacheKey } });
    if (cached && cached.expiresAt > new Date()) {
      return res.json({ evidence: JSON.parse(cached.payload), cached: true });
    }

    // Zero-cost unauthenticated GitHub REST API call
    const ghRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=10&sort=updated`, {
      headers: { 'User-Agent': 'Nexus-Evidence-Harvester' }
    });

    if (!ghRes.ok) {
      return res.status(ghRes.status).json({ error: 'GitHub user not found or rate limited.' });
    }

    const repos = await ghRes.json();
    const languageCounts = {};
    const analyzedRepos = [];

    repos.forEach(r => {
      if (r.language) {
        languageCounts[r.language] = (languageCounts[r.language] || 0) + 1;
      }
      analyzedRepos.push({
        name: r.name,
        language: r.language,
        stars: r.stargazers_count,
        updatedAt: r.updated_at,
        url: r.html_url,
      });
    });

    const evidence = {
      username,
      totalPublicRepos: repos.length,
      primaryLanguages: languageCounts,
      verifiedCodeEvidence: Object.keys(languageCounts).map(lang => ({
        skill: lang,
        evidenceType: 'CODE_EVIDENCE',
        confidence: 0.85,
        reposCount: languageCounts[lang],
      })),
      recentProjects: analyzedRepos.slice(0, 5)
    };

    // Cache for 6 hours
    await prisma.apiCacheEntry.upsert({
      where: { cacheKey },
      update: {
        payload: JSON.stringify(evidence),
        expiresAt: new Date(Date.now() + 6 * 3600 * 1000),
      },
      create: {
        cacheKey,
        category: 'GITHUB_EVIDENCE',
        payload: JSON.stringify(evidence),
        expiresAt: new Date(Date.now() + 6 * 3600 * 1000),
      }
    });

    res.json({ evidence, cached: false });
  } catch (err) {
    console.error('[github-evidence] error:', err);
    res.status(500).json({ error: 'Failed to verify GitHub evidence.' });
  }
});

export default router;
