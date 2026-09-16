import express from 'express';
const router = express.Router();
import agentActivityService from '../services/agentActivityService.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// GET /api/agents/activity - SSE endpoint
router.get('/activity', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*' // If needed
  });

  // Send an initial connected message
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE connection established' })}\n\n`);

  const sendEvent = (record) => {
    res.write(`data: ${JSON.stringify(record)}\n\n`);
  };

  agentActivityService.on('agent_activity', sendEvent);

  // Keep-alive heartbeat every 15 seconds to prevent timeout
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    agentActivityService.off('agent_activity', sendEvent);
  });
});

export default router;
