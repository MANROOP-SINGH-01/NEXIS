# Phase 15: Government-Credible Visual Design (Defect #5 Fix)

## 1. Phase Metadata & Executive Summary
- **Phase**: 15 of 22
- **Objective**: Resolve confirmed Defect #5 (*"Reads generic, not government-credible"*) by establishing an official public-sector visual language adhering to Indian government design conventions, Devanagari typography support, standardized evidence class badges, and prominent Section 25.3 synthetic data labelling while preserving the 3D Office intact.
- **Specification Cross-References**:
  - Master Spec Section 5.3: Confirmed Defect #5 (Visual design pass).
  - Master Spec Section 21.3: HCI rules for evidence class differentiation (`VERIFIED`, `SELF_REPORTED`, `INFERRED`).
  - Master Spec Section 21.4: Government-credible visual design (restrained palette, Devanagari awareness, official topbar without false impersonation).
  - Master Spec Section 25.3: Mandatory binding disclaimer (*"Synthetic demonstration data — not official Maharashtra government statistics"*).
  - Master Spec Section 27: Phase 15 Task & Acceptance Criteria.
- **Git Commit Target**: `feat(phase15): government-credible visual design, devanagari typography, evidence badges, and section 25.3 trust banner`

---

## 2. Key Architecture & Design Decisions

### 2.1 Restrained Public-Sector Theme Tokens (Section 21.4)
The application styling was upgraded from generic template aesthetics to a high-contrast, institutional design system matching Indian state portal standards:
- **Ashoka Navy & Slate Foundations**: `--gov-navy: #0B2545`, `--gov-ashoka: #000080`, `--gov-slate: #1E293B`, `--gov-border: #CBD5E1`.
- **National Civic Accents**: `--gov-saffron: #C2410C`, `--gov-green: #15803D`, `--gov-gold: #D97706`.
- **High-Contrast Canvas**: Clean paper white cards (`#FFFFFF`) with 1px border contrast (`#CBD5E1`) and subtle solid offset shadows (`2px 2px 0px #0F172A`).
- **Devanagari Typography**: Preloaded Google Fonts for `Noto Sans Devanagari` and `Outfit` alongside `Inter` and `Space Grotesk`, ensuring seamless Marathi/Hindi institutional text rendering.

### 2.2 Standardized Evidence Class Badges (Section 21.3 HCI Invariants)
Created `src/interface/common/EvidenceBadge.tsx` to strictly prevent color-alone status indication:
1. **`VERIFIED`**:
   - Palette: Institutional Green (`#15803D` text, `#F0FDF4` background, `#86EFAC` border).
   - Iconography: `ShieldCheck`.
   - Dual-Label: `VERIFIED • सत्यापित (95% CI)`.
   - Semantic Tooltip: Ground-truth confirmation with cryptographic ledger receipt reference.
2. **`SELF_REPORTED`**:
   - Palette: Deep Amber (`#B45309` text, `#FFFBEB` background, `#FCD34D` border).
   - Iconography: `UserCheck`.
   - Dual-Label: `SELF-REPORTED • स्वयं-घोषित`.
   - Semantic Tooltip: Candidate declaration without third-party audit.
3. **`INFERRED`**:
   - Palette: Cobalt Blue (`#1D4ED8` text, `#EFF6FF` background, `#93C5FD` border).
   - Iconography: `Sparkles`.
   - Dual-Label: `INFERRED • अनुमानित (Confidence %)`.
   - Semantic Tooltip: Machine-learned inference or statistical projection.

### 2.3 Section 25.3 Mandatory Synthetic Demonstration Data Trust Banner
Created `src/interface/layout/GovHeaderBanner.tsx` and mounted it permanently into `src/interface/layout/Shell.tsx`:
- **Topmost Tiranga Accent**: 3px national flag gradient strip (`#FF9933` Saffron, `#FFFFFF` White, `#138808` Green).
- **State Portal Identification Bar**:
  - `महाराष्ट्र शासन • Government of Maharashtra`
  - `कौशल्य विकास, रोजगार व उद्योजकता विभाग (Skill Development & Entrepreneurship)`
  - Prototype Clarification Badge: `SIH 2026 PROTOTYPE` (explicitly respects Section 21.4 constraint against false government impersonation).
  - Language indicator and live IST time.
- **Persistent Section 25.3 Disclaimer**:
  - Exact string: `Synthetic demonstration data — not official Maharashtra government statistics`.
  - Bilingual subtitle: `(प्रात्यक्षिक डेटा — अधिकृत शासन आकडेवारी नाही)`.
  - Interactive **Section 25.3 Disclosure Modal** providing full transparency:
    - Calibrated sample: 500 trainees, 12 providers, 36 Maharashtra districts, 25 employers.
    - Anti-Overranking Guarantee (Section 20): Wilson 95% confidence intervals and coverage adjustment.
    - DPDP Act 2025 compliance notes.
  - Collapse / Expand control allowing minimization to a compact status chip without blocking workflows.

