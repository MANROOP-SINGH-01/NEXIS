/**
 * FILE: tests/contract/governmentVisualCredibilityFlow.spec.ts
 * PURPOSE: End-to-end browser test for Phase 15 Government Visual Credibility & Section 25.3 Banner.
 * SPECIFICATION: Master Spec Section 5.3 Defect #5, Section 21.4, Section 25.3 & Section 27 (Phase 15).
 */

import { test, expect } from '@playwright/test';

test.describe('Phase 15: Government-Credible Visual Design Browser Contract Flow', () => {
  test('1. Loads app shell, renders GovHeaderBanner, and verifies Section 25.3 disclaimer in DOM', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');

    // If redirected to login page, authenticate using 1-Click Continue as Demo Candidate
    const demoLoginBtn = page.locator('button:has-text("1-Click Continue as Demo Candidate")');
    if (await demoLoginBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await demoLoginBtn.click();
      await page.waitForURL('**/dashboard', { timeout: 10000 });
    }

    // Wait for the app root to be ready
    await page.waitForSelector('#root', { state: 'attached', timeout: 15000 });

    // 1. Verify official Maharashtra Government civic portal identification
    const govPortalBar = page.locator('.gov-portal-bar');
    await expect(govPortalBar).toBeVisible({ timeout: 15000 });
    await expect(govPortalBar).toContainText('महाराष्ट्र शासन • Government of Maharashtra');
    await expect(govPortalBar).toContainText('SIH 2026 PROTOTYPE');

    // 2. Verify mandatory Section 25.3 disclaimer banner
    const disclaimerBanner = page.locator('.gov-disclaimer-banner');
    await expect(disclaimerBanner).toBeVisible();
    await expect(disclaimerBanner).toContainText(
      'Synthetic demonstration data — not official Maharashtra government statistics'
    );

    // Dismiss DPDP consent or onboarding overlay if present so it doesn't intercept clicks
    const skipConsentBtn = page.locator('button:has-text("Skip for now")');
    if (await skipConsentBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await skipConsentBtn.click();
      await page.waitForTimeout(600);
    }

    // 3. Verify interactive Section 25.3 Public Trust Disclosure modal
    const disclosureButton = page.locator('button:has-text("Section 25.3 Disclosure")');
    await expect(disclosureButton).toBeVisible();
    await disclosureButton.click({ force: true });

    // Verify modal pops up with transparency audit details
    const modalHeading = page.locator('h3:has-text("Section 25.3 Public Trust Disclosure")');
    await expect(modalHeading).toBeVisible();
    await expect(page.locator('text=Anti-Overranking Guarantee (Section 20)')).toBeVisible();

    // Close the modal
    const closeButton = page.locator('button:has-text("Acknowledge & Close")');
    await closeButton.click({ force: true });
    await expect(modalHeading).not.toBeVisible();

    // 4. Verify 3D Office canvas remains mounted and undisturbed
    const canvasContainer = page.locator('canvas');
    await expect(canvasContainer.first()).toBeVisible({ timeout: 15000 });
  });

  test('2. Banner collapse and expand toggle works smoothly without breaking viewport', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');

    const demoLoginBtn = page.locator('button:has-text("1-Click Continue as Demo Candidate")');
    if (await demoLoginBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await demoLoginBtn.click();
      await page.waitForURL('**/dashboard', { timeout: 10000 });
    }

    const collapseButton = page.locator('button[aria-label="Collapse banner"]');
    await expect(collapseButton).toBeVisible({ timeout: 15000 });
    await collapseButton.click({ force: true });

    // Verify collapsed ribbon appears
    await expect(page.locator('text=DEMO DATASET (SEC 25.3)')).toBeVisible();
    await expect(page.locator('.gov-disclaimer-banner')).not.toBeVisible();

    // Expand back
    const showNoticeButton = page.locator('button:has-text("Show Notice")');
    await expect(showNoticeButton).toBeVisible();
    await showNoticeButton.click({ force: true });

    // Verify banner expanded again
    await expect(page.locator('.gov-disclaimer-banner')).toBeVisible();
  });
});
