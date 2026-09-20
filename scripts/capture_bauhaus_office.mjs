import { chromium } from 'playwright';
import path from 'path';

async function capture() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader']
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => {
    console.log('PAGE ERROR STACK:', err.stack || err.message);
  });

  const artifactDir = 'C:\\Users\\SINGH\\.gemini\\antigravity-ide\\brain\\b1ca5199-9941-42cf-b945-307e906b88f3';

  console.log('Navigating to http://localhost:3000/dashboard...');
  await page.goto('http://localhost:3000/dashboard');
  await page.waitForLoadState('networkidle');
  
  console.log('Waiting for 3D sceneManager to finish loading models & materials...');
  await page.waitForFunction(() => {
    return window.__sceneManager && window.__sceneManager.isLoaded;
  }, { timeout: 30000 }).catch(e => console.log('Wait for sceneManager timeout/error:', e.message));

  // Ensure 2D low-FPS fallback does not obscure the 3D canvas during headless screenshot capture
  await page.evaluate(() => {
    if (window.useUiStore) window.useUiStore.getState().setLowFpsFallback(false);
    if (window.__sceneManager && window.__sceneManager.engine) {
      window.__sceneManager.engine.suppressLowFps(true);
    }
  });
  await page.waitForTimeout(1500);

  // 1. Capture Bauhaus 3D Office Hero
  await page.screenshot({ path: path.join(artifactDir, 'bauhaus_3d_office_main.png'), fullPage: false });
  console.log('Captured bauhaus_3d_office_main.png');

  // 2. Select Agent 01 (Director) to show floating editorial card
  const agent1Btn = page.getByRole('button', { name: /DIRECTOR/i }).first();
  await agent1Btn.click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(artifactDir, 'bauhaus_agent_selected_floating_card.png'), fullPage: false });
  console.log('Captured bauhaus_agent_selected_floating_card.png');

  // 2b. Select Agent 02 (Vision - Glasses) to verify glasses alignment
  const agent2Btn = page.getByRole('button', { name: /VISION/i }).first();
  await agent2Btn.click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(artifactDir, 'bauhaus_agent_vision_glasses.png'), fullPage: false });
  console.log('Captured bauhaus_agent_vision_glasses.png');

  // 2c. Select Agent 06 (Mirror - Crown) to verify crown alignment
  const agent6Btn = page.getByRole('button', { name: /MIRROR/i }).first();
  await agent6Btn.click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(artifactDir, 'bauhaus_agent_mirror_crown.png'), fullPage: false });
  console.log('Captured bauhaus_agent_mirror_crown.png');

  // 3. Open Mission Drawer (MISSION // 01)
  const missionBtn = page.locator('button:has-text("MISSION // 01")').first();
  await missionBtn.click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(artifactDir, 'bauhaus_mission_drawer_open.png'), fullPage: false });
  console.log('Captured bauhaus_mission_drawer_open.png');

  // Close Mission Drawer
  const closeMissionBtn = page.locator('button:has-text("CLOSE")').first();
  await closeMissionBtn.click();
  await page.waitForTimeout(600);

  // 4. Open Telemetry Feed Drawer
  const feedBtn = page.locator('button:has-text("FEED")').first();
  await feedBtn.click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(artifactDir, 'bauhaus_telemetry_feed_drawer_open.png'), fullPage: false });
  console.log('Captured bauhaus_telemetry_feed_drawer_open.png');

  await browser.close();
  console.log('All Bauhaus captures completed successfully!');
}

capture().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
