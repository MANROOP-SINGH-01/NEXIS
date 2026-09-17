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

// GET /api/applications - Get all applications for the candidate
router.get('/', async (req, res) => {
  try {
    const applications = await prisma.jobApplication.findMany({
      where: { candidateId: req.candidateId },
      include: {
        events: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    res.json(applications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// POST /api/applications - Create a new application
router.post('/', async (req, res) => {
  const { jobTitle, companyName, applicationLink, status = 'SAVED', notes } = req.body;
  
  if (!jobTitle || !companyName) {
    return res.status(400).json({ error: 'Job title and company name are required' });
  }
  
  try {
    const application = await prisma.jobApplication.create({
      data: {
        candidateId: req.candidateId,
        jobTitle,
        companyName,
        applicationLink,
        status,
        notes,
        events: {
          create: {
            status,
            notes: 'Application tracked'
          }
        }
      },
      include: {
        events: true
      }
    });
    
    res.status(201).json(application);
  } catch (error) {
    console.error('Error creating application:', error);
    res.status(500).json({ error: 'Failed to create application' });
  }
});

// PATCH /api/applications/:id/status - Update application status (state machine)
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, notes, rejectionReason } = req.body;
  
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }
  
  try {
    // Verify ownership
    const existing = await prisma.jobApplication.findUnique({
      where: { id }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    if (existing.candidateId !== req.candidateId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const updateData = { status };
    if (rejectionReason) updateData.rejectionReason = rejectionReason;
    if (status === 'APPLIED' && !existing.appliedDate) updateData.appliedDate = new Date();
    
    const application = await prisma.jobApplication.update({
      where: { id },
      data: {
        ...updateData,
        events: {
          create: {
            status,
            notes
          }
        }
      },
      include: {
        events: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    res.json(application);
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

export default router;
