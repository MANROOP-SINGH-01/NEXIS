/**
 * FILE: server/routes/careerGraph.js
 * PURPOSE: Endpoints for Career Graph taxonomy, role exploration,
 *          and importance-weighted skill gap analysis.
 * DEPENDENCIES: server/lib/prisma.js, server/services/skillGapEngine.js, server/middleware/authMiddleware.js
 * USED BY: server/index.js
 */

import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { computeSkillGaps } from '../services/skillGapEngine.js';

const router = Router();

// GET /api/career-graph/roles — Search or list available TargetRoles
router.get('/career-graph/roles', async (req, res) => {
  const query = String(req.query.query || '').trim();

  try {
    const roles = await prisma.targetRole.findMany({
      where: query
        ? {
            OR: [
              { title: { contains: query } },
              { onetCode: { contains: query } },
              { family: { contains: query } },
            ],
          }
        : undefined,
      take: 25,
      orderBy: { title: 'asc' },
      include: {
        _count: {
          select: { skillRequirements: true },
        },
      },
    });

    res.json({
      roles: roles.map((r) => ({
        id: r.id,
        onetCode: r.onetCode,
        title: r.title,
        family: r.family,
        zone: r.zone,
        skillCount: r._count.skillRequirements,
      })),
    });
  } catch (err) {
    console.error('[career-graph/roles] error:', err);
    res.status(500).json({ error: 'Failed to retrieve target roles.' });
  }
});

// GET /api/career-graph/role/:id/skills — Get detailed skill requirements for a role
router.get('/career-graph/role/:id/skills', async (req, res) => {
  const { id } = req.params;

  try {
    const role = await prisma.targetRole.findUnique({
      where: { id },
      include: {
        skillRequirements: {
          include: { skill: true },
          orderBy: [{ level: 'asc' }, { importance: 'desc' }],
        },
      },
    });

    if (!role) {
      return res.status(404).json({ error: 'Target role not found.' });
    }

    res.json({
      role: {
        id: role.id,
        onetCode: role.onetCode,
        title: role.title,
        family: role.family,
        requirements: role.skillRequirements.map((r) => ({
          skillId: r.skill.id,
          skillName: r.skill.name,
          category: r.skill.category,
          importance: r.importance,
          level: r.level,
        })),
      },
    });
  } catch (err) {
    console.error('[career-graph/role/:id/skills] error:', err);
    res.status(500).json({ error: 'Failed to retrieve role skills.' });
  }
});

// GET /api/career-graph/gaps — Compute personalized skill gaps for authenticated user
router.get('/career-graph/gaps', requireAuth, async (req, res) => {
  const roleId = req.query.roleId ? String(req.query.roleId).trim() : undefined;
  const roleQuery = req.query.roleQuery ? String(req.query.roleQuery).trim() : undefined;

  try {
    const result = await computeSkillGaps({
      userId: req.user.id,
      roleId,
      roleQuery,
    });

    res.json(result);
  } catch (err) {
    console.error('[career-graph/gaps] error:', err);
    res.status(500).json({ error: 'Failed to compute skill gaps.' });
  }
});

// POST /api/career-graph/user-skills — Add or update user skill with provenance
router.post('/career-graph/user-skills', requireAuth, async (req, res) => {
  const { skillName, proficiency = 'INTERMEDIATE', provenance = 'DECLARED', evidenceSource } = req.body;

  if (!skillName || !skillName.trim()) {
    return res.status(400).json({ error: 'skillName is required.' });
  }

  const cleanSkill = skillName.trim();
  const cleanProv = ['VERIFIED', 'DECLARED', 'INFERRED', 'UNSUPPORTED'].includes(provenance)
    ? provenance
    : 'DECLARED';

  try {
    // 1. Find or create Skill
    let skill = await prisma.skill.findUnique({
      where: { name: cleanSkill },
    });

    if (!skill) {
      skill = await prisma.skill.create({
        data: {
          name: cleanSkill,
          category: 'Technology',
        },
      });
    }

    // 2. Upsert UserSkill
    const userSkill = await prisma.userSkill.upsert({
      where: {
        userId_skillId: {
          userId: req.user.id,
          skillId: skill.id,
        },
      },
      update: {
        proficiency,
        provenance: cleanProv,
        evidenceSource: evidenceSource || undefined,
        lastVerified: cleanProv === 'VERIFIED' ? new Date() : undefined,
      },
      create: {
        userId: req.user.id,
        skillId: skill.id,
        proficiency,
        provenance: cleanProv,
        evidenceSource: evidenceSource || (cleanProv === 'VERIFIED' ? 'Verified evidence' : 'Self-declared profile'),
        lastVerified: cleanProv === 'VERIFIED' ? new Date() : undefined,
      },
      include: {
        skill: true,
      },
    });

    res.status(201).json({ userSkill });
  } catch (err) {
    console.error('[career-graph/user-skills] error:', err);
    res.status(500).json({ error: 'Failed to record user skill.' });
  }
});

export default router;
