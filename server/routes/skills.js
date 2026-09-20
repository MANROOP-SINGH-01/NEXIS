/**
 * FILE: server/routes/skills.js
 * PURPOSE: Explainable Skill Intelligence, Taxonomy Crosswalk, Character-Offset sourceSpan
 *          Grounding, and Denominator-Grounded Gap Analysis (Defect #3 Fix).
 * NAMESPACE: /api/skills/*
 * SPEC: Master Implementation Spec Section 14.5, 17.1-17.5, and Phase 6.
 */

import { Router } from 'express';
import prisma from '../lib/prisma.js';
import resilienceStore from '../lib/resilienceStore.js';
import { requireFeatureFlag } from '../utils/featureFlags.js';
import { validateSession } from '../services/authService.js';
import {
  getAllSkills,
  getSkillById,
  getAllOccupations,
  getOccupationById,
  getOccupationSkills,
} from '../services/skillTaxonomy.js';
import {
  extractSkillsFromText,
  validateSkillClaim,
  computeSkillGaps,
  EVIDENCE_CLASSES,
} from '../services/skillEngine.js';

const router = Router();

// Apply feature flag check for the skills namespace
router.use(requireFeatureFlag('EXPLAINABLE_SKILL_INTELLIGENCE'));

/**
 * Optional / permissive auth middleware for skills endpoints.
 * Populates req.user if a valid token is supplied, without rejecting unauthenticated calls.
 */
async function resolveOptionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : req.cookies?.sessionToken || '';

  if (!token) {
    return next();
  }

  // 1. Check resilienceStore session
  const resilienceUser = resilienceStore.validateSession(token);
  if (resilienceUser) {
    req.user = resilienceUser;
    req.sessionToken = token;
    return next();
  }

  // 2. Check primary Prisma session
  try {
    const user = await validateSession(token);
    if (user) {
      req.user = user;
      req.sessionToken = token;
    }
  } catch (err) {
    // Session validation error ignored for optional auth
  }

  next();
}

/**
 * GET /api/skills/ping — Health & contract verification probe
 */
