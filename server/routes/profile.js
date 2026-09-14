import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Calculate deterministic profile completeness (0-100)
function computeCompleteness(p) {
  let score = 20; // baseline identity
  if (p.name) score += 10;
  if (p.headline) score += 10;
  if (p.location) score += 10;
  if (p.education) score += 10;
  if (p.experienceSummary) score += 15;
  if (p.githubUrl) score += 10;
  if (p.linkedinUrl) score += 5;
  if (p.targetRoles) score += 10;
  return Math.min(100, score);
}

// GET /api/profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: req.user.id },
      include: {
        careerActions: { where: { status: 'PENDING' }, take: 5 },
        applications: { take: 10, orderBy: { updatedAt: 'desc' } },
        readinessSnapshots: { take: 1, orderBy: { createdAt: 'desc' } },
      }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    res.json({ profile });
  } catch (err) {
    console.error('[profile/get] error:', err);
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

// PATCH /api/profile
router.patch('/profile', requireAuth, async (req, res) => {
  const updates = req.body || {};
  const allowed = [
    'name', 'headline', 'location', 'education', 'experienceSummary',
    'githubUrl', 'linkedinUrl', 'targetRoles', 'preferredLocations',
    'preferredWorkMode', 'salaryPreference'
  ];

  const dataToUpdate = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      dataToUpdate[key] = typeof updates[key] === 'object' ? JSON.stringify(updates[key]) : String(updates[key]);
    }
  }

  try {
    const current = await prisma.candidateProfile.findUnique({
      where: { userId: req.user.id }
    });

    if (!current) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    const merged = { ...current, ...dataToUpdate };
    dataToUpdate.profileCompleteness = computeCompleteness(merged);

    const updated = await prisma.candidateProfile.update({
      where: { userId: req.user.id },
      data: dataToUpdate,
    });

    await prisma.auditEvent.create({
      data: {
        userId: req.user.id,
        action: 'PROFILE_UPDATED',
        actorRole: req.user.role,
        details: JSON.stringify(Object.keys(dataToUpdate)),
      }
    }).catch(() => {});

    res.json({ profile: updated });
  } catch (err) {
    console.error('[profile/patch] error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// GET /api/profile/completeness
router.get('/profile/completeness', requireAuth, async (req, res) => {
  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: req.user.id }
  });
  const score = profile ? computeCompleteness(profile) : 0;
  res.json({
    completeness: score,
    missingItems: [
      !profile?.githubUrl && 'GitHub Profile Link',
      !profile?.headline && 'Professional Headline',
      !profile?.experienceSummary && 'Work Experience Summary',
      !profile?.targetRoles && 'Target Job Roles',
    ].filter(Boolean)
  });
});

export default router;
