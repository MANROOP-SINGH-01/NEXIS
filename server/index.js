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

import cookieParser from 'cookie-parser'
import express from 'express'
import cors from 'cors'
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

import { seedAdminUser } from './lib/seedAdminUser.js'

const app = express()

// ── Middleware ─────────────────────────────────────────────────────────────────
// Relaxed CORS for the demo environment to ensure Vercel proxying works flawlessly
app.use(cors({
  origin: function (origin, callback) {
    callback(null, true)
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

// Direct root redirect for provider view links
app.get('/provider-view/:token', (req, res) => {
  res.redirect(`/api/provider-view/${req.params.token}`)
})

// ── Start ─────────────────────────────────────────────────────────────────────
const startServer = async () => {
  await seedAdminUser()
  app.listen(PORT, () => {
    console.log(`[forge-api] listening on http://localhost:${PORT}`)
  })
}

// Only start the server if this file is run directly (not imported)
if (process.env.NODE_ENV !== 'test' && import.meta.url === `file://${process.argv[1]}`) {
  startServer()
}

export default app
