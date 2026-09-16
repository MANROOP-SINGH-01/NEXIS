import prisma from '../lib/prisma.js';
import { validateSession } from '../services/authService.js';
import { resolveGithubIdentity } from '../utils/auth.js';

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : req.cookies?.sessionToken || '';

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
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

  // 2. Dev / mock tokens for local testing, CI, and hackathon reliability
  if (token.startsWith('mock_') || token.startsWith('dev_') || token === 'demo-token') {
    let devUser = await prisma.user.findFirst({
      include: { candidateProfile: true },
    });
    if (!devUser) {
      devUser = await prisma.user.create({
        data: {
          phone: '+919999999999',
          role: 'CANDIDATE',
          candidateProfile: {
            create: {
              name: 'Dev Candidate',
              profileCompleteness: 80,
            },
          },
        },
        include: { candidateProfile: true },
      });
    }
    req.user = devUser;
    req.sessionToken = token;
    return next();
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
