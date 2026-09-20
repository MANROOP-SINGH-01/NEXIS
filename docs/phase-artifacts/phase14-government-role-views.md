# Phase 14 — Government Dashboard & Role Views

## 1. Executive Summary
- **Phase Objective**: Implement Master Spec Section 7 (User Personas), Section 14.6, Section 20 (Analytics & Dashboards), Section 21.2 (Role-specific Information Architecture), Section 22.4 (Row-Level Security Controls), and Section 27 (Phase 14): Government Dashboard & Role Views.
- **Architectural Delivery**:
  1. **Server-Side Row-Level Scoping**: Enforced in `server/services/roleViewsService.js` and `server/routes/roleViews.js`. District Officers are scoped to their assigned district(s); candidates are barred from confidential statewide data (HTTP 403); state administrators have full 36-district oversight.
  2. **District Officer Intelligence View**: Real-time demand-supply imbalance ratio, trade-level deficits (e.g. CNC Machine Operator, Solar PV Installer, Agri-Cold-Chain Operator), district-level remedial intervention queues, and local training provider comparisons with 95% Wilson/Wald confidence intervals.
  3. **Statewide Policy & Portfolio View**: Cross-programme monitoring across PMKVY 4.0, MSSDS (Pramod Mahajan Abhiyan), NAPS 2.0, and Mahaswayam; 36-district acute deficit vs. surplus demand disparity index; equity and demographic indicators (gender ratio, rural share, tribal coverage with sample sizes $N$).
  4. **Policy What-If Simulator (Section 9 & 20)**: Interactive scenario modeling calculating projected livelihoods and 90-day retention uplifts from budget expansions, seat reallocations to deficit trades, and T+90 employer verification mandates.
  5. **Section 20 Anti-Fabrication Invariant**: Every simulator output is strictly flagged with `isSimulation: true` and the prominent disclaimer: `"Assumption-driven policy simulation — not observed historical statistics"`.
  6. **Employer Hiring Demand Signals**: Endpoints enabling employers to publish vacancies, required skills, and wage brackets directly to the state skilling pipeline.
- **Status**: **COMPLETE & EMPIRICALLY VERIFIED**
- **Verification Evidence**:
  - **Unit Tests**: 5 / 5 PASSED (`tests/unit/governmentRoleViews.spec.ts`; 175/175 suite total).
  - **Contract Tests**: 6 / 6 PASSED (`tests/contract/governmentRoleViewsFlow.spec.ts`; 87/87 suite total).
  - **Type Checking**: 0 TypeScript errors (`npx tsc --noEmit` exited 0).

---

## 2. Role Personas Compliance Matrix (Section 7 & 21.2)

| Persona | Allowed Scope | Delivered API Endpoints & Capabilities | Status |
| :--- | :--- | :--- | :--- |
| **District Officer** | Assigned district only (row-level clamped) | `GET /api/role-views/district-officer?district=Pune`: Imbalance ratio, trade deficits, remedial queue, local provider comparisons with 95% CI. | **VERIFIED** |
| **State Administrator / Analyst** | Statewide (all 36 Maharashtra districts) | `GET /api/role-views/state-policy`: Cross-scheme portfolio (PMKVY, MSSDS, NAPS, Mahaswayam), 36-district disparity index, equity metrics. | **VERIFIED** |
| **Policy Planner** | Statewide simulation model | `POST /api/role-views/policy-simulator`: Scenario analysis with capacity elasticity and assumption disclaimers. | **VERIFIED** |
| **Employer** | Employer profile & hiring signals | `GET/POST /api/role-views/employer/demand-signals`: Register vacancy counts, wage brackets, and required skills. | **VERIFIED** |
| **Candidate / Trainee** | Own records only | Row-level protection prevents unauthorized access to state/district dashboards (HTTP 403 Forbidden). | **VERIFIED** |

---

## 3. Files Modified & Added

### Backend Engine & Routes
1. `server/services/roleViewsService.js` (NEW):
   - Persona resolution with server-side row-level security (`resolveUserRoleScope`).
   - District officer intelligence synthesizer (`getDistrictOfficerView`).
   - Statewide policy aggregator (`getStatePolicyView`).
   - Mathematical scenario analyzer (`runPolicySimulator`) with Section 20 assumption disclaimer invariant.
   - Employer demand signal ledger (`registerEmployerDemandSignal`, `getEmployerDemandSignals`).
2. `server/routes/roleViews.js` (NEW):
   - Express router mounted at `/api/role-views`.
   - Endpoints: `/ping`, `/me`, `/district-officer`, `/state-policy`, `/policy-simulator`, `/employer/demand-signals`.
3. `server/index.js` (MODIFIED):
   - Mounted `roleViewsRoutes` at `/api/role-views`.

### Tests
1. `tests/unit/governmentRoleViews.spec.ts` (NEW):
   - 5 unit tests verifying row-level access boundaries, district scoping, statewide portfolio aggregation, policy simulator math, and employer demand signals.
2. `tests/contract/governmentRoleViewsFlow.spec.ts` (NEW):
   - 6 contract tests verifying live HTTP endpoints, row-level restriction, role scoping, policy simulator disclaimer invariant, and employer demand signal flows.

---

## 4. Empirical Verification Results

```
Unit Tests: 175 passed (11.8s)
Contract Tests: 87 passed (1.6m)
Type Check: npx tsc --noEmit -> 0 errors
```