### 2.4 Preservation of 3D Office Differentiator
- The Three.js WebGL canvas (`SimulationView.tsx`), physics simulation, camera controllers, and agent avatars were preserved completely untouched.
- `Shell.tsx` uses responsive flexbox layout so the persistent banner sits neatly above the viewport while preserving the canvas aspect ratio and interaction zones.

---

## 3. Files Created & Modified

| File | Change Type | Purpose |
|---|---|---|
| `index.html` | Modified | Linked `Noto Sans Devanagari` and `Outfit` Google Fonts; updated title. |
| `src/index.css` | Modified | Defined public sector government tokens, Devanagari typography font stack, Tiranga top strip, and evidence badge classes. |
| `src/interface/common/EvidenceBadge.tsx` | New | Reusable multi-attribute evidence badge (`VERIFIED`, `SELF_REPORTED`, `INFERRED`) with Devanagari labels and confidence display. |
| `src/interface/layout/GovHeaderBanner.tsx` | New | Top civic portal bar and Section 25.3 synthetic data trust ribbon with disclosure modal. |
| `src/interface/layout/Shell.tsx` | Modified | Mounted `GovHeaderBanner` at shell apex. |
| `src/interface/OutcomeStatusView.tsx` | Modified | Added Section 25.3 disclaimer banner and wired `EvidenceBadge` to check-in cards. |
| `src/interface/JobMatchesView.tsx` | Modified | Added Section 25.3 synthetic data disclaimer alongside Adzuna API partner badge. |
| `src/interface/admin/AnalyticsDashboard.tsx` | Modified | Embedded Section 25.3 disclaimer banner at dashboard scroll apex. |
| `src/interface/admin/DedupReviewPanel.tsx` | Modified | Embedded Section 25.3 synthetic candidate disclaimer banner. |
| `tests/unit/governmentVisualCredibility.spec.ts` | New | Unit test suite covering tokens, banner texts, evidence badges, and layout mounts. |
| `tests/contract/governmentVisualCredibilityFlow.spec.ts` | New | Browser contract test verifying live DOM elements, modal interactivity, and 3D canvas preservation. |

---

## 4. Verification Evidence

### 4.1 Unit Test Suite (`tests/unit/governmentVisualCredibility.spec.ts`)
- **Execution**: `npx playwright test tests/unit/governmentVisualCredibility.spec.ts -c playwright.unit.config.ts`
- **Result**: **5/5 Passed (100%)**
  - Test 1: `index.css` establishes restrained government palette and Devanagari font typography (Section 21.4) — PASSED.
  - Test 2: `GovHeaderBanner` strictly enforces Section 25.3 binding synthetic data disclaimer — PASSED.
  - Test 3: `EvidenceBadge` distinguishes `VERIFIED`, `SELF_REPORTED`, and `INFERRED` with distinct iconography and Devanagari labels — PASSED.
  - Test 4: `Shell` mounts `GovHeaderBanner` preserving 3D Office canvas without layout regression — PASSED.
  - Test 5: Outcome, Job Matches, Analytics, and Dedup views incorporate Section 25.3 synthetic disclaimers — PASSED.

### 4.2 Browser Contract Test Suite (`tests/contract/governmentVisualCredibilityFlow.spec.ts`)
- **Execution**: `npx playwright test tests/contract/governmentVisualCredibilityFlow.spec.ts`
- **Result**: **2/2 Passed (100%)**
  - Test 1: Loads app shell, renders `GovHeaderBanner`, verifies Section 25.3 disclaimer in DOM, clicks disclosure modal, and verifies 3D canvas remains visible — PASSED.
  - Test 2: Banner collapse and expand toggle works smoothly without breaking viewport — PASSED.

### 4.3 Static Type Verification
- **Execution**: `npx tsc --noEmit`
- **Result**: **0 errors** across all TypeScript and TSX files.

---

## 5. Acceptance Checklist
- [x] Confirmed Defect #5 closed: Product reads credibly as an Indian state government innovation sandbox platform rather than a generic SaaS template.
- [x] Exact Section 25.3 disclaimer present: *"Synthetic demonstration data — not official Maharashtra government statistics"*.
- [x] Bilingual Devanagari typography integrated seamlessly (`Noto Sans Devanagari`).
- [x] Standardized Section 21.3 evidence badges distinguish ground-truth vs self-report vs AI inference.
- [x] 3D Office remains 100% intact as the core differentiator.
- [x] All unit and contract tests passing with zero regressions.
