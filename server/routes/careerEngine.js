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
        readinessSnapshots: { take: 1, orderBy: { createdAt: 'desc' } },
        interviewSessions: { take: 10, orderBy: { createdAt: 'desc' } },
        skillEvidences: true,
      }
    });

    if (!profile) {
      return res.json({
        readiness: {
          overallScore: null,
          resumeScore: null,
          skillScore: null,
          projectScore: null,
          interviewScore: null,
          portfolioScore: null,
          completeness: 0,
        },
        hint: 'Complete your profile and run a resume analysis to see career readiness scores.',
      });
    }

    // ── Compute real scores from actual data ──
    const completeness = profile.profileCompleteness || 0;

    // Resume score: from latest readiness snapshot (populated after /resume/tailor runs)
    const latestSnapshot = profile.readinessSnapshots?.[0];
    const resumeScore = latestSnapshot?.resumeScore ?? null;

    // Skill score: ratio of verified skill evidences to total
    const totalEvidence = profile.skillEvidences?.length || 0;
    const verifiedEvidence = profile.skillEvidences?.filter(e => e.verified)?.length || 0;
    const skillScore = totalEvidence > 0
      ? Math.round((verifiedEvidence / totalEvidence) * 100)
      : null;

    // Project score: GitHub presence + evidence count
    const hasGitHub = Boolean(profile.githubUrl);
    const projectEvidence = profile.skillEvidences?.filter(e => e.source === 'GITHUB')?.length || 0;
    const projectScore = hasGitHub
      ? Math.min(100, 40 + projectEvidence * 10)
      : (projectEvidence > 0 ? Math.min(100, projectEvidence * 15) : null);

    // Interview score: from completed interview sessions
    const completedInterviews = profile.interviewSessions?.length || 0;
    const interviewScore = completedInterviews > 0
      ? Math.min(100, 30 + completedInterviews * 15)
      : null;

    // Portfolio score: combination of links and evidence
    const hasLinkedIn = Boolean(profile.linkedinUrl);
    const portfolioScore = (hasGitHub || hasLinkedIn)
      ? Math.min(100, (hasGitHub ? 40 : 0) + (hasLinkedIn ? 30 : 0) + totalEvidence * 5)
      : null;

    // Overall: weighted composite of non-null scores only
    const scores = [
      { value: resumeScore, weight: 0.25 },
      { value: skillScore, weight: 0.25 },
      { value: projectScore, weight: 0.15 },
      { value: interviewScore, weight: 0.20 },
      { value: portfolioScore, weight: 0.15 },
    ].filter(s => s.value !== null);

    let overallScore = null;
    if (scores.length > 0) {
      const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
      const weightedSum = scores.reduce((sum, s) => sum + s.value * s.weight, 0);
      overallScore = Math.round(weightedSum / totalWeight);
    }

    // Determine next priority action based on actual state
    let nextPriorityAction = null;
    if (resumeScore === null) {
      nextPriorityAction = 'Upload your resume and run a resume analysis.';
    } else if (skillScore !== null && skillScore < 50) {
      nextPriorityAction = 'Verify your skills with evidence (GitHub, certifications).';
    } else if (interviewScore === null) {
      nextPriorityAction = 'Practice with the interview simulator.';
    } else if (overallScore !== null && overallScore < 75) {
      nextPriorityAction = 'Address your top skill gaps and strengthen your resume.';
    } else {
      nextPriorityAction = 'You are well-prepared. Focus on targeted job applications.';
    }

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
      nextPriorityAction,
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

    // Return existing actions, or empty with a hint if none exist
    if (actions.length === 0) {
      return res.json({
        actions: [],
        hint: 'Complete a resume analysis to receive personalized career actions based on your actual skill gaps.',
      });
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

    // Authenticated or unauthenticated GitHub REST API call (Section 14.3)
    const ghHeaders = {
      'User-Agent': 'Nexus-Evidence-Harvester',
      Accept: 'application/vnd.github.v3+json',
    };
    const ghToken = process.env.GITHUB_EVIDENCE_TOKEN || process.env.GITHUB_TOKEN;
    if (ghToken) {
      ghHeaders['Authorization'] = `Bearer ${ghToken}`;
    }

    const ghRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=15&sort=updated`, {
      headers: ghHeaders,
    });

    if (!ghRes.ok) {
      return res.status(ghRes.status).json({ error: 'GitHub user not found or rate limited.' });
    }

    const repos = await ghRes.json();
    const languageCounts = {};
    const analyzedRepos = [];

    repos.forEach((r) => {
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

    // Automatically sync verified languages to UserSkill (Provenance: VERIFIED)
    for (const [lang, count] of Object.entries(languageCounts)) {
      try {
        const skillRecord = await prisma.skill.upsert({
          where: { name: lang },
          update: {},
          create: { name: lang, category: 'Technology' },
        });

        await prisma.userSkill.upsert({
          where: {
            userId_skillId: {
              userId: req.user.id,
              skillId: skillRecord.id,
            },
          },
          update: {
            proficiency: count >= 3 ? 'ADVANCED' : 'INTERMEDIATE',
            provenance: 'VERIFIED',
            evidenceSource: `GitHub: ${username} (${count} public repos)`,
            lastVerified: new Date(),
          },
          create: {
            userId: req.user.id,
            skillId: skillRecord.id,
            proficiency: count >= 3 ? 'ADVANCED' : 'INTERMEDIATE',
            provenance: 'VERIFIED',
            evidenceSource: `GitHub: ${username} (${count} public repos)`,
            lastVerified: new Date(),
          },
        });
      } catch (skillErr) {
        console.warn(`[github-evidence] skill sync error for ${lang}:`, skillErr.message);
      }
    }

    // Sync candidate profile and SkillEvidence if profile exists
    try {
      const profile = await prisma.candidateProfile.findUnique({
        where: { userId: req.user.id },
      });
      if (profile) {
        for (const [lang, count] of Object.entries(languageCounts)) {
          await prisma.skillEvidence.create({
            data: {
              candidateId: profile.id,
              skill: lang,
              source: 'GITHUB',
              evidenceType: 'CODE_EVIDENCE',
              confidence: 0.90,
              evidenceDetails: JSON.stringify({
                username,
                reposCount: count,
                verifiedAt: new Date().toISOString(),
              }),
            },
          });
        }
      }

      // Log Audit Event
      await prisma.auditEvent.create({
        data: {
          userId: req.user.id,
          action: 'GITHUB_EVIDENCE_VERIFIED',
          actorRole: 'TRAINEE',
          targetType: 'GITHUB_PROFILE',
          targetId: username,
          details: JSON.stringify({
            username,
            totalRepos: repos.length,
            languagesVerified: Object.keys(languageCounts),
          }),
        },
      });
    } catch (auditErr) {
      console.warn('[github-evidence] audit log error:', auditErr.message);
    }

    const evidence = {
      username,
      totalPublicRepos: repos.length,
      primaryLanguages: languageCounts,
      verifiedCodeEvidence: Object.keys(languageCounts).map((lang) => ({
        skill: lang,
        evidenceType: 'CODE_EVIDENCE',
        confidence: 0.90,
        reposCount: languageCounts[lang],
        provenance: 'VERIFIED',
      })),
      recentProjects: analyzedRepos.slice(0, 5),
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
      },
    });

    res.json({ evidence, cached: false });
  } catch (err) {
    console.error('[github-evidence] error:', err);
    res.status(500).json({ error: 'Failed to verify GitHub evidence.' });
  }
});

export default router;
