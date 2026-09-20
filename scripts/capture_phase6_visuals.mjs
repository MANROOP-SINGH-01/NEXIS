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

  console.log('Navigating to dashboard...');
  await page.goto('http://localhost:3000/dashboard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // 1. Dashboard & Focus chips
  await page.screenshot({ path: path.join(artifactDir, 'phase6_dashboard_focus_chips.png'), fullPage: false });
  console.log('Captured phase6_dashboard_focus_chips.png');

  // 2. Open Nexus-Writer (Agent 4)
  const writerChip = page.locator('button[title*="Focus Nexus-Writer"]').first();
  await writerChip.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(artifactDir, 'phase6_agent_detail_drawer_writer.png'), fullPage: false });
  console.log('Captured phase6_agent_detail_drawer_writer.png');

  // 3. Switch to Consultation tab
  const consultTab = page.locator('aside[aria-label="Agent Details Drawer"] button:has-text("Consultation")').first();
  await consultTab.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(artifactDir, 'phase6_agent_consultation_dark.png'), fullPage: false });
  console.log('Captured phase6_agent_consultation_dark.png');

  // Close drawer
  const closeBtn = page.locator('button[aria-label="Close Agent Details"]').first();
  await closeBtn.click();
  await page.waitForTimeout(500);

  // 4. Open TeamFlowModal
  const flowBtn = page.locator('button[title="Inspect Agent Mesh Flow"]').first();
  await flowBtn.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(artifactDir, 'phase6_team_flow_dark_modal.png'), fullPage: false });
  console.log('Captured phase6_team_flow_dark_modal.png');

  await browser.close();
  console.log('All visual captures completed successfully!');
}

capture().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
