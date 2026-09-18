import { test, expect } from '@playwright/test';
import { hashPassword, verifyPassword, hashSessionToken } from '../../server/services/authService.js';
import { requireRole } from '../../server/middleware/authMiddleware.js';

test.describe('Authentication & Cryptographic Security Unit Tests', () => {

  test('Password hashing produces unique salts and scrypt digests', async () => {
    const rawPass = 'SuperSecretPass#2026';
    const hash1 = await hashPassword(rawPass);
    const hash2 = await hashPassword(rawPass);

    // Hashes must be different because of random 16-byte salt
    expect(hash1).not.toEqual(hash2);
    expect(hash1).toContain(':');

    // Both must verify correctly against the original password
    expect(await verifyPassword(rawPass, hash1)).toBe(true);
    expect(await verifyPassword(rawPass, hash2)).toBe(true);

    // Incorrect password must fail
    expect(await verifyPassword('WrongPassword', hash1)).toBe(false);
  });

  test('Constant-time password verification handles corrupt or malformed hashes safely', async () => {
    expect(await verifyPassword('any', '')).toBe(false);
    expect(await verifyPassword('any', 'invalidformat')).toBe(false);
    expect(await verifyPassword('any', 'saltwithoutkey:')).toBe(false);
  });

  test('Session token hashing uses SHA-256 to prevent token leakage at rest', () => {
    const rawToken = '4f8a3c9b1d2e5f7a0b8c6d4e2f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7a';
    const hash1 = hashSessionToken(rawToken);
    const hash2 = hashSessionToken(rawToken);

    expect(hash1).toEqual(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex digest length
    expect(hash1).not.toEqual(rawToken);
  });

  test('Role authorization middleware enforces strict RBAC', () => {
    const middleware = requireRole('SUPER_ADMIN', 'REVIEWER');

    // Case 1: Unauthenticated request
    let statusSent = 0;
    let jsonSent: any = null;
    let nextCalled = false;

    const mockRes = {
      status: (code: number) => {
        statusSent = code;
        return { json: (data: any) => { jsonSent = data; } };
      }
    };

    middleware({ user: null } as any, mockRes as any, () => { nextCalled = true; });
    expect(statusSent).toBe(401);
    expect(nextCalled).toBe(false);

    // Case 2: Candidate user trying to access admin route
    statusSent = 0;
    nextCalled = false;
    middleware({ user: { role: 'CANDIDATE' } } as any, mockRes as any, () => { nextCalled = true; });
    expect(statusSent).toBe(403);
    expect(nextCalled).toBe(false);

    // Case 3: Authorized Reviewer user
    statusSent = 0;
    nextCalled = false;
    middleware({ user: { role: 'REVIEWER' } } as any, mockRes as any, () => { nextCalled = true; });
    expect(statusSent).toBe(0);
    expect(nextCalled).toBe(true);

    // Case 4: Super Admin override
    statusSent = 0;
    nextCalled = false;
    middleware({ user: { role: 'SUPER_ADMIN' } } as any, mockRes as any, () => { nextCalled = true; });
    expect(statusSent).toBe(0);
    expect(nextCalled).toBe(true);
  });
});
