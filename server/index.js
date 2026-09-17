/**
 * FILE: server/index.js
 * PURPOSE: Express application entry point — mounts middleware and route modules.
 * DEPENDENCIES: express, cookie-parser, config, routes/*
 * USED BY: package.json (npm run dev:api)
 *
 * CLEANUP DONE:
 * - Removed 1,600+ lines of inline route handlers, service functions, and utilities
 * - Extracted into server/config.js, server/routes/*, server/services/*, server/utils/*
 * - Removed hardcoded API keys (moved to .env via config.js)
 *
 * REFACTORING DONE:
 * - Split monolithic file into focused modules
 * - Each route file uses Express Router for clean mounting
 * - Services are independently testable
 */
// Polyfill DOM globals for headless / serverless Node.js runtimes
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() {
      this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
      this.m11 = 1; this.m12 = 0; this.m13 = 0; this.m14 = 0;
      this.m21 = 0; this.m22 = 1; this.m23 = 0; this.m24 = 0;
      this.m31 = 0; this.m32 = 0; this.m33 = 1; this.m34 = 0;
      this.m41 = 0; this.m42 = 0; this.m43 = 0; this.m44 = 1;
    }
  };
}
if (typeof globalThis.ImageData === 'undefined') {
  globalThis.ImageData = class ImageData {};
}
if (typeof globalThis.Path2D === 'undefined') {
  globalThis.Path2D = class Path2D {};
}

import cookieParser from 'cookie-parser'
import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { PORT, FRONTEND_URL } from './config.js'

// Route modules
import authRoutes from './routes/auth.js'
import profileRoutes from './routes/profile.js'
import careerEngineRoutes from './routes/careerEngine.js'
import healthRoutes from './routes/health.js'
import resumeRoutes from './routes/resume.js'
import githubRoutes from './routes/github.js'
import linkedinAuthRoutes from './routes/linkedinAuth.js'
import chatRoutes from './routes/chat.js'
import interviewRoutes from './routes/interview.js'
import jobsRoutes from './routes/jobs.js'
import programsRouter from './routes/programs.js'
import traineeRoutes from './routes/trainee.js'
import consentRoutes from './routes/consent.js'
import outcomeRoutes from './routes/outcomes.js'
import adminRoutes from './routes/admin.js'
import otpAuthRoutes from './routes/otpAuth.js'
import employerRoutes from './routes/employer.js'
import govtCheckRoutes from './routes/govtCheck.js'
import analyticsRoutes from './routes/analytics.js'
import careerGraphRoutes from './routes/careerGraph.js'
import agentsRoutes from './routes/agents.js'
import applicationsRoutes from './routes/applications.js'
import evidenceRoutes from './routes/evidence.js'
import passportRoutes from './routes/passport.js'

import { seedAdminUser } from './lib/seedAdminUser.js'

const app = express()

// ── Middleware ─────────────────────────────────────────────────────────────────
// Production-safe CORS: allow verified Vercel domains, configured FRONTEND_URL, and dev localhost
const allowedOrigins = [
  FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
]

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true) // Allow server-to-server or non-browser requests
    if (allowedOrigins.includes(origin)) return callback(null, true)
    // Allow any Nexis Vercel preview or production domain
    if (/^https:\/\/(nexis|nexis-forge)[a-z0-9-]*\.vercel\.app$/.test(origin)) {
      return callback(null, true)
    }
    if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:')) {
      return callback(null, true)
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`))
  },
  credentials: true
}))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api', authRoutes)
app.use('/api', profileRoutes)
app.use('/api', careerEngineRoutes)
app.use('/api', healthRoutes)
app.use('/api', resumeRoutes)
app.use('/api', githubRoutes)
app.use('/api', linkedinAuthRoutes)
app.use('/api', chatRoutes)
app.use('/api', interviewRoutes)
app.use('/api', jobsRoutes)
app.use('/api', programsRouter)
app.use('/api', traineeRoutes)
app.use('/api', consentRoutes)
app.use('/api', outcomeRoutes)
app.use('/api', adminRoutes)
app.use('/api', otpAuthRoutes)
app.use('/api', employerRoutes)
app.use('/api', govtCheckRoutes)
app.use('/api', analyticsRoutes)
app.use('/api', careerGraphRoutes)
app.use('/api/agents', agentsRoutes)
app.use('/api/applications', applicationsRoutes)
app.use('/api/evidence', evidenceRoutes)
app.use('/api/passport', passportRoutes)

// Direct root redirect for provider view links
app.get('/provider-view/:token', (req, res) => {
  res.redirect(`/api/provider-view/${req.params.token}`)
})

// ── Start ─────────────────────────────────────────────────────────────────────
const startServer = async () => {
  if (process.env.NODE_ENV === 'production') {
    const llmUrl = process.env.FREELLMAPI_BASE_URL || 'http://127.0.0.1:31415/v1'
    const isLocalhost = llmUrl.includes('127.0.0.1') || llmUrl.includes('localhost') || llmUrl.includes('host.docker.internal')
    
    if (isLocalhost && process.env.VERCEL) {
      console.error('[CONFIG ERROR] FREELLMAPI_BASE_URL is pointing to local/host gateway, but the app is running in a serverless environment (Vercel). FreeLLMAPI must be externally reachable.')
    } else if (isLocalhost) {
      console.warn('[CONFIG INFO] FREELLMAPI_BASE_URL is pointing to a local host-gateway in production mode. Ensure FreeLLMAPI is deployed on this exact same VM instance.')
    }
  }

  await seedAdminUser()
  app.listen(PORT, () => {
    console.log(`[forge-api] listening on http://localhost:${PORT}`)
  })
}

// Only start the server if this file is run directly (not imported)
if (process.env.NODE_ENV !== 'test' && process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer()
}

export default app
