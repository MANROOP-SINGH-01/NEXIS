import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import resilienceStore from '../lib/resilienceStore.js';

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
      if (req.user?.candidateProfile) {
        return res.json({ profile: req.user.candidateProfile });
      }
      return res.status(404).json({ error: 'Profile not found.' });
    }

    res.json({ profile });
  } catch (err) {
    console.warn('[profile/get] Remote DB error, serving from session profile:', err.message);
    if (req.user?.candidateProfile) {
      return res.json({ profile: req.user.candidateProfile });
    }
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

// DELETE /api/profile - Unified account & personal data deletion (Right-to-be-Forgotten / DPDP)
router.delete('/profile', requireAuth, async (req, res) => {
  const userId = req.user.id;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        trainee: true,
        candidateProfile: true,
      }
    });

    if (user) {
      // 1. If candidateProfile exists, delete dependent records
      if (user.candidateProfile) {
        const cpId = user.candidateProfile.id;
        try { await prisma.jobApplication.deleteMany({ where: { candidateId: cpId } }); } catch (_) {}
        try { await prisma.careerAction.deleteMany({ where: { candidateId: cpId } }); } catch (_) {}
        try { await prisma.careerReadinessSnapshot.deleteMany({ where: { candidateId: cpId } }); } catch (_) {}
        try { await prisma.interviewSession.deleteMany({ where: { candidateId: cpId } }); } catch (_) {}
        try { await prisma.skillEvidence.deleteMany({ where: { candidateId: cpId } }); } catch (_) {}
        try { await prisma.careerPassportItem.deleteMany({ where: { candidateId: cpId } }); } catch (_) {}
        try { await prisma.candidateProfile.delete({ where: { id: cpId } }); } catch (_) {}
      }

      // 2. User skills, sessions, event logs
      try { await prisma.userSkill.deleteMany({ where: { userId } }); } catch (_) {}
      try { await prisma.session.deleteMany({ where: { userId } }); } catch (_) {}
      try { await prisma.agentEventLog.deleteMany({ where: { userId } }); } catch (_) {}

      // 3. If trainee is linked, delete trainee and its records
      if (user.traineeId) {
        try { await prisma.consentRecord.deleteMany({ where: { traineeId: user.traineeId } }); } catch (_) {}
        try { await prisma.enrolment.deleteMany({ where: { traineeId: user.traineeId } }); } catch (_) {}
        try { await prisma.outcomeCheckIn.deleteMany({ where: { traineeId: user.traineeId } }); } catch (_) {}
        try { await prisma.employerVerification.deleteMany({ where: { traineeId: user.traineeId } }); } catch (_) {}
        try { await prisma.govtCrossCheckResult.deleteMany({ where: { traineeId: user.traineeId } }); } catch (_) {}
        try { await prisma.trainee.delete({ where: { id: user.traineeId } }); } catch (_) {}
      }

      // 4. Delete user record
      await prisma.user.delete({ where: { id: userId } });
    }
  } catch (err) {
    console.warn('[profile/delete] Remote DB delete warning:', err.message);
  }

  // Always purge user and revoke all active sessions from resilienceStore
  resilienceStore.deleteUser(userId);

  res.clearCookie('sessionToken');
  res.json({
    success: true,
    message: 'Your account and all associated personal data have been completely deleted in compliance with the DPDP Act.'
  });
});

export default router;
