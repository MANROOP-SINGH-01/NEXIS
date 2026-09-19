/**
 * FILE: server/routes/telegram.js
 * PURPOSE: Telegram Career Assistant API routes (Proficiently headless loop)
 */

import express from 'express';
import {
  loadTelegramConfig,
  saveTelegramConfig,
  verifyBotToken,
  sendTelegramMessage,
  handleIncomingTelegramMessage,
} from '../services/telegramBotService.js';

const router = express.Router();

/**
 * GET /api/telegram/status
 * Returns connection state and configured bot profile
 */
router.get('/telegram/status', async (req, res) => {
  try {
    const config = loadTelegramConfig();
    res.json({
      connected: Boolean(config.connected && config.botToken && config.chatId),
      botUsername: config.botUsername || null,
      chatIdConfigured: Boolean(config.chatId),
      hasToken: Boolean(config.botToken),
      lastPolledAt: config.lastPolledAt || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/telegram/configure
 * Validates bot token with Telegram, saves config, and optionally sends test message
 */
router.post('/telegram/configure', async (req, res) => {
  const { botToken, chatId, sendTest } = req.body;

  if (!botToken || !chatId) {
    return res.status(400).json({ error: 'Both botToken and chatId are required.' });
  }

  try {
    // 1. Verify token with Telegram
    const botInfo = await verifyBotToken(botToken);

    // 2. Save configuration
    const saved = saveTelegramConfig({
      botToken: botToken.trim(),
      chatId: String(chatId).trim(),
      botUsername: botInfo.username,
      connected: true,
    });

    // 3. Optionally send test greeting message
    if (sendTest) {
      await sendTelegramMessage(
        `🎉 *NEXIS Career Assistant Connected!*\n\nYour autonomous job search assistant is now online.\n\nSend a job URL (Greenhouse, Lever, Workday) anytime to auto-prep your ATS application, or send \`search <role>\` to discover roles!`,
        { token: saved.botToken, chatId: saved.chatId }
      );
    }

    res.json({
      success: true,
      message: 'Telegram bot verified and connected successfully.',
      bot: botInfo,
    });
  } catch (err) {
    console.error('[telegram] Configure error:', err);
    res.status(400).json({
      success: false,
      error: err.message || 'Failed to verify Telegram bot token.',
    });
  }
});

/**
 * POST /api/telegram/test
 * Sends a test ping to the configured Telegram chat
 */
router.post('/telegram/test', async (req, res) => {
  try {
    const config = loadTelegramConfig();
    if (!config.botToken || !config.chatId) {
      return res.status(400).json({ error: 'Telegram bot token and chat ID must be configured first.' });
    }

    await sendTelegramMessage(
      `👋 *NEXIS Career OS Test Notification*\n\nYour connection to Telegram is active and healthy.\nTime: ${new Date().toLocaleTimeString()}`,
      { token: config.botToken, chatId: config.chatId }
    );

    res.json({ success: true, message: 'Test message delivered to Telegram.' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to deliver test message.' });
  }
});

/**
 * POST /api/telegram/simulate
 * Simulates an incoming message (useful for testing or local demo without a live webhook)
 */
router.post('/telegram/simulate', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text prompt required.' });
  }

  try {
    const config = loadTelegramConfig();
    const result = await handleIncomingTelegramMessage({
      text,
      chat: { id: config.chatId || 'simulated_chat' },
    });

    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/telegram/webhook
 * Webhook handler for live Telegram bot updates
 */
router.post('/telegram/webhook', async (req, res) => {
  try {
    const update = req.body;
    if (update?.message) {
      await handleIncomingTelegramMessage(update.message);
    }
    res.json({ ok: true });
  } catch (err) {
    console.warn('[telegram/webhook] Error processing update:', err);
    res.json({ ok: false, error: err.message });
  }
});

export default router;
