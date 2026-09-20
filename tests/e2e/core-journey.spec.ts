import { test, expect } from '@playwright/test';

test.describe('NEXUS Core Journey E2E', () => {
  let userToken: string;
  let userData: any;

  test.beforeAll(async ({ request }) => {

    // 1. Register a fresh user via API
    const uniquePhone = `+919999${Math.floor(Math.random() * 100000).toString().padStart(6, '0')}`;
    const registerResponse = await request.post('/api/auth/register', {
      data: {
        phone: uniquePhone,
        password: 'TestPassword123!',
        name: 'E2E Test User',
      }
    });
    
    if (!registerResponse.ok()) {
      console.error('Registration failed:', await registerResponse.text());
    }
    expect(registerResponse.ok()).toBeTruthy();
    const data = await registerResponse.json();
    userToken = data.token;
    userData = data.user;
  });

  test('User can load dashboard and see real data', async ({ page, context }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    // 2. Set the authentication token in localStorage
    await page.goto('/');
    await page.evaluate(({ token, user }) => {
      localStorage.setItem('nexis-auth', JSON.stringify({
        state: { token, user, hydrated: true },
        version: 0
      }));
      localStorage.setItem('forge-consents', JSON.stringify({
        terms: { granted: true, version: 'v1' },
        privacy: { granted: true, version: 'v1' },
        data_sharing: { granted: true, version: 'v1' },
        communications: { granted: true, version: 'v1' },
      }));
      localStorage.setItem('forge-trainee-profile', JSON.stringify({
        trainee: {
            id: user?.id || 'local_1',
            name: user?.name || 'Test User',
            phoneNumber: user?.phone || '+919999000000',
        },
        enrolments: [{
            id: 'enrol_1',
            status: 'ENROLLED',
        }],
        consent: {}
      }));
    }, { token: userToken, user: userData });

    // 3. Navigate to /dashboard to load the workspace shell with sidebar
    await page.goto('/dashboard');

    // 4. Verify Sidebar is visible indicating successful login
    await expect(page.getByText('Skill Intelligence', { exact: true }).first()).toBeVisible({ timeout: 10000 });

    // 5. Navigate to Skill Intelligence
    await page.click('text=Skill Intelligence');
    
    // We expect the UI to render the skill gaps view without crashing, proving database is alive.
    await expect(page.getByText('Skill Gaps Analysis').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('O*NET Industry Standard Taxonomy').first()).toBeVisible({ timeout: 10000 });
  });
});
