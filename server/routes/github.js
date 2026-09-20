/**
 * FILE: server/routes/github.js
 * PURPOSE: GitHub OAuth flow and repository data endpoints.
 * DEPENDENCIES: config
 * USED BY: server/index.js
 */

import { Router } from 'express'
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from '../config.js'
import { requireEnv } from '../utils/errors.js'

const router = Router()

router.get('/github/oauth/start', (req, res) => {
  if (!requireEnv('GITHUB_CLIENT_ID', GITHUB_CLIENT_ID, res)) return

  const redirectUri = process.env.GITHUB_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/github/oauth/callback`
  const state = Math.random().toString(36).slice(2)
  res.cookie('github_oauth_state', state, { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 10 * 60 * 1000 })

  const url = new URL('https://github.com/login/oauth/authorize')
  url.searchParams.set('client_id', GITHUB_CLIENT_ID)
  url.searchParams.set('scope', 'repo read:user')
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', state)

  res.redirect(url.toString())
})

router.get('/github/oauth/callback', async (req, res) => {
  if (!requireEnv('GITHUB_CLIENT_ID', GITHUB_CLIENT_ID, res)) return
  if (!requireEnv('GITHUB_CLIENT_SECRET', GITHUB_CLIENT_SECRET, res)) return

  const { code, state } = req.query
  if (!code) {
    res.status(400).send('Missing OAuth code')
    return
  }

  const expectedState = req.cookies.github_oauth_state
  if (!state || !expectedState || String(state) !== String(expectedState)) {
    res.status(400).send('Invalid OAuth state')
    return
  }

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
    }),
  })

  const tokenJson = await tokenRes.json()
  if (!tokenRes.ok || tokenJson.error || !tokenJson.access_token) {
    res.status(500).send('OAuth token exchange failed')
    return
  }

  const appReturn = process.env.APP_RETURN_URL || 'http://localhost:3000/'
  const next = new URL(appReturn)
  next.searchParams.set('github_token', tokenJson.access_token)
  res.clearCookie('github_oauth_state')
  res.redirect(next.toString())
})

// ── Phase 2: GitHub Intelligence Endpoints ─────────────────────────────────

import {
  fetchUserRepositories,
  matchRepositoriesToJobDescription,
  injectProjectsIntoResumeDocument,
  getTrendingProjectSuggestions,
} from '../services/githubService.js'

/**
 * GET /api/github/repos
 * GET /api/github/repos/:username
 * Fetch candidate public repositories (defaults to prkhrexists or Bearer token user)
 */
router.get(['/github/repos', '/github/repos/:username'], async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    const bearerToken = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null) || req.query.token || null
    const targetUser = req.params.username || req.query.username || 'prkhrexists'

    const repos = await fetchUserRepositories(targetUser, bearerToken)
    res.json({
      username: targetUser,
      count: repos.length,
      repos,
    })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch GitHub repositories' })
  }
})

/**
 * POST /api/github/match
 * Match candidate GitHub repositories against target Job Description with anti-hallucination verification
 */
router.post('/github/match', async (req, res) => {
  try {
    const { username, jd, resumeDocument, repos: customRepos, token: bodyToken } = req.body || {}
    const targetUser = username || 'prkhrexists'
    const targetJD = String(jd || '').trim()

    let repos = customRepos
    if (!Array.isArray(repos) || repos.length === 0) {
      const authHeader = req.headers.authorization
      const bearerToken = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null) || bodyToken || null
      repos = await fetchUserRepositories(targetUser, bearerToken)
    }

    const matches = matchRepositoriesToJobDescription(repos, targetJD, resumeDocument)

    // Also extract skills and recommend trending projects for gaps
    const candidateSkills = (resumeDocument?.skills?.core || []).concat(
      repos.map((r) => r.language).filter(Boolean)
    )
    const trending = getTrendingProjectSuggestions(targetJD, candidateSkills)

    res.json({
      username: targetUser,
      totalRepos: repos.length,
      matchedProjects: matches,
      trendingBlueprints: trending.slice(0, 3),
    })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to match repositories against JD' })
  }
})

/**
 * POST /api/github/inject
 * Inject grounded GitHub project bullets into a normalized ResumeDocument
 */
router.post('/api/github/inject', async (req, res) => {
  try {
    const { resumeDocument, selectedProjects } = req.body || {}
    if (!resumeDocument || typeof resumeDocument !== 'object') {
      res.status(400).json({ error: 'Valid resumeDocument is required.' })
      return
    }
    if (!Array.isArray(selectedProjects) || selectedProjects.length === 0) {
      res.status(400).json({ error: 'selectedProjects array is required.' })
      return
    }

    const result = injectProjectsIntoResumeDocument(resumeDocument, selectedProjects)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to inject projects into resume' })
  }
})

/**
 * GET /api/github/trending
 * Return high-impact trending project blueprints based on target role and skills
 */
router.get('/github/trending', (req, res) => {
  try {
    const role = String(req.query.role || req.query.jd || '').trim()
    const rawSkills = String(req.query.skills || '')
    const skills = rawSkills.split(',').map((s) => s.trim()).filter(Boolean)

    const trending = getTrendingProjectSuggestions(role, skills)
    res.json({
      role: role || 'Software Engineer',
      blueprints: trending,
    })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to generate trending blueprints' })
  }
})

export default router
