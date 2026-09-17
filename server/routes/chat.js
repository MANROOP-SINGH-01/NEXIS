/**
 * FILE: server/routes/chat.js
 * PURPOSE: Nexus-Director chat endpoint.
 * DEPENDENCIES: services/gemini, config
 * USED BY: server/index.js
 */

import { Router } from 'express'
import { GEMINI_API_KEY } from '../config.js'
import { generate } from '../services/aiRouter.js'
import { toFriendlyModelWarning } from '../utils/errors.js'

const router = Router()

router.post('/chat/director', async (req, res) => {
  const message = String(req.body?.message || '').trim()
  const context = String(req.body?.context || '').trim()
  const history = Array.isArray(req.body?.history) ? req.body.history : []
  const apiKey = String(req.body?.key || GEMINI_API_KEY).trim()

  if (!message) {
    res.status(400).json({ error: 'Message is required.' })
    return
  }

  try {
    const compactHistory = history
      .slice(-8)
      .map((m) => {
        const role = String(m?.role || 'user').toLowerCase() === 'assistant' ? 'Director' : 'User'
        const content = String(m?.content || '').trim()
        return content ? `${role}: ${content}` : ''
      })
      .filter(Boolean)
      .join('\n')

    const reply = await generate({
      task: 'GENERAL_CHAT',
      prompt: `Context:\n${context}\n\nRecent chat:\n${compactHistory || 'None'}\n\nUser message:\n${message}`,
      systemInstruction: 'You are Nexus-Director helping tailor resumes to JDs. Give practical, specific guidance in 4-8 lines. Use direct language and suggest next actions.',
      attempts: 4,
    })

    res.json({ reply: reply || 'I recommend focusing your top 3 bullets on measurable outcomes directly aligned to the job description.' })
  } catch (err) {
    console.error('[chat/director] model error:', err)
    res.status(503).json({
      error: 'AI Chat Service is currently offline or quota exceeded.',
    })
  }
})

export default router
