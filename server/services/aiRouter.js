/**
 * FILE: server/services/aiRouter.js
 * PURPOSE: Centralized AI routing abstraction for model selection, fallbacks, structured validation, and retries.
 */

import { isFreeLLMAPIAvailable, chat as freeLlmChat } from './llmService.js';
import { callGeminiText } from './gemini.js';
import { callSarvamWithRetry } from './sarvam.js';
import { 
  FREELLMAPI_MODEL_GENERAL, 
  FREELLMAPI_MODEL_RESUME, 
  FREELLMAPI_MODEL_ATS, 
  FREELLMAPI_MODEL_INTERVIEW 
} from '../config.js';

// Map task types to FreeLLMAPI models
function getModelForTask(task) {
  switch (task) {
    case 'RESUME_PARSE':
    case 'RESUME_TAILOR':
      return FREELLMAPI_MODEL_RESUME;
    case 'ATS_ANALYSIS':
    case 'SKILL_GAP':
      return FREELLMAPI_MODEL_ATS;
    case 'INTERVIEW_GENERATION':
    case 'INTERVIEW_EVALUATION':
      return FREELLMAPI_MODEL_INTERVIEW;
    case 'GENERAL_CHAT':
    default:
      return FREELLMAPI_MODEL_GENERAL;
  }
}

// Map task types to legacy fallbacks if FreeLLMAPI is unavailable
async function legacyFallbackChat(task, payload) {
  const { messages, systemInstruction, jsonMode, fallbackKeys } = payload;
  const geminiKey = fallbackKeys?.gemini;
  
  // Collapse messages into a single prompt for legacy Gemini API
  const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
  return await callGeminiText({ apiKey: geminiKey, prompt, systemInstruction });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Core chat routing function with retries
 */
export async function chat({ task = 'GENERAL_CHAT', messages, systemInstruction, jsonMode = false, attempts = 3, timeout, fallbackKeys }) {
  const model = getModelForTask(task);
  let lastError = null;

  for (let i = 0; i < attempts; i++) {
    try {
      if (isFreeLLMAPIAvailable()) {
        const result = await freeLlmChat({ messages, systemInstruction, model, jsonMode, timeout });
        return result;
      } else {
        const result = await legacyFallbackChat(task, { messages, systemInstruction, jsonMode, fallbackKeys });
        return result;
      }
    } catch (error) {
      lastError = error;
      console.warn(`[aiRouter] Task ${task} attempt ${i + 1} failed: ${error.message}`);
      
      // Do not retry on explicit configuration/auth errors
      if (error.message.includes('configuration error')) throw error;
      
      // Exponential backoff
      if (i < attempts - 1) {
        await sleep(Math.pow(2, i) * 1000);
      }
    }
  }

  throw new Error(`AI Router failed after ${attempts} attempts: ${lastError?.message}`);
}

/**
 * Generate text from a single prompt
 */
export async function generate({ task = 'GENERAL_CHAT', prompt, systemInstruction, jsonMode = false, timeout, fallbackKeys }) {
  return chat({
    task,
    messages: [{ role: 'user', content: prompt }],
    systemInstruction,
    jsonMode,
    timeout,
    fallbackKeys
  });
}

/**
 * Structured output wrapper with strict JSON parsing and optional schema validation
 */
export async function structuredOutput({ task, prompt, messages, systemInstruction, schemaValidator, attempts = 3, timeout, fallbackKeys }) {
  const msgs = messages || [{ role: 'user', content: prompt }];
  let lastError = null;

  for (let i = 0; i < attempts; i++) {
    try {
      const rawText = await chat({
        task,
        messages: msgs,
        systemInstruction,
        jsonMode: true,
        attempts: 1, // We handle retries here for parsing
        timeout,
        fallbackKeys
      });

      // Attempt to parse JSON. Sometimes LLMs wrap JSON in markdown blocks
      let jsonStr = rawText;
      const match = rawText.match(/```json\n([\s\S]*?)\n```/);
      if (match) {
        jsonStr = match[1];
      }

      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (parseError) {
        throw new Error('LLM returned malformed JSON: ' + parseError.message);
      }

      if (schemaValidator) {
        schemaValidator(parsed); // Should throw if invalid
      }

      return parsed;
    } catch (error) {
      lastError = error;
      console.warn(`[aiRouter] Structured Output validation failed attempt ${i + 1}: ${error.message}`);
      if (i < attempts - 1) {
        await sleep(Math.pow(2, i) * 1000);
      }
    }
  }

  throw new Error(`Failed to generate valid structured output after ${attempts} attempts: ${lastError?.message}`);
}