router.get('/ping', (req, res) => {
  res.json({
    namespace: '/api/skills',
    status: 'ready',
    evidenceClasses: Object.keys(EVIDENCE_CLASSES),
    supportedOccupationsCount: getAllOccupations().length,
    taxonomySkillsCount: getAllSkills().length,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/skills/taxonomy — Returns complete skill taxonomy with NSQF and ESCO references
 */
router.get('/taxonomy', (req, res) => {
  const { category, nsqfLevel } = req.query;
  let skills = getAllSkills();

  if (category) {
    skills = skills.filter((s) => String(s.category).toLowerCase() === String(category).toLowerCase());
  }

  if (nsqfLevel) {
    const levelNum = parseInt(String(nsqfLevel), 10);
    if (!isNaN(levelNum)) {
      skills = skills.filter((s) => s.nsqfLevel === levelNum);
    }
  }

  res.json({
    skills,
    total: skills.length,
    supportedCategories: ['Technical', 'Soft', 'Tool', 'Domain'],
  });
});

/**
 * GET /api/skills/occupations — Lists standard target occupations
 */
router.get('/occupations', (req, res) => {
  const occupations = getAllOccupations();
  res.json({
    occupations,
    total: occupations.length,
  });
});

/**
 * GET /api/skills/occupations/:id — Returns an occupation and its required competency matrix
 */
router.get('/occupations/:id', (req, res) => {
  const occupation = getOccupationById(req.params.id);
  if (!occupation) {
    return res.status(404).json({ error: `Occupation "${req.params.id}" not found.` });
  }

  const requiredSkills = getOccupationSkills(occupation.id);

  res.json({
    occupation,
    requiredSkills,
    totalRequired: requiredSkills.length,
  });
});

/**
 * POST /api/skills/extract — Deterministic skill extraction with mandatory sourceSpan
 * SPEC: Section 14.5, Section 17.2 (LLM inference with no source span is rejected)
 */
router.post('/extract', resolveOptionalAuth, async (req, res) => {
  const text = String(req.body?.text || '').trim();
  const sourceType = String(req.body?.sourceType || 'RESUME').toUpperCase();

  if (!text) {
    return res.status(400).json({ error: 'Missing required field: text' });
  }

  try {
    const extractedSkills = extractSkillsFromText(text, sourceType);

    // Invariant verification: Ensure every returned skill has non-null sourceSpan
    for (const skill of extractedSkills) {
      const validation = validateSkillClaim(skill, text);
      if (!validation.valid) {
        return res.status(422).json({
          error: 'Skill extraction failed invariant check',
          details: validation.reason,
        });
      }
    }

    res.json({
      extractedSkills,
      sourceType,
      totalExtracted: extractedSkills.length,
      mode: 'operational',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[skills/extract] error:', err);
    res.status(500).json({ error: 'Failed to extract skills from text' });
  }
});

/**
 * POST /api/skills/gap-analysis — Denominator-grounded skill gap analysis (Defect #3 Fix)
 * SPEC: Section 14.5, 17.3
 */
router.post('/gap-analysis', resolveOptionalAuth, async (req, res) => {
  try {
    const targetOccupationId = req.body?.targetOccupationId || 'occ_fullstack_dev';
    const resumeText = String(req.body?.resumeText || '').trim();
    let traineeId = req.body?.traineeId || req.user?.trainee?.id || req.user?.id || null;

    let existingEvidence = [];
    let userSkills = [];

    // 1. Gather existing evidence from resilienceStore and DB
    if (traineeId) {
      existingEvidence = resilienceStore.getTraineeSkillEvidence(traineeId);

      try {
        const dbEvidence = await prisma.traineeSkillEvidence.findMany({
          where: { traineeId },
          include: { skill: true },
        });

        if (Array.isArray(dbEvidence) && dbEvidence.length > 0) {
          const parsedDbEvidence = dbEvidence.map((ev) => ({
            id: ev.id,
            skillId: ev.skillId,
            evidenceClass: ev.evidenceClass,
            confidence: ev.confidence,
            sourceSpan: ev.sourceSpan ? JSON.parse(ev.sourceSpan) : null,
            verifiedAt: ev.verifiedAt,
          }));
          existingEvidence = [...existingEvidence, ...parsedDbEvidence];
        }

        // Also fetch UserSkills if user exists
        if (req.user?.id) {
          const dbUserSkills = await prisma.userSkill.findMany({
            where: { userId: req.user.id },
            include: { skill: true },
          });
          if (Array.isArray(dbUserSkills)) {
            userSkills = dbUserSkills;
          }
        }
      } catch (dbErr) {
        // Dual-store fallback: proceed with resilienceStore data
      }
    }

    // 2. Compute grounded gap analysis
    const analysis = computeSkillGaps({
      traineeId,
      targetOccupationId,
      resumeText,
      existingEvidence,
      userSkills,
    });

    // 3. If trainee is provided and resumeText was scanned, persist newly found skills
    if (traineeId && resumeText) {
      const newlyExtracted = extractSkillsFromText(resumeText, 'RESUME');
      for (const item of newlyExtracted) {
        // Record into resilienceStore
        resilienceStore.addTraineeSkillEvidence(traineeId, {
          skillId: item.skillId,
          evidenceClass: item.evidenceClass,
          strength: item.strength,
          sourceSpan: item.sourceSpan,
          confidence: item.confidence,
        });

        // Mirror to Prisma if DB is available
        try {
          await prisma.traineeSkillEvidence.create({
            data: {
              traineeId,
              skillId: item.skillId,
              evidenceClass: item.evidenceClass,
              confidence: item.confidence,
              sourceSpan: JSON.stringify(item.sourceSpan),
            },
          });
        } catch {
          // Gracefully continue in resilience mode
        }
      }
    }

    res.json(analysis);
  } catch (err) {
    console.error('[skills/gap-analysis] error:', err);
    res.status(500).json({ error: 'Failed to compute skill gap analysis' });
  }
});

/**
 * POST /api/skills/evidence — Add a verified trainee skill evidence record
 */
router.post('/evidence', resolveOptionalAuth, async (req, res) => {
  const traineeId = req.body?.traineeId || req.user?.trainee?.id || req.user?.id;
  const skillId = req.body?.skillId;
  const evidenceClass = String(req.body?.evidenceClass || 'RESUME_MENTION').toUpperCase();
  const sourceSpan = req.body?.sourceSpan || null;
  const confidence = typeof req.body?.confidence === 'number' ? req.body?.confidence : EVIDENCE_CLASSES[evidenceClass]?.baseConfidence || 0.5;

  if (!traineeId) {
    return res.status(400).json({ error: 'Missing required field: traineeId' });
  }
  if (!skillId) {
    return res.status(400).json({ error: 'Missing required field: skillId' });
  }

  if (!EVIDENCE_CLASSES[evidenceClass]) {
    return res.status(400).json({
      error: `Invalid evidenceClass "${evidenceClass}". Allowed: ${Object.keys(EVIDENCE_CLASSES).join(', ')}`,
    });
  }

  // If claim is RESUME_MENTION, sourceSpan is mandatory
  if (evidenceClass === 'RESUME_MENTION' && !sourceSpan) {
    return res.status(422).json({
      error: 'Rejected: sourceSpan is mandatory for RESUME_MENTION evidence claims (Section 17.2).',
    });
  }

  const evidencePayload = {
    skillId,
    evidenceClass,
    strength: EVIDENCE_CLASSES[evidenceClass].strength,
    confidence,
    sourceSpan,
    verifiedAt: new Date(),
  };

  // 1. Mirror to resilienceStore
  const recorded = resilienceStore.addTraineeSkillEvidence(traineeId, evidencePayload);

  // 2. Mirror to DB
  try {
    await prisma.traineeSkillEvidence.create({
      data: {
        traineeId,
        skillId,
        evidenceClass,
        confidence,
        sourceSpan: sourceSpan ? JSON.stringify(sourceSpan) : null,
      },
    });
  } catch {
    // Continue in resilience mode
  }

  res.status(201).json({
    success: true,
    evidence: recorded,
  });
});

export default router;
