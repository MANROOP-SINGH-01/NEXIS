/**
 * FILE: server/routes/health.js
 * PURPOSE: Health check endpoint.
 * DEPENDENCIES: None
 * USED BY: server/index.js
 */

import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { FREELLMAPI_BASE_URL, GEMINI_API_KEY } from '../config.js'

const router = Router()

router.get('/health', async (_req, res) => {
  let dbStatus = 'unavailable'
  try {
    const count = await prisma.skill.count()
    if (typeof count === 'number') {
      dbStatus = 'connected'
    }
  } catch (err) {
    dbStatus = 'unavailable'
  }

  let freeLlmStatus = 'unavailable'
  try {
    const check = await fetch(`${FREELLMAPI_BASE_URL}/models`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    })
    if (check.ok || check.status === 401 || check.status === 403) {
      freeLlmStatus = 'available'
    }
  } catch {
    // Timeout or network error
  }

  const geminiStatus = GEMINI_API_KEY && GEMINI_API_KEY.trim().length > 5 ? 'available' : 'unavailable'
  const llmStatus = (geminiStatus === 'available' || freeLlmStatus === 'available') ? 'available' : 'unavailable'

  res.json({
    status: 'ok',
    database: dbStatus,
    llmRouter: llmStatus,
    providers: {
      gemini: geminiStatus,
      freeLlm: freeLlmStatus
    }
  })
})

router.get('/diagnostic/freellm', async (req, res) => {
  try {
    if (!isFreeLLMAPIAvailable()) {
      return res.status(503).json({ ok: false, error: 'FreeLLMAPI is not configured' });
    }
    
    const startTime = Date.now();
    const result = await generate({ 
      prompt: 'Reply with exactly: NEXIS LLM TEST OK', 
      systemInstruction: 'You are a test diagnostic service.' 
    });
    const latency = Date.now() - startTime;
    
    res.json({
      ok: true,
      latencyMs: latency,
      response: result
    });
  } catch (error) {
    console.error('[diagnostic] FreeLLMAPI test failed:', error.message);
    res.status(503).json({ ok: false, error: 'Provider test failed or timed out.' });
  }
})

export default router
