import { chromium } from 'playwright';
import path from 'path';

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  const artifactDir = 'C:\\Users\\SINGH\\.gemini\\antigravity-ide\\brain\\b1ca5199-9941-42cf-b945-307e906b88f3';

  // Set fake local auth token so authenticated routes render cleanly
  await page.addInitScript(() => {
    localStorage.setItem('auth_token', 'demo_token_priya');
    localStorage.setItem('user', JSON.stringify({
      id: 'usr_demo_priya',
      phone: '+919876543210',
      email: 'priya.sharma@example.com',
      role: 'CANDIDATE',
      profile: { id: 'prf_priya', name: 'Priya Sharma', profileCompleteness: 92 }
    }));
  });

  const routes = [
    { name: 'bauhaus_landing_page.png', path: '/' },
    { name: 'bauhaus_login_page.png', path: '/login' },
    { name: 'bauhaus_dashboard_office.png', path: '/dashboard' },
    { name: 'bauhaus_resume_cv_forge.png', path: '/resume' },
    { name: 'bauhaus_job_matches.png', path: '/jobs' },
    { name: 'bauhaus_skill_gaps.png', path: '/skills' },
    { name: 'bauhaus_recommended_programs.png', path: '/learning' },
    { name: 'bauhaus_interview_prep.png', path: '/interview' },
    { name: 'bauhaus_application_tracker.png', path: '/tracker' },
    { name: 'bauhaus_career_passport.png', path: '/passport' },
    { name: 'bauhaus_career_health.png', path: '/career-health' },
    { name: 'bauhaus_candidate_profile.png', path: '/profile' },
    { name: 'bauhaus_settings_page.png', path: '/settings' },
  ];

  for (const r of routes) {
    try {
      console.log(`Navigating to ${r.path}...`);
      await page.goto(`http://localhost:3000${r.path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      const targetPath = path.join(artifactDir, r.name);
      await page.screenshot({ path: targetPath, fullPage: false });
      console.log(`✓ Saved ${r.name}`);
    } catch (err) {
      console.error(`Failed to capture ${r.path}:`, err.message);
    }
  }

  await browser.close();
  console.log('Finished capturing Bauhaus screenshots!');
}

capture().catch(err => {
  console.error('Fatal capture error:', err);
  process.exit(1);
});
