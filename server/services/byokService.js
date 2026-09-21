/**
 * FILE: server/services/byokService.js
 * PURPOSE: Secure server-side AES-256-GCM storage, masking, and validation for user-supplied API keys (BYOK).
 * SECURITY: Raw keys are NEVER returned to the client and NEVER logged.
 */

import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import { GoogleGenAI } from '@google/genai';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const RAW_SECRET = process.env.BYOK_ENCRYPTION_KEY || process.env.GITHUB_CLIENT_SECRET || 'nexis_secure_byok_encryption_key_32bytes_v1';
const SECRET_KEY = crypto.createHash('sha256').update(RAW_SECRET).digest();

// In-memory fallback map for offline database resilience
const inMemoryKeys = new Map();

/**
 * Encrypt a plaintext API key.
 * @param {string} text Plaintext key
 * @returns {{ cipherHex: string, ivHex: string, tagHex: string }}
 */
export function encryptKey(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, SECRET_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return {
    cipherHex: encrypted,
    ivHex: iv.toString('hex'),
    tagHex: tag.toString('hex'),
  };
}

/**
 * Decrypt an encrypted API key.
 * @param {string} cipherHex
 * @param {string} ivHex
 * @param {string} tagHex
 * @returns {string} Plaintext key
 */
export function decryptKey(cipherHex, ivHex, tagHex) {
  const decipher = crypto.createDecipheriv(
    ENCRYPTION_ALGORITHM,
    SECRET_KEY,
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Save and encrypt a user API key.
 */
export async function saveUserApiKey(userId, provider, rawKey) {
  const cleanKey = String(rawKey || '').trim();
  if (!cleanKey) throw new Error('API key is required.');
  if (!userId) throw new Error('User ID is required.');

  const upperProvider = String(provider || 'GEMINI').toUpperCase();
  const keyLastFour = cleanKey.slice(-4);
  const { cipherHex, ivHex, tagHex } = encryptKey(cleanKey);

  // In-memory cache for offline/resilience mode
  inMemoryKeys.set(`${userId}:${upperProvider}`, {
    cipherHex,
    ivHex,
    tagHex,
    keyLastFour,
    isActive: true,
  });

  try {
    const existing = await prisma.userApiCredential.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: upperProvider,
        },
      },
    });

    if (existing) {
      return await prisma.userApiCredential.update({
        where: { id: existing.id },
        data: {
          encryptedKey: cipherHex,
          iv: ivHex,
          tag: tagHex,
          keyLastFour,
          isActive: true,
        },
      });
    }

    return await prisma.userApiCredential.create({
      data: {
        userId,
        provider: upperProvider,
        encryptedKey: cipherHex,
        iv: ivHex,
        tag: tagHex,
        keyLastFour,
        isActive: true,
      },
    });
  } catch (err) {
    console.warn('[byokService] Remote DB unreachable, stored key in resilient memory:', err.message);
    return {
      userId,
      provider: upperProvider,
      keyLastFour,
      isActive: true,
    };
  }
}

/**
 * Get decrypted API key for internal server-side execution.
 */
export async function getUserDecryptedApiKey(userId, provider = 'GEMINI') {
  if (!userId) return null;
  const upperProvider = String(provider).toUpperCase();

  try {
    const cred = await prisma.userApiCredential.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: upperProvider,
        },
      },
    });

    if (cred && cred.isActive) {
      return decryptKey(cred.encryptedKey, cred.iv, cred.tag);
    }
  } catch (err) {
    console.warn('[byokService] DB lookup failed, checking memory store:', err.message);
  }

  // Fallback to in-memory store
  const mem = inMemoryKeys.get(`${userId}:${upperProvider}`);
  if (mem && mem.isActive) {
    return decryptKey(mem.cipherHex, mem.iv, mem.tag);
  }

  return null;
}

/**
 * Get public-safe status of a user's API key (Masked, e.g. "••••••••••••ABCD").
 */
export async function getUserApiKeyStatus(userId, provider = 'GEMINI') {
  if (!userId) {
    return { hasKey: false, provider, keyLastFour: '', isActive: false };
  }
  const upperProvider = String(provider).toUpperCase();

  try {
    const cred = await prisma.userApiCredential.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: upperProvider,
        },
      },
    });

    if (cred) {
      return {
        hasKey: true,
        provider: upperProvider,
        keyLastFour: cred.keyLastFour,
        isActive: cred.isActive,
        updatedAt: cred.updatedAt,
      };
    }
  } catch (err) {
    console.warn('[byokService] DB lookup failed for key status, checking memory:', err.message);
  }

  const mem = inMemoryKeys.get(`${userId}:${upperProvider}`);
  if (mem) {
    return {
      hasKey: true,
      provider: upperProvider,
      keyLastFour: mem.keyLastFour,
      isActive: mem.isActive,
    };
  }

  return { hasKey: false, provider: upperProvider, keyLastFour: '', isActive: false };
}

/**
 * Delete / deactivate a user API key.
 */
export async function deleteUserApiKey(userId, provider = 'GEMINI') {
  if (!userId) return false;
  const upperProvider = String(provider).toUpperCase();
  inMemoryKeys.delete(`${userId}:${upperProvider}`);

  try {
    await prisma.userApiCredential.deleteMany({
      where: {
        userId,
        provider: upperProvider,
      },
    });
    return true;
  } catch (err) {
    console.warn('[byokService] DB delete failed:', err.message);
    return true;
  }
}

/**
 * Test a Gemini API key against Google GenAI endpoint.
 */
export async function testGeminiApiKey(apiKey) {
  const cleanKey = String(apiKey || '').trim();
  if (!cleanKey) {
    return { success: false, message: 'API key is empty.' };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: cleanKey });
    // Lightweight verification call
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Ping: reply with "PONG"',
    });

    const text = response?.text?.() || '';
    if (text) {
      return {
        success: true,
        message: 'Gemini API key is valid and connected.',
        model: 'gemini-2.5-flash',
      };
    }
    return { success: false, message: 'Gemini did not return a valid response.' };
  } catch (err) {
    console.error('[byokService] Gemini test call failed:', err.message);
    return {
      success: false,
      message: err.message || 'Failed to authenticate with Google Gemini.',
    };
  }
}
