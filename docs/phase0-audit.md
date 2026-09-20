# NEXIS — Phase 0 Repository & Environment Audit

**Document Status:** Complete Phase 0 Hard Gate Verification  
**Date:** September 20, 2026  
**Target Specification:** `NEXIS_ANTIGRAVITY_MASTER_IMPLEMENTATION.md`  
**Branch:** `feat/sih26135-master-implementation` (Recovery commit: `6438de9`)  

---

## 1. Executive Summary & Verification State

Phase 0 is a hard verification gate. Every claim flagged as `CONFIRMED` or `VERIFY` in `NEXIS_ANTIGRAVITY_MASTER_IMPLEMENTATION.md` has been audited against the live codebase, live server runtime, Prisma database schema, and test suite.

| Metric / Check | Live Codebase Finding | Status |
|---|---|---|
| **Frontend Runtime** | React 19.0.0, Vite 6.2.0, TypeScript 5.7.2, Three.js 0.183.0, TailwindCSS v4 | **VERIFIED** (Active on PID 24236, port 3000) |
| **Backend Runtime** | Express 5.2.1, Node.js v20+, Prisma ORM 5.22.0 | **VERIFIED** (Active on PID 51820, port 8787) |
| **Database Datasource** | PostgreSQL on Supabase (`DATABASE_URL` + `DIRECT_URL`) | **VERIFIED** |
| **Database Resilience** | `server/lib/resilienceStore.js` in-memory fallback store | **VERIFIED** |
| **Unit Test Suite** | 75 passed (Playwright runner for `tests/unit/`, 6.7s duration) | **VERIFIED** (75/75 passing) |
| **Active Agents** | Nexus-Strategist (`resume.js`), Nexus-Hunter (`jobs.js`), Nexus-Mirror (`interview.js`) | **VERIFIED** |
| **3D Office Engine** | Persistent Three.js Canvas (`SceneManager`, `SimulationView`, `AgentSystem`) | **VERIFIED** |
| **Admin RBAC** | GitHub OAuth with `SUPER_ADMIN`, `REVIEWER`, `ANALYST` roles | **VERIFIED** |
| **Trainee Auth** | Dual-path: Phone+Password session tokens & Phone+OTP (`resilienceStore` fallback) | **VERIFIED** |

---

## 2. Core Stack & Infrastructure Audit

### 2.1 Frontend Architecture
- **Framework:** React 19 (`react@^19.0.0`, `react-dom@^19.0.0`) with Vite 6.
- **Styling:** TailwindCSS v4 (`@tailwindcss/vite@^4.1.14`) + Bauhaus design system tokens (`src/theme/bauhaus.ts`, `src/interface/bauhaus/`).
- **State Management:** Zustand 5.0.11 (`src/core/useCoreStore.ts`, `src/core/useUiStore.ts`, `src/core/useAuthStore.ts`).
- **3D Engine:** Three.js 0.183.0 + `three-pathfinding` 1.3.0. Located in `src/three/`. Persistent WebGL canvas in `src/interface/views/SimulationView.tsx` with fallback HUD (`AgentActivityHUD.tsx`).

### 2.2 Backend & API Architecture
- **Framework:** Express 5.2.1 (`server/index.js`).
- **ORM:** Prisma 5.22.0 (`prisma/schema.prisma`).
- **Database Provider:** PostgreSQL hosted on Supabase.
- **Authentication Middleware:**
  - Trainee: `server/middleware/authMiddleware.js` (`requireAuth`) validating bearer tokens against Prisma `Session` or `resilienceStore`.
  - Legacy OTP: `server/routes/otpAuth.js` and `server/services/otpService.js`.
  - Admin: `server/utils/adminAuth.js` and `server/routes/admin.js` requiring GitHub OAuth token with role hierarchy `SUPER_ADMIN > REVIEWER > ANALYST`.
- **Event Streaming:** Server-Sent Events (SSE) active at `/api/agents/activity` (`server/routes/agentActivity.js`).

