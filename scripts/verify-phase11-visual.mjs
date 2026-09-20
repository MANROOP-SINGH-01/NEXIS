/**
 * FILE: scripts/verify-phase11-visual.mjs
 * PURPOSE: Automated headless browser visual capture for Phase 11 Provider & District Analytics.
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Launching headless browser to verify Phase 11 Analytics Dashboard UI...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // Pre-seed localStorage with authenticated admin session
  await context.addInitScript(() => {
    localStorage.setItem('nexis-auth', JSON.stringify({
      state: {
        token: 'nexis_demo_session_token',
        user: {
          id: 'usr_demo_candidate',
          phone: '+919876543210',
          email: 'manroop.singh@nexis.gov.in',
          role: 'ADMIN',
          profile: {
            id: 'prf_candidate',
            name: 'Manroop Singh',
            profileCompleteness: 94,
          },
        },
        hydrated: true,
      },
      version: 0,
    }));
  });

  const page = await context.newPage();
  page.on('console', (msg) => console.log(`[BROWSER ${msg.type()}]:`, msg.text()));
  page.on('pageerror', (err) => console.error('[PAGE ERROR]:', err.message, err.stack));

  try {
    console.log('Navigating to /dashboard...');
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Dismiss consent modal if displayed
    const consentBtn = page.locator('button:has-text("SAVE & CONTINUE"), button:has-text("Skip for now")').first();
    if (await consentBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Dismissing consent modal...');
      await consentBtn.click();
      await page.waitForTimeout(1000);
    }

    // Ensure Analytics Dashboard is open via Zustand store
    console.log('Opening Analytics Dashboard via Zustand state...');
    await page.evaluate(() => {
      window.useUiStore?.getState?.().setAnalyticsDashboardOpen(true);
    });
    await page.waitForTimeout(2000);

    // Switch to Districts & Migration tab using explicit ID
    console.log('Switching to Districts & Migration tab (#analytics-tab-districts)...');
    await page.click('#analytics-tab-districts');
    await page.waitForTimeout(1500);

    // Scroll Section 2B into view
    await page.evaluate(() => {
      const section2b = document.getElementById('phase11-section-2b');
      if (section2b) section2b.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'phase11_districts_intelligence.png' });
    console.log('Captured phase11_districts_intelligence.png');

    // Switch to Cohorts & Providers tab using explicit ID
    console.log('Switching to Cohorts & Providers tab (#analytics-tab-providers)...');
    await page.click('#analytics-tab-providers');
    await page.waitForTimeout(1500);

    // Scroll container so Section 4B is visible in viewport
    await page.evaluate(() => {
      const scrollable = document.getElementById('analytics-dashboard-scroll-container');
      if (scrollable) scrollable.scrollTop = 950;
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'phase11_providers_retention.png' });
    console.log('Captured phase11_providers_retention.png');

    console.log('Phase 11 visual verification completed successfully.');
  } catch (err) {
    console.error('Visual capture error:', err);
  } finally {
    await browser.close();
  }
}

main();
