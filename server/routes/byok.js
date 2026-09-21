/**
 * FILE: server/routes/byok.js
 * PURPOSE: Authenticated endpoints for user Gemini API key management (BYOK).
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import {
  saveUserApiKey,
  getUserApiKeyStatus,
  deleteUserApiKey,
  testGeminiApiKey,
  getUserDecryptedApiKey,
} from '../services/byokService.js';

const router = Router();

// GET /api/ai/byok/status — Return masked status
router.get('/ai/byok/status', requireAuth, async (req, res) => {
  try {
    const status = await getUserApiKeyStatus(req.user.id, 'GEMINI');
    res.json({
      success: true,
      ...status,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/byok/save — Save and encrypt user key
router.post('/ai/byok/save', requireAuth, aiLimiter, async (req, res) => {
  const { apiKey, provider = 'GEMINI' } = req.body;
  if (!apiKey || !apiKey.trim()) {
    return res.status(400).json({ error: 'API key is required.' });
  }

  try {
    // Perform a quick verification before persisting
    const testResult = await testGeminiApiKey(apiKey);
    if (!testResult.success) {
      return res.status(400).json({
        error: `Key validation failed: ${testResult.message}`,
      });
    }

    await saveUserApiKey(req.user.id, provider, apiKey);
    const status = await getUserApiKeyStatus(req.user.id, provider);

    res.json({
      success: true,
      message: 'API key validated and encrypted successfully.',
      status,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/byok/test — Test active or candidate key
router.post('/ai/byok/test', requireAuth, aiLimiter, async (req, res) => {
  const { apiKey } = req.body;

  try {
    let keyToTest = apiKey;
    if (!keyToTest) {
      // Test stored key
      keyToTest = await getUserDecryptedApiKey(req.user.id, 'GEMINI');
    }

    if (!keyToTest) {
      return res.status(400).json({ error: 'No API key provided or found in account.' });
    }

    const result = await testGeminiApiKey(keyToTest);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/ai/byok — Remove user key
router.delete('/api/ai/byok', requireAuth, async (req, res) => {
  const { provider = 'GEMINI' } = req.body;
  try {
    await deleteUserApiKey(req.user.id, provider);
    res.json({ success: true, message: 'API key removed successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
