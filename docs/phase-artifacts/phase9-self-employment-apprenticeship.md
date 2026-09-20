# Phase 9 — Self-Employment, Apprenticeship & Outcome States

## 1. Executive Summary
- **Phase Objective**: Extend the longitudinal outcome state machine to fully encompass informal livelihoods, micro-enterprises, self-employment, family businesses, and formal National Apprenticeship Promotion Scheme (NAPS) conversions without forcing formal corporate payroll schemas.
- **Status**: **COMPLETE & EMPIRICALLY VERIFIED**
- **Verification Evidence**:
  - **Unit Tests**: 122 / 122 PASSED (`tests/unit/selfEmploymentApprenticeship.spec.ts` + regression suite).
  - **Contract Tests**: 58 / 58 PASSED (`tests/contract/selfEmploymentApprenticeshipFlow.spec.ts` + regression suite).
  - **Type Checking**: 0 TypeScript errors (`tsc --noEmit`).

---

## 2. Specification Compliance Matrix

| Requirement | Specification Section | Implementation Details | Status |
| :--- | :--- | :--- | :--- |
| **15-State Outcome State Machine** | Section 2.4, 19.1 | Implemented complete 15-state taxonomy: `ENROLLED`, `TRAINING`, `DROPOUT`, `ASSESSMENT_PASSED`, `CERTIFIED`, `SEEKING_WORK`, `PLACED`, `APPRENTICESHIP`, `APPRENTICESHIP_CONVERSION`, `SELF_EMPLOYED`, `FREELANCE`, `GIG_WORK`, `HIGHER_EDUCATION`, `UNEMPLOYED`, `INACTIVE`. | **VERIFIED** |
| **Legacy & Alias Normalization** | Section 19.1 | Transparent normalization handles common synonyms (`EMPLOYED` $\to$ `PLACED`, `APPRENTICE` $\to$ `APPRENTICESHIP`, `CONVERSION` $\to$ `APPRENTICESHIP_CONVERSION`, `FREELANCER` $\to$ `FREELANCE`, `GIG` $\to$ `GIG_WORK`, `SEARCHING` $\to$ `SEEKING_WORK`, `DROPPED_OUT` $\to$ `DROPOUT`). | **VERIFIED** |
| **Self-Employment & Enterprise Types** | Section 2.4, 19.1 | Captured diverse enterprise categories (`MICRO_ENTERPRISE`, `SOLO_PRACTICE`, `FAMILY_BUSINESS`, `COOPERATIVE`, `INFORMAL_TRADE`) and standardized wage bands (`LESS_THAN_10K`, `10K_TO_15K`, `15K_TO_25K`, `25K_TO_40K`, `ABOVE_40K`). | **VERIFIED** |
| **Udyam Verification Elevation** | Section 19.1 | If candidate provides a valid Udyam registration number, the outcome record is automatically elevated from `SELF_REPORTED` (0.60 confidence) to `DOCUMENT_VERIFIED` (0.85 confidence). | **VERIFIED** |
| **NAPS Apprenticeship Conversion** | Section 19.1 | Direct linkage recording transition from formal apprenticeship to salaried staff, automatically setting source to `NAPS_PORTAL`, confidence to 0.95, and verification status to `THIRD_PARTY_VERIFIED`. | **VERIFIED** |
| **Endpoints Mounted** | Section 14.7 | `POST /api/outcomes/self-employment` and `POST /api/outcomes/apprenticeship-conversion` mounted with DPDP consent verification (`OUTCOME_TRACKING` purpose). | **VERIFIED** |

---

## 3. Files Modified & Added

### Backend
1. `server/services/outcomeService.js`:
   - Added canonical `VALID_EVENT_TYPES` (15 states).
   - Added `ENTERPRISE_TYPES` and `WAGE_BANDS` registries.
   - Added `normalizeEventType()` alias resolver.
   - Implemented `recordSelfEmploymentOutcome()` with Udyam verification elevation.
   - Implemented `recordApprenticeshipConversion()` linking apprentice contracts to permanent employment.
2. `server/routes/outcomes.js`:
   - Added `POST /api/outcomes/self-employment` endpoint with DPDP consent guard.
   - Added `POST /api/outcomes/apprenticeship-conversion` endpoint with DPDP consent guard.
   - Updated `GET /api/outcomes/ping` probe to expose supported event types, enterprise types, and wage bands.

### Test Suites
1. `tests/unit/selfEmploymentApprenticeship.spec.ts`:
   - 7 unit tests covering normalization, Udyam elevation, wage band validation, NAPS conversion attributes, and invalid input rejection.
2. `tests/contract/selfEmploymentApprenticeshipFlow.spec.ts`:
   - 4 contract tests verifying ping payload, 401 unauthenticated security guards, end-to-end self-employment recording with Udyam verification, and end-to-end NAPS apprenticeship conversion flow.

---

## 4. Empirical Verification Results
- `npm test`: **122 / 122 PASSED** (26.6s)
- `npx playwright test tests/contract`: **58 / 58 PASSED** (1.2m)
- `tsc --noEmit`: **0 ERRORS**
- Legacy baseline functionality (Trainee OTP, GitHub OAuth admin RBAC, 3D Office, CV builder, Nexus agents) preserved with 100% test compatibility.
