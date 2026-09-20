/**
 * FILE: server/lib/resilienceStore.js
 * PURPOSE: In-memory fallback datastore for local resilience mode, offline operation,
 *          and isolated testing environments when remote Supabase PostgreSQL is unreachable.
 * FEATURES:
 *   - User indexing by ID, phone number (E.164 normalized), and email.
 *   - Secure session lifecycle (creation, validation, expiration, revocation).
 *   - DPDP Act Right-to-be-Forgotten: complete atomic purge of user, profile, sessions, and consent.
 *   - Granular DPDP Act 2023 8-purpose consent tracking with instantaneous revocation.
 *   - Longitudinal outcome events, employer records, and audit logs.
 */

import crypto from 'crypto';

class ResilienceStore {
  constructor() {
    this.users = new Map(); // userId -> User
    this.phoneIndex = new Map(); // normalizedPhone -> userId
    this.emailIndex = new Map(); // lowerEmail -> userId
    this.sessions = new Map(); // token -> Session
    this.consentRecords = new Map(); // traineeId -> Array<ConsentRecord> (legacy audit log)
    this.dpdpConsents = new Map(); // traineeId -> Map<purpose, DpdpConsent>
    this.auditEvents = []; // Array<AuditEvent>
    this.auditLogs = []; // Array<AuditLog>

    // Additive Phase 4+ Collections
    this.outcomeEvents = new Map(); // traineeId -> Array<OutcomeEvent>
    this.employers = new Map(); // employerId -> Employer
    this.employmentRecords = new Map(); // traineeId -> Array<EmploymentRecord>
    this.followUpAttempts = new Map(); // traineeId -> Array<FollowUpAttempt>
    this.interventions = new Map(); // traineeId -> Array<Intervention>
    this.agentFindings = []; // Array<AgentFinding>

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

    // Seed default DPDP consents for demo user
    const defaultPurposes = [
      'OUTCOME_TRACKING',
      'LONGITUDINAL_SURVEY',
      'EMPLOYER_VERIFICATION',
      'WAGE_ANALYSIS',
      'CAREER_RECOMMENDATIONS',
      'SMS_NOTIFICATIONS',
      'ANONYMIZED_RESEARCH',
    ];
    for (const purpose of defaultPurposes) {
      this.grantConsent('trainee_demo', purpose, 'v2.0', '127.0.0.1', 'NEXIS Seed Agent');
    }
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
      if (!this.dpdpConsents.has(user.trainee.id)) {
        this.dpdpConsents.set(user.trainee.id, new Map());
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
      this.dpdpConsents.delete(user.trainee.id);
      this.outcomeEvents.delete(user.trainee.id);
      this.employmentRecords.delete(user.trainee.id);
      this.followUpAttempts.delete(user.trainee.id);
      this.interventions.delete(user.trainee.id);
    }

    // Revoke and purge all sessions for this user immediately
    for (const [token, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        session.revokedAt = new Date();
        this.sessions.delete(token);
      }
    }

    this.users.delete(userId);
    return true;
  }

  // ── Granular DPDP Act 2023 Consent Implementation ───────────────────────

