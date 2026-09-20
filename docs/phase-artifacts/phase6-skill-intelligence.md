# Phase 6 Artifact: Skill Intelligence Engine, sourceSpan Grounding & Defect #3 Remediation

**Specification Reference:** Master Implementation Spec Section 5.3 (Defect #3), Section 14.5, Section 17.1–17.5, Phase 6  
**Implementation Branch:** `feat/sih26135-master-implementation`  
**Execution Date:** September 2026  
**Verification Baseline:** 145 passing automated tests (101 unit tests + 44 contract tests), 0 lint errors, full browser UI validation  

---

## 1. Executive Summary & Defect #3 Remediation

In the initial baseline audit (Phase 0), **Defect #3** was confirmed: Nexus-Strategist skill-gap outputs were perceived as unrealistic by trainees and administrators because:
1. Gaps were synthesized as opaque, ungrounded natural-language paragraphs without verifiable evidence.
2. Skills lacked character-offset `sourceSpan` grounding, meaning extracted skills could not be traced back to verbatim candidate source text or third-party proof.
3. Statistics were presented as phantom floating percentages (e.g. "73% match") with no stated denominator or context.
4. There was no structured hierarchy of evidence classes to differentiate verified assessments from ungrounded claims.

**Phase 6 directly eliminates Defect #3** by replacing unstructured LLM generation with a deterministic, explainable, and multi-tier skill intelligence engine:
- **7-Class Evidence Hierarchy:** Strictly calibrated from High Strength (`ASSESSMENT_SCORE` at 0.95, `EMPLOYER_CONFIRMED_USE` at 0.90) down to Low Strength (`SELF_REPORT` at 0.35, `UNVERIFIED` at 0.15).
- **Mandatory `sourceSpan` Character Bounds:** Invariant enforced at the API and engine levels requiring every extracted skill claim to carry non-null character boundaries `{ start: number, end: number, text: string }` where `text.slice(start, end).toLowerCase() === sourceSpan.text.toLowerCase()`. Any ungrounded LLM inference without a source span is strictly rejected per Section 17.2.
- **Stated Denominators:** Every match and gap is anchored in explicit denominators (e.g., `4 of 8 required skills (50.0%)`, `Required in 475 of 500 target postings (95.0%)`).
- **Section 25.3 Synthetic Dataset Transparency:** When calculated against reference benchmark data, all ratios and metrics are explicitly labeled with `syntheticDataset: true` and official MSInS / O*NET 2026 dataset attribution banners.
- **NSQF & ESCO Crosswalk with Local Languages:** Mapped to official Qualification Packs (`SSC/Q0501`, `SSC/Q0503`, `ELE/Q0101`, `AUR/Q0102`) with English, Marathi (`मराठी`), and Hindi (`हिंदी`) metadata.

---

## 2. Technical Architecture & Component Deliverables

```
                               ┌────────────────────────────────────────────────────────┐
                               │                 Candidate Input Text                   │
                               │           (Resume, JD, or Assessment)                  │
                               └──────────────────────────┬─────────────────────────────┘
                                                          │
                                                          ▼
                               ┌────────────────────────────────────────────────────────┐
                               │           server/services/skillEngine.js               │
                               │        extractSkillsFromText() + Invariants            │
                               │  • Exact character boundary offsets [start, end]       │
                               │  • 7-Class evidence strength resolution                │
                               │  • Strict rejection of ungrounded text claims          │
                               └──────────────────────────┬─────────────────────────────┘
                                                          │
                                                          ▼
┌──────────────────────────────────────┐       ┌────────────────────────────────────────┐
│   server/services/skillTaxonomy.js   │◄─────►│    computeSkillGaps() Evaluator        │
│ • NSQF Levels (1-10)                 │       │ • Grounded Rationale Matrix            │
│ • Qualification Packs (IT & Voc.)    │       │ • Stated Denominators (X/Y, Z%)        │
│ • ESCO EUPL Crosswalk references     │       │ • Curated Free Govt Interventions      │
│ • Multilingual (EN, MR, HI)          │       │ • Synthetic Benchmark Tagging          │
└──────────────────────────────────────┘       └──────────────────┬─────────────────────┘
                                                                  │
                                 ┌────────────────────────────────┴────────────────────────────────┐
                                 ▼                                                                 ▼
               ┌───────────────────────────────────┐                             ┌───────────────────────────────────┐
               │       server/routes/skills.js     │                             │  src/interface/skills/            │
               │ • POST /api/skills/extract        │                             │    SkillGapsView.tsx              │
               │ • POST /api/skills/gap-analysis   │                             │ • Interactive Evidence Badges     │
               │ • POST /api/skills/evidence       │                             │ • Character-level Span Inspector  │
               │ • GET /api/skills/taxonomy        │                             │ • Denominator-Grounded Panels     │
               │ • GET /api/skills/occupations     │                             │ • Multilingual EN/MR/HI Toggle    │
               └───────────────────────────────────┘                             └───────────────────────────────────┘
```

### 2.1 Backend Services
1. `server/services/skillTaxonomy.js`:
   - Catalog of 14+ standardized competencies across IT and Maharashtra industrial sectors.
   - Standard Target Occupations: `SSC/Q0501` (Software Developer), `SSC/Q0503` (Full Stack Developer), `SSC/Q0901` (Cloud/DevOps), `ELE/Q0101` (Solar PV Technician), `AUR/Q0102` (CNC Machinist).
   - Multilingual labels (`name`, `marathiLabel`, `hindiLabel`) and ESCO URIs.
2. `server/services/skillEngine.js`:
   - `extractSkillsFromText(text, sourceType)`: Deterministic extraction preserving character-accurate slices.
   - `validateSkillClaim(claim, rawText)`: Enforces invariant slice equality and rejects missing spans.
   - `computeSkillGaps({ traineeId, targetOccupationId, resumeText, ... })`: Computes structured gaps with stated denominators and curated government learning interventions (SWAYAM, NPTEL, Skill India Digital Hub, MSSDS).
3. `server/lib/resilienceStore.js`:
   - Dual-store resilience for skills, target occupations, and `TraineeSkillEvidence`.
4. `server/routes/skills.js`:
   - Mounted `POST /api/skills/extract`, `POST /api/skills/gap-analysis`, `POST /api/skills/evidence`, `GET /api/skills/taxonomy`, `GET /api/skills/occupations`.
5. `server/routes/resume.js`:
   - Enriched `/resume/tailor` so that both AI optimization and truth-preserving fallback return grounded skill intelligence.

### 2.2 Frontend Interface
1. `src/interface/skills/SkillGapsView.tsx` (re-exported via `src/interface/SkillGapsView.tsx`):
   - **Gap Matrix & Denominators Tab**: Visualizes coverage ratio, gap cards with exact frequency denominators (`Required in 475 of 500 target postings (95%)`), evidence badges, and free course enroll links.
   - **Source Span Inspector Tab**: Interactive badge list displaying character ranges (e.g. `[100, 106]`); clicking highlights verbatim text in preview buffer with `INVARIANT VERIFIED` badge.
   - **NSQF / ESCO Crosswalk Tab**: Full matrix table with English, Marathi, Hindi translations, and ESCO URIs.
   - **Multilingual Switcher**: Instant switching between English, Marathi (`मराठी`), and Hindi (`हिंदी`).

---

## 3. Empirical Verification Results

### 3.1 Unit Testing (`tests/unit/skillIntelligence.spec.ts`)
- **Total Unit Tests:** **101 / 101 PASSED** (10 new Phase 6 tests).
- Verified taxonomy completeness (NSQF, ESCO, MR, HI).
- Verified deterministic extraction and verbatim `sourceSpan` bounds.
- Verified strict rejection of ungrounded claims lacking `sourceSpan`.
- Verified stated-denominator calculation and priority ordering.
- Verified descending 7-class evidence confidence hierarchy.

### 3.2 Contract Testing (`tests/contract/skillsFlow.spec.ts` & full contract suite)
- **Total Contract Tests:** **44 / 44 PASSED** (8 new Phase 6 tests across 5 suites).
- `GET /api/skills/ping`: Returns operational probe with all 7 evidence classes.
- `GET /api/skills/taxonomy`: Returns catalog with multilingual and NSQF metadata.
- `GET /api/skills/occupations`: Returns target occupations list.
- `GET /api/skills/occupations/:id`: Returns competency matrix.
- `POST /api/skills/extract`: Rejects empty text with 400; returns extracted skills with mandatory `sourceSpan`.
- `POST /api/skills/gap-analysis`: Produces structured gaps with stated denominators and synthetic dataset tagging.
- `POST /api/skills/evidence`: Rejects `RESUME_MENTION` missing `sourceSpan` with 422; records valid evidence with 201.

### 3.3 TypeScript Compilation & Linting
- `npm run lint` (`tsc --noEmit`): **0 ERRORS**.

### 3.4 Browser Verification & Visual Artifacts
- Browser Subagent successfully authenticated as Demo Candidate, navigated to `http://localhost:3000`, clicked the `Skill Gaps` tab, inspected all 3 tabs, and captured screenshots:
  - `gap_matrix_denominators_1789902572476.png`: Shows Target Coverage Ratio, 7-class evidence badges, and stated denominators.
  - `skill_gaps_interface_1789902526385.png`: Shows NSQF/ESCO crosswalk and multilingual labels.
  - Session recording WebP: `phase6_skill_intelligence_view_1789902235493.webp`.

---

## 4. Acceptance Criteria Compliance Checklist

| Requirement | Spec Section | Status | Verification Evidence |
|---|---|---|---|
| Fix unrealistic skill-gap output | Section 5.3 (#3), 17.3 | **RESOLVED** | Every gap returned has structured properties, stated denominators, and evidence classes. |
| 7 evidence classes implemented | Section 17.2 | **RESOLVED** | `ASSESSMENT_SCORE` (0.95) to `UNVERIFIED` (0.15) calibrated and tested. |
| Mandatory non-null `sourceSpan` | Section 13.4, 14.5 | **RESOLVED** | Enforced at API layer; invariant slice verified; ungrounded claims rejected with 422. |
| Stated denominators required | Section 14.5, 17.3 | **RESOLVED** | Returned as explicit string ratios (e.g. `X of Y required skills (Z%)`). |
| Synthetic dataset disclaimer | Section 25.3 | **RESOLVED** | Labeled with `syntheticDataset: true` and MSInS/O*NET 2026 attribution banner. |
| NSQF & ESCO crosswalk with EN/MR/HI | Section 17.5 | **RESOLVED** | Full catalog populated and exposed via `/api/skills/taxonomy`. |
| Zero regression on baseline | Section 14.7 | **RESOLVED** | All 145 unit and contract tests passing; zero lint errors. |

---

## 5. Conclusion & Transition to Phase 7

Phase 6 is fully completed with zero regressions and complete empirical evidence. NEXIS now possesses a grounded, explainable skill intelligence engine that guarantees data integrity, DPDP compliance, and transparent career progression analytics for Maharashtra's trainees and skill officers.

Next Phase: **Phase 7 — Adzuna Job Intelligence (Defect #2 Fix)**.