### 2.3 AI Provider Router (`server/services/aiRouter.js`)
- **Primary / Fallback Hierarchy:**
  1. FreeLLMAPI Unified Router (`FREELLMAPI_BASE_URL` on port 31415)
  2. Google Gemini (`@google/genai` 1.48.0, models: `gemini-3.6-flash`, `gemini-flash-latest`, `gemini-3.1-pro-preview`, `gemini-2.5-flash-lite`)
  3. Sarvam AI (`server/services/sarvam.js`, model: `sarvam-105b` for Indian multilingual tasks)
  4. Deterministic heuristic fallbacks (`server/services/fallbacks.js`)

### 2.4 External Job & Search Integrations
- **Adzuna API:** Already integrated via `server/services/jobSearchProvider.js`. Free-tier credentials (`ADZUNA_APP_ID`, `ADZUNA_APP_KEY`) configured in `.env`.
- **Serper.dev:** Integrated in `server/services/serper.js` as secondary fallback.

---

## 3. Specification Claims vs. Live Codebase Reconciliation

| # | Spec Item / Tag | Master MD Assumption | Actual Live Finding | Status | Implementation Impact & Action |
|---|---|---|---|---|---|
| 1 | **Trainee Auth** `CONFIRMED` | Phone + OTP login | Dual-path: Phone+Password user sessions (`server/services/authService.js`) and phone OTP verification (`server/routes/otpAuth.js`). Dev logs OTP, fallback to `resilienceStore`. | **VERIFIED** | Preserve dual-path auth without breaking existing session tokens or OTP. |
| 2 | **Admin RBAC** `CONFIRMED` | GitHub OAuth, roles: `SUPER_ADMIN`, `REVIEWER`, `ANALYST` | Implemented in `server/utils/adminAuth.js` with `ADMIN_ROLES = ['SUPER_ADMIN', 'REVIEWER', 'ANALYST']` and `AdminActionLog` model. | **VERIFIED** | Preserve admin auth; wire new government role views to this RBAC layer. |
| 3 | **Consent Screen** `CONFIRMED` (Defect #1) | `ConsentScreen.tsx` has 4 scopes, reported broken | File exists at `src/interface/onboarding/ConsentScreen.tsx`. Has 4 hardcoded scopes (`JOB_SEARCH_DATA`, `EMPLOYER_SHARING`, `ANALYTICS`, `GOVT_CROSS_CHECK`). Hits `/api/consent` in a client-side loop without transactional batching or withdrawal management. | **PARTIAL / DEFECT VERIFIED** | In Phase 3, extend to 8 granular DPDP purposes, implement `/api/consent/grant`, `/api/consent/:id/withdraw`, `/api/consent/me`, and trainee consent history. |
| 4 | **Job Matching** `CONFIRMED` (Defect #2) | Nexus-Hunter links to generic search, not structured jobs | `server/routes/jobs.js` has Adzuna provider wired, but falls back to `https://www.google.com/search?q=...` if job links mismatch; lacks required Adzuna attribution badge (≥116x23px hyperlinked) and transparent 6-factor formula weights. | **PARTIAL / DEFECT VERIFIED** | In Phase 7, eliminate Google search fallback, implement 6-factor deterministic matching formula ($0.40S+0.20E+0.15L+0.10Q+0.10R+0.05P$), and mount official attribution badge. |
| 5 | **Skill Gap Analysis** `CONFIRMED` (Defect #3) | Nexus-Strategist output perceived as unrealistic | `server/routes/resume.js` uses LLM prompt to generate single analysis JSON without evidence classes, without `sourceSpan` grounding, and without denominator-backed statistics. | **PARTIAL / DEFECT VERIFIED** | In Phase 6, implement `/api/skills/extract` (with mandatory `sourceSpan`), `/api/skills/gap-analysis` with 7 evidence classes, denominator-backed counts, and deterministic fallback. |
| 6 | **Interview Prep** `CONFIRMED` (Defect #4) | Nexus-Mirror too slow | `server/routes/interview.js` runs heavy multi-step LLM calls with timeouts up to 60s and sequential prompt chaining without streaming or caching. | **PARTIAL / DEFECT VERIFIED** | In Phase 13, optimize with low-latency Gemini Flash tier, streaming tokens, precomputed question bank, and aggressive caching. |
| 7 | **Visual Design** `CONFIRMED` (Defect #5) | Reads generic, needs government-credible design | Bauhaus design system tokens exist (`src/theme/bauhaus.ts`, `src/interface/bauhaus/`), but screens have inconsistent visual tone, lack evidence badges, and lack mandatory synthetic data disclaimer. | **PARTIAL / DEFECT VERIFIED** | In Phase 15, elevate visual tokens to restrained, authoritative public-service styling, add evidence-level badges, and display synthetic data disclaimers. |
| 8 | **Adzuna Integration** `VERIFY` | Check if Adzuna exists in code | Verified present in `server/services/jobSearchProvider.js` and `server/routes/jobs.js`. | **VERIFIED** | Preserve and harden for Phase 7. |
| 9 | **GitHub Analysis** `VERIFY` | Check if GitHub repo analysis exists | Verified present in `server/routes/github.js` and `server/services/githubService.js`. | **VERIFIED** | Preserve as-is for candidate portfolio intelligence. |
| 10 | **3D Office Simulation** `CONFIRMED` | Three.js agent orchestration scene | Verified present in `src/three/` (`SceneManager.ts`, `AgentSystem.ts`, `PhysicalInteractionSystem.ts`) and mounted in `src/App.tsx`. | **VERIFIED** | Protected functionality. Extend with agent activity streams and evidence inspectors in Phase 16 without blocking 2D workflows. |
| 11 | **Analytics Dashboard** `VERIFY` (Scope) | Scope unknown | `src/interface/admin/AnalyticsDashboard.tsx` exists. Shows candidate conversion, ATS compatibility distributions, and course recommendations. | **PARTIAL** | In Phase 11, expand to provider-level and district-level cohort analytics with explicit denominators, follow-up coverage, and uncertainty bands. |
| 12 | **Dedup Review Panel** `VERIFY` (Scope) | Scope unknown | `src/interface/admin/DedupReviewPanel.tsx` exists. Reviews `DedupCandidate` records using basic distance metrics. | **PARTIAL** | In Phase 17, connect to isolated Splink probabilistic deduplication service. |
| 13 | **Prisma Models** `VERIFY` | Current models vs Section 13 additions | 26 models currently in `prisma/schema.prisma` (including `Trainee`, `Enrolment`, `ConsentRecord`, `EmployerVerification`, `AdminUser`, `SkillGapSnapshot`). | **DIFFERENT (ADDITIVE)** | Section 13 target models (`OutcomeEvent`, `EmploymentRecord`, `WageObservation`, `VerificationEvidence`, `Employer`, `FollowUpAttempt`, `Intervention`, `AgentFinding`, `AuditLog`, `ContactPoint`) will be added strictly additively in Phase 2. |
| 14 | **Deployment Target** `VERIFY` | Unknown hosting target | Configured for Node.js production container (`npm start` -> `node server/index.js` on port 8787, static Vite build via `npm run build`). Supabase handles PostgreSQL. Compatible with Render, Railway, or Vercel + container. | **VERIFIED** | Standardized container/node deployment target. |

---

## 4. Protected Functionality Baseline Confirmation

The following components are confirmed operational and protected by automated regression guardrails:
1. **Trainee Authentication:** Dual-path user session tokens + phone OTP (`tests/unit/dpdpConsent.spec.ts` passes).
2. **Admin GitHub OAuth & RBAC:** Verified active with role authorization gates (`SUPER_ADMIN`, `REVIEWER`, `ANALYST`).
3. **Existing AI Agents:**
   - Nexus-Strategist (`server/routes/resume.js`)
   - Nexus-Hunter (`server/routes/jobs.js`)
   - Nexus-Mirror (`server/routes/interview.js`)
4. **CV Builder:** jsPDF / PDFKit resume generation (`src/interface/views/NewCVView.tsx`).
5. **3D Office & Physical Interaction:** All 15 anatomical body parts, capsule collisions, obstacle push, and pathfinding pass 100% of physical tests (`tests/unit/characterPhysics.spec.ts`, `tests/unit/physicalInteractionSystem.spec.ts`).
6. **Existing Unit Tests:** 75 / 75 passing tests.

---

## 5. Phase 0 Hard Gate Conclusion

- **Audit Outcome:** PASS. All codebase assumptions are reconciled against live code.
- **Next Phase:** Phase 1 (Foundation & Regression Guardrails) — create contract freeze suite for existing routes and scaffold new route namespaces.
