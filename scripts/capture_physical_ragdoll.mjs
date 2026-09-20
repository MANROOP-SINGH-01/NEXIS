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
  
  console.log('Waiting for 3D sceneManager to finish loading...');
  await page.waitForFunction(() => {
    return window.__sceneManager && window.__sceneManager.isLoaded;
  }, { timeout: 30000 }).catch(e => console.log('Wait for sceneManager timeout/error:', e.message));

  // Ensure 2D low-FPS fallback does not obscure the 3D canvas
  await page.evaluate(() => {
    if (window.useUiStore) window.useUiStore.getState().setLowFpsFallback(false);
    if (window.__sceneManager && window.__sceneManager.engine) {
      window.__sceneManager.engine.suppressLowFps(true);
    }
  });
  await page.waitForTimeout(1500);

  // 1. Capture base Bauhaus Office state with all agents seated
  await page.screenshot({ path: path.join(artifactDir, 'bauhaus_ragdoll_office_idle.png'), fullPage: false });
  console.log('Captured bauhaus_ragdoll_office_idle.png');

  // 2. Select Agent 02 (Vision) and inspect physical telemetry in dossier
  const agent2Btn = page.getByRole('button', { name: /VISION/i }).first();
  await agent2Btn.click();
  await page.waitForTimeout(1000);

  // Trigger a physical drag interaction via the live 3D interaction system
  await page.evaluate(() => {
    const sm = window.__sceneManager;
    if (sm) {
      const phys = sm.getPhysicsSystem();
      if (phys) {
        // Trigger grab on Agent 2 by handL
        const pointerNDC = { x: 0.1, y: 0.2 };
        const livePos = sm.controller?.getCPUPosition(2);
        phys.handlePointerDown(2, pointerNDC, livePos, -1, livePos, undefined, 'handL');
        sm.controller?.play(2, 'grabbed');
        if (window.useUiStore) {
          window.useUiStore.getState().setAgentStatus(2, 'dragged');
        }
      }
    }
  });
  await page.waitForTimeout(800);

  // 3. Capture active grab with physical telemetry displayed in Agent Dossier
  await page.screenshot({ path: path.join(artifactDir, 'bauhaus_physical_grab_active.png'), fullPage: false });
  console.log('Captured bauhaus_physical_grab_active.png');

  // 4. Update pointer position and simulate flinging into airborne free fall
  await page.evaluate(() => {
    const sm = window.__sceneManager;
    if (sm) {
      const phys = sm.getPhysicsSystem();
      if (phys) {
        // Move pointer laterally
        phys.handlePointerMove({ x: 0.25, y: 0.45 }, 0.033);
        // Release into airborne ballistic fall
        phys.handlePointerUp();
      }
    }
  });
  await page.waitForTimeout(300);

  // 5. Capture airborne ballistic state
  await page.screenshot({ path: path.join(artifactDir, 'bauhaus_physical_airborne_fall.png'), fullPage: false });
  console.log('Captured bauhaus_physical_airborne_fall.png');

  // 6. Wait for ground impact and recovery settling
  await page.waitForTimeout(2000);

  // 7. Capture recovered state as agent dusts off and begins pathing back to desk
  await page.screenshot({ path: path.join(artifactDir, 'bauhaus_physical_recovered_idle.png'), fullPage: false });
  console.log('Captured bauhaus_physical_recovered_idle.png');

  await browser.close();
  console.log('Finished capturing physical ragdoll interactions successfully.');
}

capture().catch(err => {
  console.error('Capture script failed:', err);
  process.exit(1);
});
