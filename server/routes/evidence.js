import express from 'express';
import { PrismaClient } from '@prisma/client';

import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(requireAuth);
router.use((req, res, next) => {
  if (!req.user?.candidateProfile?.id) {
    return res.status(404).json({ error: 'Candidate profile not found' });
  }
  req.candidateId = req.user.candidateProfile.id;
  next();
});

// GET /api/evidence - Get all verified evidence for a candidate
router.get('/', async (req, res) => {
  try {
    const evidence = await prisma.skillEvidence.findMany({
      where: { candidateId: req.candidateId },
      orderBy: { retrievedAt: 'desc' }
    });
    res.json(evidence);
  } catch (error) {
    console.error('Error fetching evidence:', error);
    res.status(500).json({ error: 'Failed to fetch evidence' });
  }
});

// POST /api/evidence/github-scan - Nexus-Verifier triggers GitHub scan
router.post('/github-scan', async (req, res) => {
  const { githubUsername } = req.body;
  
  if (!githubUsername) {
    return res.status(400).json({ error: 'GitHub username is required' });
  }
  
  try {
    // Fetch repos from GitHub API
    const response = await fetch(`https://api.github.com/users/${githubUsername}/repos?per_page=100`);
    if (!response.ok) {
      if (response.status === 404) return res.status(404).json({ error: 'GitHub user not found' });
      throw new Error(`GitHub API error: ${response.statusText}`);
    }
    const repos = await response.json();
    
    // Aggregate languages
    const languageCounts = {};
    for (const repo of repos) {
      if (repo.language) {
        languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
      }
    }
    
    // Map languages to skills (simple confidence heuristic based on repo count)
    const foundSkills = Object.entries(languageCounts).map(([lang, count]) => {
      // Very basic confidence curve based on repo count: 1 repo = 0.5, 5+ = 0.95
      let conf = 0.5 + Math.min(count, 5) * 0.09;
      return {
        skill: lang,
        type: 'CODE_EVIDENCE',
        conf: parseFloat(conf.toFixed(2)),
        details: `Found in ${count} repositories`
      };
    });
    
    const createdEvidence = [];
    
    for (const item of foundSkills) {
      // Create Evidence
      const ev = await prisma.skillEvidence.create({
        data: {
          candidateId: req.candidateId,
          skill: item.skill,
          source: 'GITHUB',
          evidenceType: item.type,
          confidence: item.conf,
          evidenceDetails: item.details
        }
      });
      
      createdEvidence.push(ev);
      
      // Also update or create the UserSkill with VERIFIED provenance
      const profile = await prisma.candidateProfile.findUnique({
        where: { id: req.candidateId },
        select: { userId: true }
      });
      
      if (profile) {
        let taxonomySkill = await prisma.skill.findFirst({
          where: { name: { equals: item.skill, mode: 'insensitive' } }
        });
        
        if (!taxonomySkill) {
            // Create if it doesn't exist in taxonomy
            taxonomySkill = await prisma.skill.create({
                data: {
                    name: item.skill,
                    category: 'Technical'
                }
            });
        }
        
        await prisma.userSkill.upsert({
          where: {
            userId_skillId: {
              userId: profile.userId,
              skillId: taxonomySkill.id
            }
          },
          update: {
            provenance: 'VERIFIED',
            evidenceSource: 'GITHUB',
            lastVerified: new Date()
          },
          create: {
            userId: profile.userId,
            skillId: taxonomySkill.id,
            provenance: 'VERIFIED',
            evidenceSource: 'GITHUB',
            lastVerified: new Date(),
            proficiency: 'INTERMEDIATE'
          }
        });
      }
    }
    
    res.json({
      message: 'GitHub scan completed',
      scannedRepos: repos.length,
      evidenceFound: createdEvidence.length,
      evidence: createdEvidence
    });
    
  } catch (error) {
    console.error('Error in GitHub scan:', error);
    res.status(500).json({ error: 'Failed to complete scan' });
  }
});

export default router;
