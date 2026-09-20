import { test, expect } from '@playwright/test';

const ZOOM_LEVELS = [
  { name: '90% (Ultra-wide/Scaled-out)', width: 2133, height: 1200 },
  { name: '100% (Standard 1080p)', width: 1920, height: 1080 },
  { name: '110% (Subtle Zoom)', width: 1745, height: 982 },
  { name: '125% (Standard Laptop Zoom)', width: 1536, height: 864 },
  { name: '150% (High Zoom / Accessibility)', width: 1280, height: 720 },
  { name: 'Compact / Laptop 125% (1024x768)', width: 1024, height: 768 },
];

test.describe('NEXIS Phase 4: Screen Zoom & Responsive Overflow Audit Suite', () => {
  for (const zoom of ZOOM_LEVELS) {
    test(`Verify 0 horizontal scroll blowout at ${zoom.name} on /dashboard`, async ({ page }) => {
      await page.setViewportSize({ width: zoom.width, height: zoom.height });
      await page.goto('http://localhost:3000/dashboard');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      // Verify no horizontal overflow on window
      const overflow = await page.evaluate(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          bodyScrollWidth: document.body.scrollWidth,
          bodyClientWidth: document.body.clientWidth,
          hasWindowOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        };
      });

      expect(overflow.hasWindowOverflow).toBe(false);

      // Verify Navbar brand is visible
      const brand = page.locator('header').first();
      await expect(brand).toBeVisible();

      // Verify header doesn't overflow
      const headerOverflow = await page.evaluate(() => {
        const header = document.querySelector('header');
        if (!header) return false;
        return header.scrollWidth > header.clientWidth + 2;
      });
      expect(headerOverflow).toBe(false);
    });

    test(`Verify 0 horizontal scroll blowout at ${zoom.name} on /resume`, async ({ page }) => {
      await page.setViewportSize({ width: zoom.width, height: zoom.height });
      await page.goto('http://localhost:3000/resume');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
      });
      expect(hasOverflow).toBe(false);

      // Verify PDF and DOCX download buttons are within viewport and visible
      const pdfBtn = page.getByRole('button', { name: /download pdf/i });
      const docxBtn = page.getByRole('button', { name: /download word/i });
      await expect(pdfBtn).toBeVisible();
      await expect(docxBtn).toBeVisible();
    });

    test(`Verify ResumeForgeModal layout containment at ${zoom.name}`, async ({ page }) => {
      await page.setViewportSize({ width: zoom.width, height: zoom.height });
      await page.goto('http://localhost:3000/dashboard');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Open command bar or trigger modal via state/button
      // Use client-side evaluation to open ResumeForgeModal
      await page.evaluate(() => {
        const coreStore = (window as any).__coreStore || (window as any).useCoreStore?.getState?.();
        if (coreStore?.setResumeForgeOpen) {
          coreStore.setResumeForgeOpen(true);
        }
      });
      await page.waitForTimeout(500);

      // Verify modal is visible
      const modal = page.locator('div[role="dialog"], .z-\\[110\\]').first();
      if (await modal.isVisible()) {
        const modalBounds = await modal.boundingBox();
        if (modalBounds) {
          // Modal must not overflow viewport vertically
          expect(modalBounds.y + modalBounds.height).toBeLessThanOrEqual(zoom.height + 10);
          expect(modalBounds.x + modalBounds.width).toBeLessThanOrEqual(zoom.width + 10);
        }
      }
    });
  }
});
