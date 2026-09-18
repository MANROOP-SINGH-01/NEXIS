import { test, expect } from '@playwright/test';

test.describe('GAP CLOSURE REALITY TESTS', () => {
  test.setTimeout(120000); // Allow up to 2 minutes for local LLM routing to complete
  
  // Test user credentials
  const email = `test_audit_${Date.now()}@example.com`;
  const phone = `${Math.floor(1000000000 + Math.random() * 9000000000)}`;
  const password = 'password123';
  let token = '';

  test.beforeAll(async ({ request }) => {
    // Register a test user
    const res = await request.post('/api/auth/register', {
      data: { email, phone, password, name: 'Audit User', role: 'TRAINEE' }
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    token = body.token;
  });

  test('Phase 2: Resume/ATS API Contract (FreeLLMAPI Success)', async ({ request }) => {
    // Verify API contract directly. FreeLLMAPI handles the request regardless of client key.
    const res = await request.post('/api/resume/tailor', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        resume: 'I am a developer.',
        jd: 'Need a senior dev.',
        keys: {
          gemini: 'ignored',
          sarvam: 'ignored'
        }
      },
      timeout: 60000
    });
    
    // Should succeed because FreeLLMAPI handles the key and routing server-side
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.strategist).toBeDefined();
    expect(body.structured).toBeDefined();
  });

  test('Phase 2: Interview API Contract (FreeLLMAPI Success)', async ({ request }) => {
    test.setTimeout(120000);
    const res = await request.post('/api/interview/generate', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        resume: 'I am a developer.',
        jd: 'Need a senior dev.',
        key: 'ignored'
      },
      timeout: 60000
    });
    
    // Should succeed via FreeLLMAPI
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBeGreaterThan(0);
  });

  test('Phase 4: Adzuna E2E UI Workflow', async ({ page }) => {
    // Login via localStorage
    await page.goto('/');
    await page.evaluate(({ token, user }) => {
      localStorage.setItem('nexis-auth', JSON.stringify({
        state: { token, user },
        version: 0
      }));
    }, { token, user: { id: 'test_id', email, role: 'TRAINEE' } });
    
    // Reload to apply token
    await page.goto('/');
    
    // Wait for the app to load
    await expect(page.getByText('Job Matches', { exact: true }).first()).toBeVisible({ timeout: 10000 });

    // Navigate to Jobs
    await page.getByText('Job Matches', { exact: true }).first().click();
    
    // Check if real Adzuna jobs load. 
    await expect(page.locator('h2').first()).toBeVisible({ timeout: 15000 });
    
    const jobText = await page.locator('h2').first().textContent();
    expect(jobText).not.toContain('Mock Job');
    expect(jobText).not.toContain('Fake Company');
  });

});
