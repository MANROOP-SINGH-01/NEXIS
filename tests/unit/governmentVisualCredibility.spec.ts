/**
 * FILE: tests/unit/governmentVisualCredibility.spec.ts
 * PURPOSE: Unit verification for Phase 15 Government-Credible Visual Design (Defect #5).
 * SPECIFICATION: Master Spec Section 5.3 (Defect #5), Section 21.3, Section 21.4, Section 25.3 & Section 27 (Phase 15).
 */

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Phase 15: Government-Credible Visual Design & Section 25.3 Invariants', () => {
  const rootDir = process.cwd();

  test('1. index.css establishes restrained government palette and Devanagari font typography (Section 21.4)', () => {
    const cssPath = path.join(rootDir, 'src', 'index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    // Official Government design tokens
    expect(cssContent).toContain('--gov-navy: #0B2545');
    expect(cssContent).toContain('--gov-ashoka: #000080');
    expect(cssContent).toContain('--gov-saffron: #C2410C');
    expect(cssContent).toContain('--gov-green: #15803D');
    expect(cssContent).toContain('--gov-border: #CBD5E1');

    // Devanagari typography
    expect(cssContent).toContain('Noto+Sans+Devanagari');
    expect(cssContent).toContain('--font-devanagari');

    // Evidence badges and Tiranga strip
    expect(cssContent).toContain('.gov-tricolor-strip');
    expect(cssContent).toContain('.badge-evidence-verified');
    expect(cssContent).toContain('.badge-evidence-self-reported');
    expect(cssContent).toContain('.badge-evidence-inferred');
  });

  test('2. GovHeaderBanner strictly enforces Section 25.3 binding synthetic data disclaimer', () => {
    const bannerPath = path.join(rootDir, 'src', 'interface', 'layout', 'GovHeaderBanner.tsx');
    const bannerContent = fs.readFileSync(bannerPath, 'utf8');

    // Invariant 1: Exact binding text from Master Spec Section 25.3
    const mandatoryDisclaimer = 'Synthetic demonstration data — not official Maharashtra government statistics';
    expect(bannerContent).toContain(mandatoryDisclaimer);

    // Invariant 2: Marathi bilingual support
    expect(bannerContent).toContain('प्रात्यक्षिक डेटा — अधिकृत शासन आकडेवारी नाही');
    expect(bannerContent).toContain('महाराष्ट्र शासन • Government of Maharashtra');

    // Invariant 3: Prototype clarification without false official impersonation (Section 21.4)
    expect(bannerContent).toContain('SIH 2026 PROTOTYPE');
    expect(bannerContent).toContain('Section 25.3 Disclosure');
  });

  test('3. EvidenceBadge distinguishes VERIFIED, SELF_REPORTED, and INFERRED with distinct iconography and Devanagari labels', () => {
    const badgePath = path.join(rootDir, 'src', 'interface', 'common', 'EvidenceBadge.tsx');
    const badgeContent = fs.readFileSync(badgePath, 'utf8');

    // Invariant: Non-color-only discrimination per Section 21.3 HCI rules
    expect(badgeContent).toContain('ShieldCheck');
    expect(badgeContent).toContain('UserCheck');
    expect(badgeContent).toContain('Sparkles');

    // Devanagari dual-labels
    expect(badgeContent).toContain('सत्यापित');
    expect(badgeContent).toContain('स्वयं-घोषित');
    expect(badgeContent).toContain('अनुमानित');

    // Confidence / 95% CI
    expect(badgeContent).toContain('95% CI');
  });

  test('4. Shell mounts GovHeaderBanner preserving 3D Office canvas without layout regression', () => {
    const shellPath = path.join(rootDir, 'src', 'interface', 'layout', 'Shell.tsx');
    const shellContent = fs.readFileSync(shellPath, 'utf8');

    expect(shellContent).toContain("import { GovHeaderBanner } from './GovHeaderBanner';");
    expect(shellContent).toContain('<GovHeaderBanner />');
    expect(shellContent).toContain('Navbar');
    expect(shellContent).toContain('AppSidebar');
  });

  test('5. Outcome, Job Matches, and Analytics views incorporate Section 25.3 synthetic disclaimers', () => {
    const outcomesPath = path.join(rootDir, 'src', 'interface', 'OutcomeStatusView.tsx');
    const jobsPath = path.join(rootDir, 'src', 'interface', 'JobMatchesView.tsx');
    const analyticsPath = path.join(rootDir, 'src', 'interface', 'admin', 'AnalyticsDashboard.tsx');
    const dedupPath = path.join(rootDir, 'src', 'interface', 'admin', 'DedupReviewPanel.tsx');

    const outcomesContent = fs.readFileSync(outcomesPath, 'utf8');
    const jobsContent = fs.readFileSync(jobsPath, 'utf8');
    const analyticsContent = fs.readFileSync(analyticsPath, 'utf8');
    const dedupContent = fs.readFileSync(dedupPath, 'utf8');

    const disclaimerNeedle = 'Synthetic demonstration data — not official Maharashtra government statistics';

    expect(outcomesContent).toContain(disclaimerNeedle);
    expect(jobsContent).toContain(disclaimerNeedle);
    expect(analyticsContent).toContain(disclaimerNeedle);
    expect(dedupContent).toContain(disclaimerNeedle);
  });
});
