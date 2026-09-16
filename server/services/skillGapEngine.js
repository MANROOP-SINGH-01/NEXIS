/**
 * FILE: server/services/skillGapEngine.js
 * PURPOSE: Core engine for deterministic, importance-weighted skill gap analysis
 *          and course recommendations based on the O*NET taxonomy and user profile.
 * DEPENDENCIES: server/lib/prisma.js
 * USED BY: server/routes/careerGraph.js
 */

import prisma from '../lib/prisma.js';

/**
 * Priority weighting matrix based on requirement level and O*NET importance.
 */
function calculatePriority(level, importance) {
  const levelWeight = level === 'REQUIRED' ? 1.0 : level === 'PREFERRED' ? 0.65 : 0.35;
  const score = (importance || 0.5) * levelWeight;

  if (score >= 0.75) return 'CRITICAL';
  if (score >= 0.5) return 'HIGH';
  if (score >= 0.3) return 'MEDIUM';
  return 'LOW';
}

/**
 * Computes skill gaps for an authenticated user against a target role.
 *
 * @param {Object} params
 * @param {string} params.userId - User ID
 * @param {string} [params.roleId] - TargetRole ID
 * @param {string} [params.roleQuery] - TargetRole title search string
 * @returns {Promise<Object>}
 */
export async function computeSkillGaps({ userId, roleId, roleQuery }) {
  // 1. Resolve TargetRole
  let targetRole = null;
  if (roleId) {
    targetRole = await prisma.targetRole.findUnique({
      where: { id: roleId },
      include: {
        skillRequirements: {
          include: { skill: true },
        },
      },
    });
  }

  if (!targetRole && roleQuery) {
    const cleanQuery = String(roleQuery).trim().toLowerCase();
    targetRole = await prisma.targetRole.findFirst({
      where: {
        OR: [
          { title: { contains: cleanQuery } },
          { onetCode: { contains: cleanQuery } },
        ],
      },
      include: {
        skillRequirements: {
          include: { skill: true },
        },
      },
    });
  }

  // Fallback to default Software Developers role if nothing matched
  if (!targetRole) {
    targetRole = await prisma.targetRole.findFirst({
      where: { onetCode: '15-1252.00' },
      include: {
        skillRequirements: {
          include: { skill: true },
        },
      },
    }) || await prisma.targetRole.findFirst({
      include: {
        skillRequirements: {
          include: { skill: true },
        },
      },
    });
  }

  if (!targetRole) {
    return {
      role: null,
      gaps: [],
      matches: [],
      gapSummary: { requiredMissing: 0, preferredMissing: 0, totalRequired: 0, coveragePercent: 0 },
      recommendations: [],
    };
  }

  // 2. Fetch User Skills (from UserSkill table + CandidateProfile.skillEvidences)
  const userSkills = await prisma.userSkill.findMany({
    where: { userId },
    include: { skill: true },
  });

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId },
    include: { skillEvidences: true },
  });

  // Map known user skills by normalized lowercase name
  const userSkillMap = new Map();

  for (const us of userSkills) {
    if (us.skill?.name) {
      userSkillMap.set(us.skill.name.toLowerCase(), {
        skill: us.skill.name,
        category: us.skill.category || 'Technology',
        proficiency: us.proficiency || 'INTERMEDIATE',
        provenance: us.provenance || 'DECLARED',
        evidenceSource: us.evidenceSource || 'User Profile',
      });
    }
  }

  if (profile?.skillEvidences) {
    for (const ev of profile.skillEvidences) {
      const lower = ev.skill.toLowerCase();
      if (!userSkillMap.has(lower)) {
        userSkillMap.set(lower, {
          skill: ev.skill,
          category: 'Technology',
          proficiency: ev.confidence >= 0.8 ? 'ADVANCED' : 'INTERMEDIATE',
          provenance: ev.verified ? 'VERIFIED' : (ev.source === 'GITHUB' ? 'VERIFIED' : 'DECLARED'),
          evidenceSource: ev.source === 'GITHUB' ? 'GitHub evidence analysis' : 'Resume evidence',
        });
      }
    }
  }

  // 3. Compute Matches & Gaps
  const matches = [];
  const gaps = [];
  let totalRequiredCount = 0;
  let matchedRequiredCount = 0;
  let preferredMissingCount = 0;

  for (const req of targetRole.skillRequirements) {
    const skillName = req.skill?.name;
    if (!skillName) continue;

    const lower = skillName.toLowerCase();
    const isRequired = req.level === 'REQUIRED';
    if (isRequired) totalRequiredCount++;

    if (userSkillMap.has(lower)) {
      const matched = userSkillMap.get(lower);
      if (isRequired) matchedRequiredCount++;
      matches.push({
        skill: skillName,
        category: req.skill.category || 'Technology',
        importance: req.importance,
        level: req.level,
        proficiency: matched.proficiency,
        provenance: matched.provenance,
        evidenceSource: matched.evidenceSource,
      });
    } else {
      if (req.level === 'PREFERRED') preferredMissingCount++;
      const priority = calculatePriority(req.level, req.importance);
      gaps.push({
        skillId: req.skill.id,
        skill: skillName,
        category: req.skill.category || 'Technology',
        importance: req.importance,
        level: req.level,
        priority,
        weight: (req.importance || 0.5) * (isRequired ? 1.0 : 0.65),
      });
    }
  }

  // Sort gaps by weight descending (most critical gaps first)
  gaps.sort((a, b) => b.weight - a.weight);

  // 4. Calculate Coverage Percentage
  const coveragePercent = totalRequiredCount > 0
    ? Math.round((matchedRequiredCount / totalRequiredCount) * 100)
    : (matches.length > 0 ? 80 : 0);

  // 5. Match Free & Government Courses for the top missing skills
  const gapSkillNames = gaps.slice(0, 5).map(g => g.skill.toLowerCase());
  const allCourses = await prisma.courseRecommendation.findMany();

  const recommendations = [];
  for (const course of allCourses) {
    let covered = [];
    try {
      covered = JSON.parse(course.skillsCovered || '[]');
    } catch {}

    const matchingGaps = covered.filter(s => gapSkillNames.some(g => s.toLowerCase().includes(g) || g.includes(s.toLowerCase())));
    if (matchingGaps.length > 0) {
      recommendations.push({
        courseId: course.id,
        title: course.title,
        provider: course.provider,
        url: course.url,
        duration: course.duration,
        level: course.level,
        isFree: course.isFree,
        isGovt: course.isGovt,
        addressesGaps: matchingGaps,
      });
    }
  }

  return {
    role: {
      id: targetRole.id,
      onetCode: targetRole.onetCode,
      title: targetRole.title,
      family: targetRole.family,
    },
    gaps,
    matches,
    gapSummary: {
      requiredMissing: totalRequiredCount - matchedRequiredCount,
      preferredMissing: preferredMissingCount,
      totalRequired: totalRequiredCount,
      matchedRequired: matchedRequiredCount,
      coveragePercent,
    },
    recommendations,
  };
}