  grantConsent(traineeId, purpose, version = 'v2.0', ipAddress = null, userAgent = null) {
    if (!traineeId || !purpose) return null;
    if (!this.dpdpConsents.has(traineeId)) {
      this.dpdpConsents.set(traineeId, new Map());
    }

    const consentObj = {
      id: `dpdp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      traineeId,
      purpose: String(purpose).trim(),
      granted: true,
      grantedAt: new Date(),
      revokedAt: null,
      noticeVersion: String(version || 'v2.0'),
      ipAddress: ipAddress || '127.0.0.1',
      userAgent: userAgent || 'NEXIS Client',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.dpdpConsents.get(traineeId).set(purpose, consentObj);

    // Also update legacy append-only log for backward compatibility
    this.recordConsent(traineeId, purpose, true, version);

    // Record formal AuditLog
    this.recordAuditLog({
      action: 'CONSENT_GRANTED',
      actorRole: 'TRAINEE',
      targetEntity: 'Consent',
      targetId: consentObj.id,
      ipAddress,
      userAgent,
      payload: { traineeId, purpose, version },
    });

    return consentObj;
  }

  withdrawConsent(traineeId, purpose, ipAddress = null, userAgent = null) {
    if (!traineeId || !purpose) return null;
    if (!this.dpdpConsents.has(traineeId)) {
      this.dpdpConsents.set(traineeId, new Map());
    }

    const purposeKey = String(purpose).trim();
    let existing = this.dpdpConsents.get(traineeId).get(purposeKey);

    const updated = {
      id: existing?.id || `dpdp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      traineeId,
      purpose: purposeKey,
      granted: false,
      grantedAt: existing?.grantedAt || null,
      revokedAt: new Date(),
      noticeVersion: existing?.noticeVersion || 'v2.0',
      ipAddress: ipAddress || '127.0.0.1',
      userAgent: userAgent || 'NEXIS Client',
      updatedAt: new Date(),
    };

    this.dpdpConsents.get(traineeId).set(purposeKey, updated);

    // Also update legacy append-only log
    this.recordConsent(traineeId, purposeKey, false, updated.noticeVersion);

    // Immediately log audit event
    this.recordAuditLog({
      action: 'CONSENT_REVOKED',
      actorRole: 'TRAINEE',
      targetEntity: 'Consent',
      targetId: updated.id,
      ipAddress,
      userAgent,
      payload: { traineeId, purpose: purposeKey, revokedAt: updated.revokedAt },
    });

    return updated;
  }

  hasConsent(traineeId, purpose) {
    if (!traineeId || !purpose) return false;
    const traineeMap = this.dpdpConsents.get(traineeId);
    if (traineeMap && traineeMap.has(purpose)) {
      const c = traineeMap.get(purpose);
      return Boolean(c.granted && !c.revokedAt);
    }

    // Fall back to legacy check
    const current = this.getCurrentConsent(traineeId);
    return Boolean(current[purpose]?.granted && !current[purpose]?.revokedAt);
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
    const consentMap = {};

    // 1. Gather from legacy records
    const records = this.consentRecords.get(traineeId) || [];
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

    // 2. Overlay granular DPDP consents (higher precedence)
    const dpdpMap = this.dpdpConsents.get(traineeId);
    if (dpdpMap) {
      for (const [purpose, item] of dpdpMap.entries()) {
        consentMap[purpose] = {
          granted: item.granted,
          grantedAt: item.grantedAt,
          revokedAt: item.revokedAt,
          version: item.noticeVersion,
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

  recordAuditLog(entry) {
    const log = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      action: entry.action || 'MUTATION',
      actorRole: entry.actorRole || 'SYSTEM',
      targetEntity: entry.targetEntity || 'UNKNOWN',
      targetId: entry.targetId || null,
      ipAddress: entry.ipAddress || null,
      userAgent: entry.userAgent || null,
      payload: entry.payload || null,
      timestamp: new Date(),
    };
    this.auditLogs.unshift(log);
    return log;
  }

  getAuditLogs(limit = 100) {
    return this.auditLogs.slice(0, limit);
  }

  // ── Additive Phase 4+ Methods: Outcomes & Evidence ───────────────────────

  addOutcomeEvent(traineeId, event) {
    if (!traineeId) return null;
    if (!this.outcomeEvents.has(traineeId)) {
      this.outcomeEvents.set(traineeId, []);
    }
    const fullEvent = {
      id: event.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      traineeId,
      eventType: event.eventType,
      milestone: event.milestone || null,
      effectiveDate: event.effectiveDate ? new Date(event.effectiveDate) : new Date(),
      metadata: event.metadata || {},
      verificationStatus: event.verificationStatus || 'PENDING',
      verificationSource: event.verificationSource || 'TRAINEE_SELF_REPORT',
      confidenceScore: event.confidenceScore ?? 0.85,
      createdAt: new Date(),
    };
    this.outcomeEvents.get(traineeId).unshift(fullEvent);
    return fullEvent;
  }

  getOutcomeTimeline(traineeId) {
    return this.outcomeEvents.get(traineeId) || [];
  }
}

// Export singleton instance
const resilienceStore = new ResilienceStore();
export default resilienceStore;
