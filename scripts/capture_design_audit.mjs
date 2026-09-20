import { chromium } from 'playwright';
import path from 'path';

async function runVisualAudit() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  });

  const page = await context.newPage();
  const artifactDir = 'C:\\Users\\SINGH\\.gemini\\antigravity-ide\\brain\\b1ca5199-9941-42cf-b945-307e906b88f3';

  console.log('Navigating to http://localhost:3000/dashboard...');
  await page.goto('http://localhost:3000/dashboard');
  await page.waitForLoadState('networkidle');

  await page.waitForFunction(() => {
    return window.__sceneManager && window.__sceneManager.isLoaded;
  }, { timeout: 30000 }).catch(e => console.log('Wait for sceneManager:', e.message));

  await page.evaluate(() => {
    if (window.useUiStore) window.useUiStore.getState().setLowFpsFallback(false);
    if (window.__sceneManager && window.__sceneManager.engine) {
      window.__sceneManager.engine.suppressLowFps(true);
    }
  });
  await page.waitForTimeout(1000);

  // 1. Capture Main Studio View with bottom bar & button-in-button RUN AGENT MESH
  await page.screenshot({ path: path.join(artifactDir, 'audit_studio_main.png') });
  console.log('Captured audit_studio_main.png');

  // 2. Select Agent 01 (Director) to verify Double-Bezel Floating Dossier & Button-in-Button CTA
  const directorBtn = page.getByRole('button', { name: /DIRECTOR/i }).first();
  await directorBtn.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(artifactDir, 'audit_agent_dossier_double_bezel.png') });
  console.log('Captured audit_agent_dossier_double_bezel.png');

  // 3. Click "OPEN AGENT DOSSIER" to open Agent Detail Drawer
  const openDossierBtn = page.getByRole('button', { name: /OPEN AGENT DOSSIER/i });
  await openDossierBtn.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(artifactDir, 'audit_agent_drawer_sheet.png') });
  console.log('Captured audit_agent_drawer_sheet.png');

  // 4. Close drawer and open Mesh Flow Modal to verify Modal double-bezel & entrance animation
  const closeDrawerBtn = page.getByRole('button', { name: /Close Agent Details/i });
  await closeDrawerBtn.click();
  await page.waitForTimeout(500);

  const meshFlowBtn = page.getByRole('button', { name: /MESH FLOW/i });
  await meshFlowBtn.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(artifactDir, 'audit_modal_double_bezel.png') });
  console.log('Captured audit_modal_double_bezel.png');

  await browser.close();
  console.log('Visual audit captures completed successfully!');
}

runVisualAudit().catch(err => {
  console.error('Audit script failed:', err);
  process.exit(1);
});
