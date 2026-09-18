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
    // 2. Set the authentication token in localStorage
    await page.goto('/');
    await page.evaluate(({ token, user }) => {
      localStorage.setItem('nexis-auth', JSON.stringify({
        state: { token, user },
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

    // 3. Reload to apply token and bypass onboarding/login
    await page.goto('/');


    // 4. Verify Sidebar is visible indicating successful login
    await expect(page.getByText('Skill Gaps', { exact: true }).first()).toBeVisible();

    // 5. Navigate to Skill Gaps
    await page.click('text=Skill Gaps');
    
    // We expect the UI to render the skill gaps view without crashing, proving database is alive.
    // If the database was not connected, the API would fail, and we'd see an error or empty state.
    await expect(page.locator('text=Verify / Add Skill')).toBeVisible({ timeout: 10000 });
  });
});
