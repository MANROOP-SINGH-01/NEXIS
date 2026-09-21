import prisma from '../lib/prisma.js';
import { validateSession } from '../services/authService.js';
import { resolveGithubIdentity } from '../utils/auth.js';
import resilienceStore from '../lib/resilienceStore.js';

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : req.cookies?.sessionToken || '';

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  // 0. Resilience session validation
  const resilienceUser = resilienceStore.validateSession(token);
  if (resilienceUser) {
    req.user = resilienceUser;
    req.sessionToken = token;
    return next();
  }

  // 0b. Local development & demo fallback
  if (token === 'dev_trainee' || token === 'dev_token' || (process.env.NODE_ENV !== 'production' && token.startsWith('dev_'))) {
    let devUser = resilienceStore.findUserById('usr_demo_resilience');
    if (!devUser) {
      devUser = {
        id: 'usr_demo_resilience',
        phone: '+919876543210',
        email: 'candidate@nexis.gov.in',
        role: 'CANDIDATE',
        candidateProfile: {
          id: 'prf_demo',
          userId: 'usr_demo_resilience',
          name: 'Priya Sharma',
          profileCompleteness: 90,
          onboardingCompleted: false,
          preferredLocale: 'en',
        },
      };
      resilienceStore.addUser(devUser);
    }
    req.user = devUser;
    req.sessionToken = token;
    return next();
  }

  // If token is a resilience token but was revoked or user was deleted under DPDP, reject immediately
  if (token.startsWith('nexis_resilience_session_')) {
    return res.status(401).json({ error: 'Session invalid or expired. Please log in again.' });
  }

  // 1. Session token validation (primary User auth system)
  try {
    const user = await validateSession(token);
    if (user) {
      req.user = user;
      req.sessionToken = token;
      return next();
    }
  } catch (err) {
    console.error('[requireAuth] session validation error:', err);
  }



  // 3. Fallback: GitHub OAuth token (legacy path)
  try {
    const gh = await resolveGithubIdentity(req);
    if (gh && gh.githubId) {
      let linkedUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: `${gh.login}@github.com` },
            { trainee: { githubId: String(gh.githubId) } },
          ],
        },
        include: { candidateProfile: true },
      });
      if (!linkedUser) {
        linkedUser = await prisma.user.create({
          data: {
            phone: `+91000000${String(gh.githubId).slice(-4)}`,
            email: `${gh.login}@github.com`,
            role: 'CANDIDATE',
            candidateProfile: {
              create: {
                name: gh.login || 'GitHub User',
                profileCompleteness: 50,
              },
            },
          },
          include: { candidateProfile: true },
        });
      }
      req.user = linkedUser;
      req.sessionToken = token;
      return next();
    }
  } catch {
    // GitHub identity did not resolve, proceed to 401
  }

  return res.status(401).json({ error: 'Session invalid or expired. Please log in again.' });
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role) && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied: insufficient permissions.' });
    }
    next();
  };
}
