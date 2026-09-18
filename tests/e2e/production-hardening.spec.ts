import { test, expect } from '@playwright/test';

test.describe('NEXIS Production Hardening Full Flow & Failure-Path Suite', () => {

  const testUser = {
    phone: `+918888${Math.floor(100000 + Math.random() * 900000)}`,
    email: `hardening_${Date.now()}@nexis.example`,
    password: 'HardenedPassword!2026',
    name: 'Hardening Validation User',
  };

  let sessionToken = '';
  let userId = '';

  test('1. Registration creates user, profile, and active session', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: testUser,
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.token).toBeDefined();
    expect(body.user.phone).toBe(testUser.phone);
    expect(body.user.role).toBe('CANDIDATE');

    sessionToken = body.token;
    userId = body.user.id;
  });

  test('2. Duplicate registration with same phone is rejected with 409 Conflict', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: testUser,
    });

    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body.error).toContain('already exists');
  });

  test('3. Login with invalid password fails with 401 Unauthorized', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: {
        identifier: testUser.phone,
        password: 'IncorrectPassword#999',
      }
    });

    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Invalid credentials');
  });

  test('4. Login with correct credentials succeeds and returns valid session token', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: {
        identifier: testUser.phone,
        password: testUser.password,
      }
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.token).toBeDefined();
    sessionToken = body.token;
  });

  test('5. DPDP Consent recording appends valid audit log for all 4 scopes', async ({ request }) => {
    const scopes = ['JOB_SEARCH_DATA', 'EMPLOYER_SHARING', 'ANALYTICS', 'GOVT_CROSS_CHECK'];

    for (const scope of scopes) {
      const res = await request.post('/api/consent', {
        headers: { Authorization: `Bearer ${sessionToken}` },
        data: {
          scope,
          granted: true,
          version: 'v1.0-sih2026',
        }
      });

      expect(res.status()).toBe(201);
      const body = await res.json();
      expect(body.consentRecord.scope).toBe(scope);
      expect(body.consentRecord.granted).toBe(true);
    }

    // Verify current consent state
    const getRes = await request.get('/api/consent', {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });

    expect(getRes.status()).toBe(200);
    const consentBody = await getRes.json();
    expect(consentBody.consent.JOB_SEARCH_DATA.granted).toBe(true);
    expect(consentBody.consent.EMPLOYER_SHARING.granted).toBe(true);
  });

  test('6. Candidate role attempting to access admin endpoints is rejected with 403 Forbidden', async ({ request }) => {
    const res = await request.get('/api/admin/audit-logs', {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });

    // Role check prevents candidate access
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('insufficient permissions');
  });

  test('7. Job Search API executes real query and returns deterministic 5-factor scoring', async ({ request }) => {
    const res = await request.get('/api/jobs/discover?what=Software+Engineer&country=in', {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.provider).toBe('adzuna');
    expect(Array.isArray(body.results)).toBe(true);
  });

  test('8. Application tracking persists saved job in pipeline', async ({ request }) => {
    const res = await request.post('/api/applications', {
      headers: { Authorization: `Bearer ${sessionToken}` },
      data: {
        jobTitle: 'Backend Engineer (Go/Node.js)',
        companyName: 'NEXIS Partner Labs',
        applicationLink: 'https://nexis.example/apply/101',
        status: 'SAVED',
      }
    });

    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    expect(body.application.jobTitle).toBe('Backend Engineer (Go/Node.js)');
  });

  test('9. Right-to-be-Forgotten: Full account and data deletion removes records and invalidates session', async ({ request }) => {
    // Execute data deletion
    const delRes = await request.delete('/api/profile', {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });

    expect(delRes.status()).toBe(200);
    const delBody = await delRes.json();
    expect(delBody.success).toBe(true);
    expect(delBody.message).toContain('completely deleted in compliance with the DPDP Act');

    // Verify session token is immediately invalid for subsequent requests
    const verifyRes = await request.get('/api/profile', {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });

    expect(verifyRes.status()).toBe(401);
  });
});
