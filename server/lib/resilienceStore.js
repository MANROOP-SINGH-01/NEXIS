/**
 * FILE: server/lib/resilienceStore.js
 * PURPOSE: In-memory fallback datastore for local resilience mode, offline operation,
 *          and isolated testing environments when remote Supabase PostgreSQL is unreachable.
 * FEATURES:
 *   - User indexing by ID, phone number (E.164 normalized), and email.
 *   - Secure session lifecycle (creation, validation, expiration, revocation).
 *   - DPDP Act Right-to-be-Forgotten: complete atomic purge of user, profile, sessions, and consent.
 *   - Consent audit trail and current-state aggregation per scope.
 */

import crypto from 'crypto';

class ResilienceStore {
  constructor() {
    this.users = new Map(); // userId -> User
    this.phoneIndex = new Map(); // normalizedPhone -> userId
    this.emailIndex = new Map(); // lowerEmail -> userId
    this.sessions = new Map(); // token -> Session
    this.consentRecords = new Map(); // traineeId -> Array<ConsentRecord>
    this.auditEvents = []; // Array<AuditEvent>

    this.initDefaultSeed();
  }

  initDefaultSeed() {
    // Demo candidate Priya Sharma
    const demoUser = {
      id: 'usr_demo_resilience',
      phone: '+919876543210',
      email: 'candidate@nexis.gov.in',
      role: 'CANDIDATE',
      passwordHash: null, // demo login bypassable with standard demo flow
      candidateProfile: {
        id: 'prf_demo',
        userId: 'usr_demo_resilience',
        name: 'Priya Sharma',
        headline: 'Full Stack Engineer & AI Orchestrator',
        location: 'Bengaluru, India',
        education: 'B.Tech in Computer Science',
        experienceSummary: '3+ years developing scalable web services and cloud pipelines.',
        profileCompleteness: 92,
        githubUrl: 'https://github.com/prkhrexists',
        targetRoles: 'Senior Full Stack Engineer, AI Engineer',
      },
      trainee: {
        id: 'trainee_demo',
        userId: 'usr_demo_resilience',
        name: 'Priya Sharma',
        phoneNumber: '+919876543210',
        preferredLanguage: 'en',
      },
    };

    this.addUser(demoUser);
  }

  addUser(user) {
    if (!user || !user.id) return;
    this.users.set(user.id, user);

    if (user.phone) {
      this.phoneIndex.set(user.phone, user.id);
    }
    if (user.email) {
      this.emailIndex.set(user.email.toLowerCase(), user.id);
    }
    if (user.trainee && user.trainee.id) {
      // Ensure trainee mapping
      if (!this.consentRecords.has(user.trainee.id)) {
        this.consentRecords.set(user.trainee.id, []);
      }
    }
  }

  findUserById(id) {
    return this.users.get(id) || null;
  }

  findUserByPhone(phone) {
    const id = this.phoneIndex.get(phone);
    return id ? this.users.get(id) || null : null;
  }

  findUserByEmail(email) {
    if (!email) return null;
    const id = this.emailIndex.get(email.toLowerCase());
    return id ? this.users.get(id) || null : null;
  }

  findUserByIdentifier(identifier) {
    if (!identifier) return null;
    const clean = String(identifier).trim();
    if (clean.includes('@')) {
      return this.findUserByEmail(clean);
    }
    return this.findUserByPhone(clean);
  }

  hasUser(phone, email) {
    if (phone && this.phoneIndex.has(phone)) return true;
    if (email && this.emailIndex.has(email.toLowerCase())) return true;
    return false;
  }

  createSession(userId, durationHours = 24 * 7) {
    const token = 'nexis_resilience_session_' + crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + durationHours * 3600 * 1000);
    const session = {
      token,
      userId,
      expiresAt,
      revokedAt: null,
      createdAt: new Date(),
      lastUsedAt: new Date(),
    };
    this.sessions.set(token, session);
    return { token, session };
  }

  validateSession(token) {
    if (!token) return null;
    const session = this.sessions.get(token);
    if (!session) return null;
    if (session.revokedAt) return null;
    if (session.expiresAt && session.expiresAt < new Date()) return null;

    const user = this.users.get(session.userId);
    if (!user) {
      // User was deleted under DPDP Right-to-be-Forgotten
      session.revokedAt = new Date();
      return null;
    }

    session.lastUsedAt = new Date();
    return user;
  }

  revokeSession(token) {
    if (!token) return;
    const session = this.sessions.get(token);
    if (session) {
      session.revokedAt = new Date();
    }
  }

  revokeAllUserSessions(userId) {
    if (!userId) return;
    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        session.revokedAt = new Date();
      }
    }
  }

  deleteUser(userId) {
    const user = this.users.get(userId);
    if (!user) return false;

    if (user.phone) this.phoneIndex.delete(user.phone);
    if (user.email) this.emailIndex.delete(user.email.toLowerCase());
    if (user.trainee?.id) {
      this.consentRecords.delete(user.trainee.id);
    }

    // Revoke all sessions for this user immediately
    for (const [token, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        session.revokedAt = new Date();
        this.sessions.delete(token); // completely purge session
      }
    }

    this.users.delete(userId);
    return true;
  }

  recordConsent(traineeId, scope, granted, version = 'v1.0') {
    if (!traineeId) return null;
    if (!this.consentRecords.has(traineeId)) {
      this.consentRecords.set(traineeId, []);
    }

    const record = {
      id: `cnst_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      traineeId,
      scope: String(scope).trim(),
      granted: Boolean(granted),
      grantedAt: granted ? new Date() : null,
      revokedAt: granted ? null : new Date(),
      version: String(version || 'v1.0'),
      createdAt: new Date(),
    };

    this.consentRecords.get(traineeId).unshift(record);

    this.auditEvents.unshift({
      id: `adt_${Date.now()}`,
      action: granted ? 'CONSENT_GRANTED' : 'CONSENT_REVOKED',
      actorRole: 'TRAINEE',
      targetType: 'CONSENT_SCOPE',
      targetId: scope,
      details: JSON.stringify({ traineeId, scope, granted, version }),
      timestamp: new Date(),
    });

    return record;
  }

  getCurrentConsent(traineeId) {
    const records = this.consentRecords.get(traineeId) || [];
    const consentMap = {};
    for (const r of records) {
      if (!consentMap[r.scope]) {
        consentMap[r.scope] = {
          granted: r.granted,
          grantedAt: r.grantedAt,
          revokedAt: r.revokedAt,
          version: r.version,
        };
      }
    }
    return consentMap;
  }

  getConsentRecords(traineeId) {
    return this.consentRecords.get(traineeId) || [];
  }

  getAuditEvents(traineeId) {
    return this.auditEvents.filter((e) => {
      try {
        const d = JSON.parse(e.details);
        return d.traineeId === traineeId;
      } catch {
        return false;
      }
    });
  }
}

// Export singleton instance
const resilienceStore = new ResilienceStore();
export default resilienceStore;
