import { chromium } from 'playwright';
import path from 'path';

async function captureOffice() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--enable-webgl',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--ignore-gpu-blocklist',
      '--enable-features=Vulkan,DefaultANGLEVulkan,WebGPU'
    ]
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR STACK:', err.stack || err.message));

  const artifactDir = 'C:\\Users\\SINGH\\.gemini\\antigravity-ide\\brain\\b1ca5199-9941-42cf-b945-307e906b88f3';

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

  console.log('Navigating to http://localhost:3000/dashboard...');
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
  
  // Wait for 3D simulation to settle and render frames
  await page.waitForTimeout(3500);

  const targetPath = path.join(artifactDir, 'bauhaus_3d_office_light.png');
  await page.screenshot({ path: targetPath, fullPage: false });
  console.log(`✓ Saved 3D Office Bauhaus Light screenshot to ${targetPath}`);

  // Also take a focused capture of just the 3D simulation canvas
  const canvasElement = page.locator('div[role="region"] canvas');
  if (await canvasElement.count() > 0) {
    const canvasPath = path.join(artifactDir, 'bauhaus_3d_canvas_only.png');
    await canvasElement.first().screenshot({ path: canvasPath });
    console.log(`✓ Saved 3D Canvas-only screenshot to ${canvasPath}`);
  }

  await browser.close();
  console.log('Done!');
}

captureOffice().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
