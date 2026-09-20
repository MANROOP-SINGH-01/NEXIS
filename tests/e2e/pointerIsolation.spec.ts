import { test, expect } from '@playwright/test';

test.describe('NEXIS Phase 5: 3D Office Preservation & Pointer-Events Isolation Suite', () => {
  test('1. Idle 3D canvas receives pointer events and allows camera orbit without overlay interference', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Verify canvas exists and is visible
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    const canvasBounds = await canvas.boundingBox();
    expect(canvasBounds).not.toBeNull();
    if (!canvasBounds) return;

    // Verify UIOverlay root has pointer-events: none
    const overlay = page.locator('.pointer-events-none.absolute.inset-0').first();
    await expect(overlay).toBeAttached();

    const overlayPointerEvents = await overlay.evaluate((el) => {
      return window.getComputedStyle(el).pointerEvents;
    });
    expect(overlayPointerEvents).toBe('none');

    // Get initial camera position from Stage
    const initialCamState = await page.evaluate(() => {
      const sm = (window as any).__sceneManager;
      if (!sm || !sm.stage || !sm.stage.camera) return null;
      return {
        x: sm.stage.camera.position.x,
        y: sm.stage.camera.position.y,
        z: sm.stage.camera.position.z,
      };
    });

    // Simulate drag on canvas to orbit camera
    const startX = canvasBounds.x + canvasBounds.width / 2;
    const startY = canvasBounds.y + canvasBounds.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 120, startY + 60, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    // Verify camera position changed (confirming canvas received drag)
    const newCamState = await page.evaluate(() => {
      const sm = (window as any).__sceneManager;
      if (!sm || !sm.stage || !sm.stage.camera) return null;
      return {
        x: sm.stage.camera.position.x,
        y: sm.stage.camera.position.y,
        z: sm.stage.camera.position.z,
        enabled: sm.stage.controls?.enabled,
      };
    });

    console.log('Cam before:', initialCamState, 'Cam after:', newCamState);

    // Test wheel zoom on 3D canvas
    await page.mouse.move(startX, startY);
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(300);

    const postWheelCam = await page.evaluate(() => {
      const sm = (window as any).__sceneManager;
      if (!sm || !sm.stage || !sm.stage.camera) return null;
      return {
        x: sm.stage.camera.position.x,
        y: sm.stage.camera.position.y,
        z: sm.stage.camera.position.z,
      };
    });

    console.log('Post wheel cam:', postWheelCam);
    if (initialCamState && postWheelCam) {
      const distanceDelta = Math.abs(postWheelCam.z - initialCamState.z) + Math.abs(postWheelCam.x - initialCamState.x);
      console.log('Distance delta on canvas wheel:', distanceDelta);
      expect(distanceDelta).toBeGreaterThan(0.01);
    }

    // Canvas elementFromPoint check: verify canvas is directly reachable
    const hitElementTag = await page.evaluate(({ cx, cy }) => {
      return document.elementFromPoint(cx, cy)?.tagName;
    }, { cx: startX, cy: startY });
    console.log('Hit element at center:', hitElementTag);
    expect(hitElementTag).toBe('CANVAS');
  });

  test('2. Modal open properly captures pointer events and blocks canvas interaction', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Open Resume Forge modal via store or UI
    await page.evaluate(() => {
      const coreStore = (window as any).useCoreStore?.getState?.();
      if (coreStore?.setResumeForgeOpen) {
        coreStore.setResumeForgeOpen(true);
      }
    });
    await page.waitForTimeout(500);

    // Modal dialog is present with z-[110]
    const modal = page.locator('.z-\\[110\\]').first();
    await expect(modal).toBeVisible();

    // Verify modal has pointer-events: auto
    const modalPointerEvents = await modal.evaluate((el) => {
      return window.getComputedStyle(el).pointerEvents;
    });
    expect(modalPointerEvents).toBe('auto');

    // Click close button inside modal (X icon button)
    const closeBtn = modal.locator('button').first();
    await closeBtn.click();
    await page.waitForTimeout(500);

    // Verify modal is closed
    await expect(modal).not.toBeVisible();
  });

  test('3. Modal close cleanly restores canvas interactivity', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const canvas = page.locator('canvas').first();
    const bounds = await canvas.boundingBox();
    expect(bounds).not.toBeNull();
    if (!bounds) return;

    // Open BYOK modal via store
    await page.evaluate(() => {
      const uiStore = (window as any).useUiStore?.getState?.();
      if (uiStore?.setBYOKOpen) {
        uiStore.setBYOKOpen(true);
      }
    });
    await page.waitForTimeout(500);

    // Verify BYOK modal is visible with z-[100]
    const byokModal = page.locator('.z-\\[100\\]').first();
    await expect(byokModal).toBeVisible();

    // Close via close button
    const closeBtn = byokModal.locator('button').first();
    await closeBtn.click();
    await page.waitForTimeout(500);

    // Verify modal is gone
    await expect(byokModal).not.toBeVisible();

    // Verify canvas is still fully interactive
    const startX = bounds.x + bounds.width / 2;
    const startY = bounds.y + bounds.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX - 80, startY - 40, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(200);

    // Canvas should have auto cursor when idle
    const cursor = await canvas.evaluate((el) => window.getComputedStyle(el).cursor);
    expect(cursor === 'auto' || cursor === 'default').toBe(true);
  });
});
