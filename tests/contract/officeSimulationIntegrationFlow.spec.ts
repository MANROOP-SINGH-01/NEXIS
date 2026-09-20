/**
 * FILE: tests/contract/officeSimulationIntegrationFlow.spec.ts
 * PURPOSE: End-to-end browser contract flow for Phase 16: 3D Office / Agent Simulation Integration.
 * SPECIFICATION: Master Spec Section 9, 15.3, 21.1 & 27 (Phase 16).
 */

import { test, expect, Page } from '@playwright/test';

async function ensureAuthenticatedDashboard(page: Page) {
  await page.goto('http://localhost:3000/dashboard');

  // If redirected to login page, authenticate using 1-Click Continue as Demo Candidate
  const demoLoginBtn = page.locator('button:has-text("1-Click Continue as Demo Candidate")');
  if (await demoLoginBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
    await demoLoginBtn.click({ force: true });
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  }

  await page.waitForSelector('#root', { state: 'attached', timeout: 15000 });

  // Dismiss DPDP consent or onboarding overlay if present so it doesn't intercept clicks
  const skipConsentBtn = page.locator('button:has-text("Skip for now"), button:has-text("Acknowledge & Proceed")').first();
  if (await skipConsentBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await skipConsentBtn.click({ force: true });
    await page.waitForTimeout(600);
  }
}

test.describe('Phase 16: 3D Office & Agent Simulation Browser Contract Flow', () => {
  test('1. Top header renders Section 15.3 Evidence Dossier and Work Queues controls', async ({ page }) => {
    await ensureAuthenticatedDashboard(page);

    // Check Work Queues button
    const workQueuesBtn = page.locator('button[title*="Conventional Work Queues"], button:has-text("WORK QUEUES")').first();
    await expect(workQueuesBtn).toBeVisible({ timeout: 15000 });

    // Check Evidence Dossier button
    const evidenceBtn = page.locator('button[title*="Evidence Findings Ledger"], button:has-text("EVIDENCE DOSSIER")').first();
    await expect(evidenceBtn).toBeVisible({ timeout: 15000 });

    // Click EVIDENCE DOSSIER to open modal
    await evidenceBtn.click({ force: true });

    // Verify EvidenceInspectionPanel opens
    const evidenceModal = page.locator('[role="dialog"]:has-text("SECTION 15.3 AGENT FINDING DOSSIER")');
    await expect(evidenceModal).toBeVisible({ timeout: 8000 });

    // Verify key Section 15.3 fields
    await expect(evidenceModal.locator('text=MODEL VERSION')).toBeVisible();
    await expect(evidenceModal.locator('text=TARGET COHORT')).toBeVisible();

    // Verify tabs
    await expect(evidenceModal.locator('button:has-text("Provenance & Sources")')).toBeVisible();
    await expect(evidenceModal.locator('button:has-text("Telemetry & Formula")')).toBeVisible();
    await expect(evidenceModal.locator('button:has-text("Governance & Queue")')).toBeVisible();

    // Switch to Telemetry & Formula tab
    await evidenceModal.locator('button:has-text("Telemetry & Formula")').click({ force: true });
    await expect(evidenceModal.locator('text=Section 19.3 Confidence Calculation')).toBeVisible();

    // Close panel
    await evidenceModal.locator('button[aria-label="Close"], button:has-text("Close Dossier")').first().click({ force: true });
    await expect(evidenceModal).not.toBeVisible();
  });

  test('2. Section 21.1 bidirectional navigation functions between 3D scene and conventional queues', async ({ page }) => {
    await ensureAuthenticatedDashboard(page);

    // Open Work Queue Navigator
    const workQueuesBtn = page.locator('button[title*="Conventional Work Queues"], button:has-text("WORK QUEUES")').first();
    await workQueuesBtn.click({ force: true });

    // Verify modal appears
    const queueModal = page.locator('[role="dialog"]:has-text("CONVENTIONAL WORK QUEUE NAVIGATOR")');
    await expect(queueModal).toBeVisible({ timeout: 8000 });

    // Click Outcome Milestone Tracking with force
    const outcomeQueueBtn = queueModal.locator('button:has-text("Outcome Milestone Tracking")');
    await expect(outcomeQueueBtn).toBeVisible();
    await outcomeQueueBtn.click({ force: true });

    // Verify navigation into OutcomeStatusView
    await expect(page.locator('text=CAREER OUTCOMES & EVIDENCE')).toBeVisible({ timeout: 12000 });

    // Verify return path: "3D Office" button exists
    const return3dBtn = page.locator('button:has-text("3D Office")').first();
    await expect(return3dBtn).toBeVisible();

    // Click 3D Office to return to simulation
    await return3dBtn.click({ force: true });

    // Verify returned to 3D scene
    await expect(page.locator('text=01 // NEXIS ARCHITECTURAL STUDIO')).toBeVisible({ timeout: 12000 });
  });

  test('3. Real-time Agent Activity Stream in 3D scene expands and opens finding inspection', async ({ page }) => {
    await ensureAuthenticatedDashboard(page);

    // Locate the floating activity stream capsule
    const streamCapsule = page.locator('button[title*="Outcome Intelligence Agent Activity Stream"], button:has-text("AGENT STREAM"), button:has-text("OUTCOME INTELLIGENCE STREAM")').first();
    await expect(streamCapsule).toBeVisible({ timeout: 15000 });

    // Click to expand
    await streamCapsule.click({ force: true });

    // Verify expanded stream header
    await expect(page.locator('text=AGENT ACTIVITY STREAM')).toBeVisible({ timeout: 8000 });

    // Verify filter tabs with exact role
    await expect(page.getByRole('button', { name: 'All', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Outcome', exact: true })).toBeVisible();

    // Click INSPECT on first finding
    const inspectBtn = page.locator('button:has-text("INSPECT")').first();
    await expect(inspectBtn).toBeVisible({ timeout: 8000 });
    await inspectBtn.click({ force: true });

    // Verify EvidenceInspectionPanel opens
    const evidenceModal = page.locator('[role="dialog"]:has-text("SECTION 15.3 AGENT FINDING DOSSIER")');
    await expect(evidenceModal).toBeVisible({ timeout: 8000 });

    // Close dossier
    await evidenceModal.locator('button:has-text("Close Dossier")').click({ force: true });
    await expect(evidenceModal).not.toBeVisible();
  });
});
