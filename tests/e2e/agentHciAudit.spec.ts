import { test, expect } from '@playwright/test';

test.describe('NEXIS Phase 6: Agent Dashboard & HCI Redesign Verification Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  test('1. Subheader Agent Focus Chips allow rapid switching across all 6 core agents', async ({ page }) => {
    const chipNames = ['Director', 'Vision', 'Strategist', 'Writer', 'Hunter', 'Mirror'];

    for (const name of chipNames) {
      const chip = page.locator(`button[title*="Focus Nexus-${name}"]`).first();
      await expect(chip).toBeVisible();

      // Click to select
      await chip.click();
      await page.waitForTimeout(200);

      // Verify chip is pressed/active
      await expect(chip).toHaveAttribute('aria-pressed', 'true');

      // Verify AgentDetailDrawer is open
      const drawer = page.locator('aside[aria-label="Agent Details Drawer"]');
      await expect(drawer).toBeVisible();

      // Verify drawer header shows this agent's name
      await expect(drawer.locator('h3').first()).toContainText(`Nexus-${name}`);
    }
  });

  test('2. AgentDetailDrawer displays signature role archetype badge, deliverable card, and copy button', async ({ page }) => {
    // Grant clipboard permissions
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    // Click on Agent 4 (Writer)
    const writerChip = page.locator('button[title*="Focus Nexus-Writer"]').first();
    await writerChip.click();
    await page.waitForTimeout(300);

    const drawer = page.locator('aside[aria-label="Agent Details Drawer"]');
    await expect(drawer).toBeVisible();

    // Verify role badge: STAR-Metric Engineer
    await expect(drawer).toContainText('STAR-Metric Engineer');

    // Verify model badge is present
    await expect(drawer).toContainText('sarvam-105b');

    // Verify deliverable card is visible
    const deliverableHeading = drawer.locator('span:has-text("Live Deliverable")');
    await expect(deliverableHeading).toBeVisible();

    // Verify Copy button is present and clickable
    const copyBtn = drawer.locator('button[title="Copy deliverable content"]').first();
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();
    await page.waitForTimeout(200);

    // Verify feedback state changed to "Copied"
    await expect(copyBtn).toContainText('Copied');
  });

  test('3. AgentDetailDrawer tab switching between Telemetry & Deliverables and Consultation', async ({ page }) => {
    // Select Agent 1 (Director)
    const directorChip = page.locator('button[title*="Focus Nexus-Director"]').first();
    await directorChip.click();
    await page.waitForTimeout(300);

    const drawer = page.locator('aside[aria-label="Agent Details Drawer"]');
    await expect(drawer).toBeVisible();

    // Switch to Consultation tab
    const consultTab = drawer.locator('button:has-text("Consultation")').first();
    await consultTab.click();
    await page.waitForTimeout(300);

    // Verify Consultation view / chat input is rendered
    const chatInput = drawer.locator('input[placeholder*="Ask"], input[placeholder*="Type"], textarea').first();
    await expect(chatInput).toBeAttached();

    // Switch back to Telemetry
    const telemetryTab = drawer.locator('button:has-text("Telemetry & Deliverables")').first();
    await telemetryTab.click();
    await page.waitForTimeout(300);

    // Verify deliverable card is back
    await expect(drawer.locator('span:has-text("Live Deliverable")')).toBeVisible();

    // Close drawer via close button
    const closeBtn = drawer.locator('button[aria-label="Close Agent Details"]').first();
    await closeBtn.click();
    await page.waitForTimeout(300);
    await expect(drawer).not.toBeVisible();
  });

  test('4. TeamFlowModal renders in dark editorial aesthetic without blinding white backgrounds', async ({ page }) => {
    // Click Agent Network button in subheader
    const flowBtn = page.locator('button[title="Inspect Agent Mesh Flow"]').first();
    await expect(flowBtn).toBeVisible();
    await flowBtn.click();
    await page.waitForTimeout(400);

    // Modal is open with z-[100]
    const modalContent = page.locator('.z-\\[100\\] .max-w-7xl').first();
    await expect(modalContent).toBeVisible();

    // Verify dark mode background computed color (not pure white rgb(255, 255, 255))
    const bgColor = await modalContent.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(bgColor).not.toBe('rgb(255, 255, 255)');

    // Close modal
    const closeBtn = page.locator('button[aria-label="Close Flow Modal"]').first();
    await closeBtn.click();
    await page.waitForTimeout(300);
    await expect(modalContent).not.toBeVisible();
  });
});
