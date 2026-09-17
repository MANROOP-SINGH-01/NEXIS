/**
 * FILE: server/services/llmService.js
 * PURPOSE: Centralized LLM Gateway connecting to FreeLLMAPI via OpenAI SDK.
 */

import OpenAI from 'openai';
import { FREELLMAPI_BASE_URL, FREELLMAPI_API_KEY, FREELLMAPI_MODEL } from '../config.js';

let openaiClient = null;

if (FREELLMAPI_API_KEY) {
  openaiClient = new OpenAI({
    baseURL: FREELLMAPI_BASE_URL,
    apiKey: FREELLMAPI_API_KEY,
  });
}

/**
 * Returns true if FreeLLMAPI is configured.
 */
export function isFreeLLMAPIAvailable() {
  return !!openaiClient;
}

/**
 * Clean chat generation wrapper.
 * @param {Object} options - Chat options
 * @param {Array} options.messages - Array of messages { role, content }
 * @param {string} [options.systemInstruction] - Optional system prompt
 * @param {string} [options.model] - Override default auto model
 * @param {boolean} [options.jsonMode] - Request JSON output
 * @param {number} [options.timeout] - Timeout in ms
 */
export async function chat({ messages, systemInstruction, model = FREELLMAPI_MODEL, jsonMode = false, timeout = 60000 }) {
  if (!openaiClient) {
    throw new Error('FreeLLMAPI is not configured. Missing FREELLMAPI_API_KEY.');
  }

  const payloadMessages = [];
  if (systemInstruction) {
    payloadMessages.push({ role: 'system', content: String(systemInstruction).trim() });
  }
  
  for (const msg of messages) {
    payloadMessages.push(msg);
  }

  const startTime = Date.now();
  console.log(`[llmService] -> FreeLLMAPI chat() request started`);

  try {
    const response = await openaiClient.chat.completions.create({
      model,
      messages: payloadMessages,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      temperature: 0.3,
    }, {
      timeout,
      maxRetries: 2,
    });

    const latency = Date.now() - startTime;
    console.log(`[llmService] <- FreeLLMAPI chat() success (${latency}ms)`);

    return response.choices?.[0]?.message?.content || '';
  } catch (error) {
    const latency = Date.now() - startTime;
    console.error(`[llmService] <- FreeLLMAPI chat() ERROR (${latency}ms):`, error.message);
    
    // Abstract external API errors so we don't leak internals
    if (error.status === 401) {
      throw new Error('AI service configuration error. Please contact the administrator.');
    } else if (error.status === 429) {
      throw new Error('AI service is currently overloaded (Quota/Rate Limit). Please try again later.');
    } else if (error.status >= 500 || error.code === 'ECONNREFUSED') {
      throw new Error('AI service is temporarily unavailable. Please try again.');
    }
    
    throw new Error('AI service request failed: ' + error.message);
  }
}

/**
 * Simple text generation wrapper (equivalent to a single user prompt).
 */
export async function generate({ prompt, systemInstruction, model, jsonMode, timeout }) {
  return chat({
    messages: [{ role: 'user', content: prompt }],
    systemInstruction,
    model,
    jsonMode,
    timeout
  });
}
