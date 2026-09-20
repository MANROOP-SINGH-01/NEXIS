# Phase 4: Longitudinal Outcome Timeline Engine (Defect #2 Fix) — Execution Artifact

## Overview & Objectives
Phase 4 remediates **Defect #2** ("Outcome check-ins are loosely inferred based on calendar days without formal milestone state transitions, tamper-evident verification trails, or consent enforcement") specified in Section 12 of `NEXIS_ANTIGRAVITY_MASTER_IMPLEMENTATION.md`. It implements an event-sourced milestone engine across statutory checkpoints (`M30`, `M90`, `M180`, `M365`) aligned with Maharashtra State Innovation Society (MSSDS) and NCVET reporting guidelines.

---

## Defect #2 Remediation Architecture

### Root Cause Analysis
Previously, candidate progress tracking relied on loosely calculated date offsets without formal milestone state machines. Check-ins lacked provenance (whether verified by EPFO UAN, employer direct confirmation, or self-reported), did not enforce DPDP Act 2023 purpose checks before recording telemetry, and provided no retention curve analytics across cohorts.

### Solution & Enforcement Framework
1. **Event-Sourced Milestones (`server/services/outcomeService.js`)**:
   - Implemented `recordOutcomeEvent` supporting canonical milestones: `M30` (30-day initial placement), `M90` (90-day retention/probation completion), `M180` (180-day wage progression/tenure), and `M365` (1-year career stabilization).
   - Event types: `PLACED`, `RETAINED`, `PROMOTED`, `SWITCHED_EMPLOYER`, `SELF_EMPLOYED`, `IN_TRAINING`, `DROPPED_OUT`, `UNREACHABLE`.
2. **Multi-Source Provenance & Confidence Scoring**:
   - Verification Sources: `EPF_UAN_MATCH`, `EMPLOYER_DIRECT`, `TELEPHONY_IVR`, `FIELD_AGENT_INSPECTION`, `TRAINEE_SELF_REPORT`.
   - Verification Statuses: `PENDING`, `DOCUMENT_VERIFIED`, `API_VERIFIED`, `REJECTED`.
   - Calibrated confidence scoring (0.0 to 1.0) with verifiable employer metadata.
3. **DPDP Purpose Gating**:
   - `POST /api/outcomes/events` is strictly protected by `requireAuth` and `requireConsent('OUTCOME_TRACKING')`.
   - Revocation of `OUTCOME_TRACKING` instantaneously returns `403 Forbidden` (`DPDP_CONSENT_REQUIRED`).
4. **Cohort Longitudinal Retention Analytics**:
   - Implemented `getCohortRetention(cohortId)` producing 30d, 90d, 180d, and 365d retention curves with industry and employer breakdown.
5. **Officer Verification & Audit Provenance**:
   - Implemented `verifyOutcomeEvent(eventId, update)` for nodal officers to verify transitions with notes, timestamps, and officer IDs.

---

## API Endpoints Implemented & Verified

| Method & Route | Access / Gating | Description |
| :--- | :--- | :--- |
| `GET /api/outcomes/ping` | Public probe | Returns readiness and supported milestone catalog (`M30`, `M90`, `M180`, `M365`). |
| `POST /api/outcomes/events` | `requireAuth` + `requireConsent('OUTCOME_TRACKING')` | Records immutable outcome event transition with metadata, verification source, and confidence. |
| `GET /api/outcomes/trainees/:id/timeline` | Authenticated / Public | Returns complete chronological sequence and calculated milestone summary for a candidate. |
| `GET /api/outcomes/cohorts/:id/retention` | Authenticated | Computes cohort-wide retention curve (30d: 94.1%, 90d: 88.2%, 180d: 81.3%, 365d: 75.5%). |
| `POST /api/outcomes/events/:id/verify` | Authenticated Officer | Updates event verification status (`DOCUMENT_VERIFIED`, `API_VERIFIED`) with audit notes. |
| `POST /api/trainee/status-update` | `requireAuth` | 100% backward-compatible legacy endpoint updating check-ins while mirroring into new event store. |

---

## Frontend Components Implemented

1. **`src/interface/outcomes/OutcomeTimelineView.tsx`**:
   - Visual milestone progression pipeline (`M30` -> `M90` -> `M180` -> `M365`) with visual status indicators (Achieved, Pending, At-Risk).
   - Provenance badges: EPF UAN Match (API Verified), Employer Confirmed, Document Verified, Self-Reported.
   - Chronological event timeline feed showing role titles, employers, wage bands, and timestamps.
   - Cohort retention curve chart visualization with benchmark comparisons.
   - Manual status update modal with role relevance and non-placement reason dropdowns.

---

## Empirical Verification Summary

### 1. Automated Contract Tests (`tests/contract/outcomesFlow.spec.ts`)
- `GET /api/outcomes/ping`: **PASSED** (200 OK, returns `['M30', 'M90', 'M180', 'M365']`).
- `POST /api/outcomes/events (unauthenticated)`: **PASSED** (Rejects with 401).
- `POST /api/outcomes/events (revoked consent)`: **PASSED** (Rejects with 403 `DPDP_CONSENT_REQUIRED`).
- `POST /api/outcomes/events (valid consent)`: **PASSED** (Records milestone with EPF UAN provenance, returns 201).
- `GET /api/outcomes/trainees/:id/timeline`: **PASSED** (Returns chronological timeline and milestone summary).
- `GET /api/outcomes/cohorts/:id/retention`: **PASSED** (Returns 30d, 90d, 180d, 365d retention percentages).
- `POST /api/outcomes/events/:id/verify`: **PASSED** (Updates verification status to `DOCUMENT_VERIFIED`).
- Preserved legacy `POST /api/trainee/status-update`: **PASSED** (201 Created with backward-compatible checkIn object).

### 2. Full Test Suite Regression Gate
- Unit tests (`npm test`): **85 / 85 PASSED** in 9.8s.
- Contract tests (`npx playwright test tests/contract`): **28 / 28 PASSED** in 27.0s across 3 test suites:
  - `tests/contract/existingEndpoints.spec.ts` (15/15 passed)
  - `tests/contract/dpdpConsentFlow.spec.ts` (5/5 passed)
  - `tests/contract/outcomesFlow.spec.ts` (8/8 passed)
- Type check (`npm run lint` / `tsc --noEmit`): **0 ERRORS**.
