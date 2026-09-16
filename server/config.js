/**
 * FILE: server/config.js
 * PURPOSE: Centralized configuration â€” environment variables, API keys, model lists.
 * DEPENDENCIES: dotenv
 * USED BY: All route and service modules
 */

import dotenv from 'dotenv'

dotenv.config()

export const PORT = process.env.PORT || 8787
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

// â”€â”€ GitHub OAuth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || ''
export const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || ''

// â”€â”€ LinkedIn OAuth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || ''
export const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || ''
export const LINKEDIN_REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI || ''

// â”€â”€ AI Service Keys â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const DEFAULT_GEMINI_KEY = process.env.GEMINI_API_KEY || ''
export const DEFAULT_SARVAM_KEY = process.env.SARVAM_API_KEY || ''
export const DEFAULT_SERPER_KEY = process.env.SERPER_API_KEY || ''
export const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID || ''
export const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY || ''
export const DEFAULT_RESUME_STRUCTURER_KEY = process.env.RESUME_STRUCTURER_KEY || ''
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY
export const SERPER_API_KEY = process.env.SERPER_API_KEY || ''

export const SARVAM_MODEL = process.env.SARVAM_MODEL || 'sarvam-105b'

// â”€â”€ Gemini Model Candidates (tried in order) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const GEMINI_MODELS = [
  process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  'gemini-3.1-pro-preview',
]
