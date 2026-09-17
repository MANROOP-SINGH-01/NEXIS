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

// GET /api/passport - Get all passport items
router.get('/', async (req, res) => {
  try {
    const items = await prisma.careerPassportItem.findMany({
      where: { candidateId: req.candidateId },
      orderBy: { issuedAt: 'desc' }
    });
    res.json(items);
  } catch (error) {
    console.error('Error fetching passport items:', error);
    res.status(500).json({ error: 'Failed to fetch passport' });
  }
});

// POST /api/passport - Add manual passport item
router.post('/', async (req, res) => {
  const { type, title, description, issuedBy, issuedAt, url, verified = false } = req.body;
  
  if (!type || !title) {
    return res.status(400).json({ error: 'Type and title are required' });
  }
  
  try {
    const item = await prisma.careerPassportItem.create({
      data: {
        candidateId: req.candidateId,
        type,
        title,
        description,
        issuedBy,
        issuedAt: issuedAt ? new Date(issuedAt) : null,
        url,
        verified
      }
    });
    
    res.status(201).json(item);
  } catch (error) {
    console.error('Error adding passport item:', error);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// DELETE /api/passport/:id - Remove item
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const existing = await prisma.careerPassportItem.findUnique({ where: { id } });
    
    if (!existing) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    if (existing.candidateId !== req.candidateId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    await prisma.careerPassportItem.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting passport item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

export default router;
