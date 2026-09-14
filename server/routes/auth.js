import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { hashPassword, verifyPassword, createSession, revokeSession, revokeAllUserSessions } from '../services/authService.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Helper: Normalize phone to E.164-like digits
function normalizePhone(phone) {
  const cleaned = String(phone || '').replace(/[^0-9+]/g, '');
  return cleaned.startsWith('+') ? cleaned : `+91${cleaned.slice(-10)}`;
}

// POST /api/auth/register
router.post('/auth/register', async (req, res) => {
  const { phone, password, name, email } = req.body;
  if (!phone || !password || !name) {
    return res.status(400).json({ error: 'Phone number, password, and name are required.' });
  }

  const cleanPhone = normalizePhone(phone);
  const cleanEmail = email ? String(email).trim().toLowerCase() : null;

  try {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: cleanPhone },
          ...(cleanEmail ? [{ email: cleanEmail }] : [])
        ]
      }
    });

    if (existing) {
      return res.status(409).json({ error: 'An account with this phone number or email already exists.' });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        phone: cleanPhone,
        email: cleanEmail,
        passwordHash,
        role: 'CANDIDATE',
        candidateProfile: {
          create: {
            name: String(name).trim(),
            profileCompleteness: 35,
          }
        }
      },
      include: {
        candidateProfile: true,
      }
    });

    const { token } = await createSession(user.id);

    // Audit event
    await prisma.auditEvent.create({
      data: {
        userId: user.id,
        action: 'REGISTER',
        actorRole: user.role,
        details: JSON.stringify({ phone: cleanPhone, name }),
      }
    }).catch(() => {});

    res.status(201).json({
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        role: user.role,
        profile: user.candidateProfile,
      },
      token,
    });
  } catch (err) {
    console.error('[auth/register] error:', err);
    res.status(500).json({ error: 'Failed to register account.' });
  }
});

// POST /api/auth/login
router.post('/auth/login', async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Phone/Email and password are required.' });
  }

  const cleanId = String(identifier).trim();
  const isEmail = cleanId.includes('@');
  const query = isEmail ? { email: cleanId.toLowerCase() } : { phone: normalizePhone(cleanId) };

  try {
    const user = await prisma.user.findFirst({
      where: query,
      include: { candidateProfile: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const { token } = await createSession(user.id);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    }).catch(() => {});

    await prisma.auditEvent.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        actorRole: user.role,
      }
    }).catch(() => {});

    res.json({
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        role: user.role,
        profile: user.candidateProfile,
      },
      token,
    });
  } catch (err) {
    console.error('[auth/login] error:', err);
    res.status(500).json({ error: 'Authentication failed.' });
  }
});

// GET /api/auth/me
router.get('/auth/me', requireAuth, async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      phone: req.user.phone,
      email: req.user.email,
      role: req.user.role,
      profile: req.user.candidateProfile,
    }
  });
});

// POST /api/auth/logout
router.post('/auth/logout', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (token) {
    await revokeSession(token);
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

// POST /api/auth/logout-all
router.post('/auth/logout-all', requireAuth, async (req, res) => {
  await revokeAllUserSessions(req.user.id);
  res.json({ success: true, message: 'Revoked all active sessions.' });
});

// ZERO-COST DEV OTP HANDLERS (Simulated & Local console output only)
router.post('/auth/request-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number is required.' });

  const cleanPhone = normalizePhone(phone);
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

  // Hash OTP before persistence
  const crypto = await import('crypto');
  const hashedOtp = crypto.default.createHash('sha256').update(code).digest('hex');

  await prisma.otpVerification.create({
    data: {
      phoneNumber: cleanPhone,
      hashedOtp,
      expiresAt,
    }
  });

  // ZERO-COST REQUIREMENT: Output OTP locally in terminal, NEVER call paid SMS
  console.log(`[ZERO-COST OTP] Verification code for ${cleanPhone}: ${code} (Valid for 10m)`);

  res.json({
    success: true,
    message: 'OTP generated (local development mode). Check backend terminal.',
    devCode: process.env.NODE_ENV !== 'production' ? code : undefined,
  });
});

export default router;
