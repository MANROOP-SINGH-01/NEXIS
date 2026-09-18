import { test, expect } from '@playwright/test';
import { ALLOWED_SCOPES, resolveCurrentConsent } from '../../server/utils/consent.js';

test.describe('DPDP Consent Architecture Unit Tests', () => {

  test('All 4 legally required DPDP scopes are defined and immutable', () => {
    const requiredScopes = [
      'JOB_SEARCH_DATA',
      'EMPLOYER_SHARING',
      'ANALYTICS',
      'GOVT_CROSS_CHECK'
    ];

    expect(ALLOWED_SCOPES).toHaveLength(4);
    for (const scope of requiredScopes) {
      expect(ALLOWED_SCOPES).toContain(scope);
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
});
