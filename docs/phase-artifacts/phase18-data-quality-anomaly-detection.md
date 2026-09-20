# Phase 18 Verification: Data Quality & Anomaly Detection Engine

**Phase:** Phase 18 — Data Quality & Anomaly Detection `SHOULD`  
**Specification References:** Master Plan Section 14.6, Section 15.2, Section 20, Section 27 Phase 18  
**Date:** September 20, 2026  
**Status:** Complete & Empirically Verified (14/14 tests passing, 0 TypeScript errors)

---

## 1. Executive Summary & Objective

In large-scale vocational skilling registries across Maharashtra, outcomes are frequently corrupted by:
- **Chronological impossibilities:** Providers recording trainees as placed weeks or months before they even completed their certification examination.
- **Concurrent duplicate claims:** Trainees recorded in two simultaneous full-time positions with independent subsidy claims.
- **Fabricated provider cohort clusters:** Entire batches (40+ candidates) reported as placed on the identical date with identical round-number wages without employer corroboration.
- **Stale unmonitored cohorts:** Certified trainees with zero milestone check-ins past their T0+90 checkpoint.

Phase 18 implements the complete **Section 20 Data Quality Agent ruleset** as active, reviewable verification checks with an operator audit trail — **never silent auto-corrections or auto-accusations**.

---

## 2. Technical Architecture & Anomaly Taxonomy

### A. Evaluated Anomaly Categories

| Anomaly Category | Rule ID | Severity | Validation Logic |
|---|---|---|---|
| **Chronology** | `CHRONOLOGY_EMPLOYMENT_BEFORE_CERTIFICATION` | `CRITICAL` | Flags when `employmentStartDate < certificationDate`. |
| **Chronology** | `CHRONOLOGY_CERTIFICATION_BEFORE_ENROLMENT` | `CRITICAL` | Flags when `certificationDate < enrolmentDate`. |
| **Chronology** | `FUTURE_EVENT_DATE` | `HIGH` | Flags when event date is > 24 hours in the future. |
| **Operational** | `OVERLAPPING_FULL_TIME_JOBS` | `HIGH` | Detects concurrent active full-time positions without recorded resignation. |
| **Operational** | `UNDERAGE_CERTIFICATION` | `HIGH` | Flags when candidate age at certification is < 15 years old. |
| **Identity / Dedup** | `DUPLICATE_TRAINEE_SUSPECT` | `MEDIUM` | Links to Splink candidate queue for Fellegi-Sunter matches. |
| **Identity / Dedup** | `DUPLICATE_EMPLOYER_RECORD` | `MEDIUM` | Flags employers with normalized name collision and identical contact domain. |
| **Staleness** | `STALE_OUTCOME_ALERT` | `MEDIUM` | Flags certified trainees at T0+90 with zero recorded follow-up check-ins. |
| **Provider Batch** | `IDENTICAL_PLACEMENT_DATE_CLUSTER` | `CRITICAL` | Flags batches where >80% of candidates share the exact same start date. |

### B. REST API Endpoints (`server/routes/dataQuality.js`)

- `GET /api/data-quality/issues`: Returns registered anomaly items filtered by status, category, severity, and district.
- `GET /api/data-quality/summary`: Returns reliability score (`86%`), critical violation counts, and category distribution.
- `POST /api/data-quality/scan`: Initiates full database scan across trainees and training providers.
- `POST /api/data-quality/issues/:id/resolve`: Records operator audit action (`RESOLVE`, `ACKNOWLEDGE`, `FALSE_POSITIVE`) with mandatory justification notes.
- `POST /api/data-quality/evaluate-record`: Real-time synchronous validator for event submissions before commitment.

### C. Government-Credible UI Console (`src/interface/admin/DataQualityConsole.tsx`)

- Styled with official Maharashtra state design tokens (Section 21.4).
- Prominently displays the Section 25.3 synthetic demonstration data disclaimer banner.
- Features real-time reliability score gauge, category filter tabs, severity badges, and structured evidence drawers.
- Provides interactive operator resolution gate with justification notes.
- Registered on direct route `/data-quality` and integrated into `WorkQueueNavigator` as `Q-08: Data Quality & Anomaly Radar`.

---

## 3. Empirical Verification Evidence

```bash
# Unit & Contract Tests
npx playwright test tests/unit/dataQualityAnomalyDetection.spec.ts tests/contract/dataQualityAnomalyFlow.spec.ts

Running 14 tests using 1 worker
  14 passed (3.1s)
```

```bash
# TypeScript Compile Verification
npx tsc --noEmit
# Exit code: 0 (0 errors)
```

---

## 4. Acceptance Criteria & Invariants Met

- ✅ **No Auto-Accusation:** Ambiguous or flagged records produce an auditable flag with an evidence trail, routed to a human operator queue.
- ✅ **Complete Anomaly Taxonomy:** All 5 classes named in Master Spec Section 20 are implemented and tested.
- ✅ **Section 25.3 Compliant:** Synthetic demonstration dataset notice displayed on every operator view.
- ✅ **Audit Trail Preserved:** Every issue resolution logs operator identity, timestamp, and review rationale.
