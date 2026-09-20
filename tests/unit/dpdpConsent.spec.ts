import { test, expect } from '@playwright/test';
import {
  ALLOWED_SCOPES,
  DPDP_PURPOSES,
  DPDP_PURPOSE_DEFINITIONS,
  isValidConsentIdentifier,
  resolveCurrentConsent,
} from '../../server/utils/consent.js';
import resilienceStore from '../../server/lib/resilienceStore.js';
import { requireConsent } from '../../server/middleware/consentMiddleware.js';

test.describe('DPDP Consent Architecture Unit Tests', () => {

  test('All 4 legally required legacy DPDP scopes are defined and immutable', () => {
    const requiredScopes = [
      'JOB_SEARCH_DATA',
      'EMPLOYER_SHARING',
      'ANALYTICS',
      'GOVT_CROSS_CHECK',
    ];

    expect(ALLOWED_SCOPES).toHaveLength(4);
    for (const scope of requiredScopes) {
      expect(ALLOWED_SCOPES).toContain(scope);
    }
  });

  test('All 9 canonical DPDP Act 2023 purposes are defined and validated', () => {
    const expectedPurposes = [
      'OUTCOME_TRACKING',
      'LONGITUDINAL_SURVEY',
      'EMPLOYER_VERIFICATION',
      'WAGE_ANALYSIS',
      'CAREER_RECOMMENDATIONS',
      'SMS_NOTIFICATIONS',
      'WHATSAPP_NOTIFICATIONS',
      'ANONYMIZED_RESEARCH',
      'THIRD_PARTY_SHARING',
    ];

    expect(DPDP_PURPOSES).toHaveLength(9);
    for (const purpose of expectedPurposes) {
      expect(DPDP_PURPOSES).toContain(purpose);
      expect(isValidConsentIdentifier(purpose)).toBe(true);
    }

    expect(isValidConsentIdentifier('INVALID_PURPOSE_XYZ')).toBe(false);
  });

  test('Multilingual DPDP purpose definitions cover EN, MR (Marathi), and HI (Hindi)', () => {
    for (const purpose of DPDP_PURPOSES) {
      const def = (DPDP_PURPOSE_DEFINITIONS as any)[purpose];
      expect(def, `Missing definition for purpose: ${purpose}`).toBeDefined();
      expect(def.title.en).toBeTruthy();
      expect(def.title.mr).toBeTruthy();
      expect(def.title.hi).toBeTruthy();
      expect(def.description.en).toBeTruthy();
      expect(def.description.mr).toBeTruthy();
      expect(def.description.hi).toBeTruthy();
      expect(def.legalBasis).toBeTruthy();
      expect(def.dataAccess).toBeTruthy();
    }
  });

  test('resolveCurrentConsent computes latest grant/revoke state deterministically', async () => {
    const mockTraineeId = 'trainee_test_123';

    // Mock Prisma client with simulated audit trail records
    const mockRecords = [
      // Scope 1: Granted then Revoked (Revoked wins because createdAt is newer)
      {
        id: 'c1',
        traineeId: mockTraineeId,
        scope: 'JOB_SEARCH_DATA',
        granted: true,
        createdAt: new Date('2026-01-01T10:00:00Z'),
      },
      {
        id: 'c2',
        traineeId: mockTraineeId,
        scope: 'JOB_SEARCH_DATA',
        granted: false,
        createdAt: new Date('2026-01-02T10:00:00Z'), // newer
      },
      // Scope 2: Granted
      {
        id: 'c3',
        traineeId: mockTraineeId,
        scope: 'EMPLOYER_SHARING',
        granted: true,
        createdAt: new Date('2026-01-01T10:00:00Z'),
      },
    ];

    const mockPrisma = {
      consentRecord: {
        findMany: async ({ where, orderBy }: any) => {
          const list = mockRecords.filter(r => r.traineeId === where.traineeId);
          if (orderBy?.createdAt === 'desc') {
            list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          }
          return list;
        }
      }
    };

    const consent = await resolveCurrentConsent(mockTraineeId, mockPrisma as any);

    // JOB_SEARCH_DATA was revoked in the newer record -> granted must be false
    expect(consent.JOB_SEARCH_DATA?.granted).toBe(false);
    // EMPLOYER_SHARING was granted -> granted must be true
    expect(consent.EMPLOYER_SHARING?.granted).toBe(true);
    // Scope without record is undefined in the map
    expect(consent.ANALYTICS).toBeUndefined();
    expect(consent.GOVT_CROSS_CHECK).toBeUndefined();
  });

  test('Defect #1 Fix Verification: Immediate revocation in resilienceStore and session invalidation', async () => {
    const testTraineeId = 'trainee_defect1_verification';
    const testUserId = 'usr_defect1_verification';

    resilienceStore.addUser({
      id: testUserId,
      phone: '+919988776655',
      email: 'defect1@nexis.gov.in',
      role: 'CANDIDATE',
      trainee: {
        id: testTraineeId,
        userId: testUserId,
        name: 'Defect 1 Tester',
        phoneNumber: '+919988776655',
      },
    });

    // 1. Grant consent for EMPLOYER_VERIFICATION
    resilienceStore.grantConsent(testTraineeId, 'EMPLOYER_VERIFICATION', 'v2.0');
    expect(resilienceStore.hasConsent(testTraineeId, 'EMPLOYER_VERIFICATION')).toBe(true);

    // 2. Middleware allows execution when granted
    const middleware = requireConsent('EMPLOYER_VERIFICATION');
    let nextCalled = false;
    let statusSent = 0;
    let jsonPayload: any = null;

    const mockReqGranted = {
      user: { id: testUserId, traineeId: testTraineeId, role: 'CANDIDATE' },
    };
    const mockRes = {
      status: (code: number) => {
        statusSent = code;
        return {
          json: (data: any) => { jsonPayload = data; },
        };
      },
    };

    await middleware(mockReqGranted as any, mockRes as any, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(statusSent).toBe(0);

    // 3. DEFECT #1 REMEDIATION: User withdraws consent
    resilienceStore.withdrawConsent(testTraineeId, 'EMPLOYER_VERIFICATION');
    expect(resilienceStore.hasConsent(testTraineeId, 'EMPLOYER_VERIFICATION')).toBe(false);

    // 4. Subsequent request must be immediately REJECTED with 403 Forbidden
    nextCalled = false;
    statusSent = 0;
    jsonPayload = null;

    await middleware(mockReqGranted as any, mockRes as any, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(statusSent).toBe(403);
    expect(jsonPayload?.code).toBe('DPDP_CONSENT_REQUIRED');
    expect(jsonPayload?.requiredPurpose).toBe('EMPLOYER_VERIFICATION');

    // 5. Re-granting consent immediately unblocks access
    resilienceStore.grantConsent(testTraineeId, 'EMPLOYER_VERIFICATION', 'v2.0');
    expect(resilienceStore.hasConsent(testTraineeId, 'EMPLOYER_VERIFICATION')).toBe(true);

    nextCalled = false;
    statusSent = 0;
    await middleware(mockReqGranted as any, mockRes as any, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
  });

  test('DPDP Section 12 Right-to-be-Forgotten purges trainee and all active sessions atomically', () => {
    const purgeUserId = 'usr_purge_test_999';
    const purgeTraineeId = 'trainee_purge_test_999';

    resilienceStore.addUser({
      id: purgeUserId,
      phone: '+919999000111',
      email: 'purge@nexis.gov.in',
      role: 'CANDIDATE',
      trainee: {
        id: purgeTraineeId,
        userId: purgeUserId,
        name: 'Purge Candidate',
        phoneNumber: '+919999000111',
      },
    });

    const { token } = resilienceStore.createSession(purgeUserId);
    expect(resilienceStore.validateSession(token)).not.toBeNull();

    resilienceStore.grantConsent(purgeTraineeId, 'OUTCOME_TRACKING', 'v2.0');
    expect(resilienceStore.hasConsent(purgeTraineeId, 'OUTCOME_TRACKING')).toBe(true);

    // Execute atomic delete / purge
    const deleted = resilienceStore.deleteUser(purgeUserId);
    expect(deleted).toBe(true);

    // Verify session revoked
    expect(resilienceStore.validateSession(token)).toBeNull();
    // Verify user removed
    expect(resilienceStore.findUserById(purgeUserId)).toBeNull();
    expect(resilienceStore.findUserByPhone('+919999000111')).toBeNull();
  });
});
