import { chromium } from 'playwright';
import path from 'path';

async function capture() {
  console.log('Launching browser for physical pickup & falling visual verification...');
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
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  const artifactDir = 'C:\\Users\\SINGH\\.gemini\\antigravity-ide\\brain\\b1ca5199-9941-42cf-b945-307e906b88f3';

  console.log('Navigating to http://localhost:3000/dashboard...');
  await page.goto('http://localhost:3000/dashboard');
  await page.waitForLoadState('networkidle');

  console.log('Waiting for 3D sceneManager to load...');
  await page.waitForFunction(() => {
    return window.__sceneManager && window.__sceneManager.isLoaded;
  }, { timeout: 35000 });

  await page.evaluate(() => {
    if (window.useUiStore) window.useUiStore.getState().setLowFpsFallback(false);
    if (window.__sceneManager && window.__sceneManager.engine) {
      window.__sceneManager.engine.suppressLowFps(true);
    }
  });
  await page.waitForTimeout(1500);

  // 1. Pick up Agent 1 (Director) by HEAD, lift high (Y=2.4m)
  console.log('1. Picking up Agent 1 by Head and lifting into air...');
  await page.evaluate(() => {
    const sm = window.__sceneManager;
    const phys = sm.characterManager.getPhysicsSystem();
    if (!phys) return;
    const ctrl = phys.getController(1);
    if (!ctrl) return;

    // Start grab on Head
    const currentPos = ctrl.physics.position.clone();
    currentPos.y = 2.4; // Lifted high in the air
    ctrl.resetTo(currentPos);
    const hitPoint = currentPos.clone();
    hitPoint.y = 2.8;
    ctrl.startGrab({ x: 0, y: 0.4 }, hitPoint, -1, 'head');
    sm.characterManager.setPhysicsMode(1, 3); // PHYSICAL
    sm.controller.play(1, 'grabbed_head');
  });

  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(artifactDir, 'pickup_head_hang.png'), fullPage: false });
  console.log('Captured pickup_head_hang.png');

  // 2. Pick up Agent 2 (Vision) by FOOT, inverting them high in the air (Y=2.5m)
  console.log('2. Picking up Agent 2 by Foot (inverted dangle)...');
  await page.evaluate(() => {
    const sm = window.__sceneManager;
    const phys = sm.characterManager.getPhysicsSystem();
    if (!phys) return;
    const ctrl = phys.getController(2);
    if (!ctrl) return;

    const currentPos = ctrl.physics.position.clone();
    currentPos.y = 2.5;
    ctrl.resetTo(currentPos);
    const hitPoint = currentPos.clone();
    hitPoint.y = 2.9;
    ctrl.startGrab({ x: 0.2, y: 0.5 }, hitPoint, -1, 'footL');
    sm.characterManager.setPhysicsMode(2, 3);
    sm.controller.play(2, 'grabbed_leg');
  });

  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(artifactDir, 'pickup_foot_inverted_hang.png'), fullPage: false });
  console.log('Captured pickup_foot_inverted_hang.png');

  // 3. Release Agent 1 from midair to capture the free-fall effect
  console.log('3. Releasing Agent 1 into free-fall from air...');
  await page.evaluate(() => {
    const sm = window.__sceneManager;
    const phys = sm.characterManager.getPhysicsSystem();
    const ctrl = phys.getController(1);
    if (ctrl) {
      ctrl.release();
    }
  });

  // Capture midway through the fall (after ~220ms, falling with floaty -12m/s^2 gravity)
  await page.waitForTimeout(220);
  const fallInfo = await page.evaluate(() => {
    const sm = window.__sceneManager;
    const phys = sm.characterManager.getPhysicsSystem();
    const ctrl = phys.getController(1);
    return {
      state: ctrl?.state,
      posY: ctrl?.physics.position.y,
      velY: ctrl?.physics.linearVelocity.y
    };
  });
  console.log('Mid-fall telemetry:', fallInfo);

  await page.screenshot({ path: path.join(artifactDir, 'falling_midair_flail.png'), fullPage: false });
  console.log('Captured falling_midair_flail.png');

  // 4. Capture Ground Impact & Squash
  console.log('4. Waiting for Ground Impact & Bounce...');
  await page.waitForTimeout(450);
  const impactInfo = await page.evaluate(() => {
    const sm = window.__sceneManager;
    const phys = sm.characterManager.getPhysicsSystem();
    const ctrl = phys.getController(1);
    return {
      state: ctrl?.state,
      posY: ctrl?.physics.position.y,
      squash: ctrl?.impact.getSquashScale()
    };
  });
  console.log('Landing telemetry:', impactInfo);

  await page.screenshot({ path: path.join(artifactDir, 'falling_ground_impact.png'), fullPage: false });
  console.log('Captured falling_ground_impact.png');

  // 5. Capture Recovery & Dust-Off
  console.log('5. Waiting for Dazed Recovery...');
  await page.waitForTimeout(600);
  const recoveryInfo = await page.evaluate(() => {
    const sm = window.__sceneManager;
    const phys = sm.characterManager.getPhysicsSystem();
    const ctrl = phys.getController(1);
    return {
      state: ctrl?.state,
      posY: ctrl?.physics.position.y,
      wobble: ctrl?.recovery.getRecoveryWobble()
    };
  });
  console.log('Recovery telemetry:', recoveryInfo);

  await page.screenshot({ path: path.join(artifactDir, 'falling_ground_recovery.png'), fullPage: false });
  console.log('Captured falling_ground_recovery.png');

  await browser.close();
  console.log('All visual captures completed successfully!');
}

capture().catch(err => {
  console.error('Capture script error:', err);
  process.exit(1);
});
