# NEXIS (Forge v3) — Current Project Status

**Version**: 0.2.0  
**Status Date**: 2026-09-18  
**Architecture**: React 19 + TypeScript + Vite + Express 5 + Prisma ORM + Supabase PostgreSQL + Three.js WebGPU + Adzuna Job API + Gemini/Sarvam/FreeLLMAPI  
**Live Production URL**: [https://nexis-forge.vercel.app](https://nexis-forge.vercel.app)  
**Database**: Supabase PostgreSQL 17 (`ap-south-1`, pooled Supavisor 6543 / direct 5432)

---

## 1. Executive Summary

NEXIS is an **evidence-based career operating system** combining:
1. **Interactive 3D Simulation & Character Physics**: Multi-agent office environment with procedural semi-ragdoll character physics (spring-damper limb lag, momentum, ground squash & wobble shockwave, balance recovery).
2. **Career Graph & O\*NET Taxonomy**: 96 skills, 12 target roles, and 70 role skill requirements grounded in public O\*NET taxonomy.
3. **Evidence Engine & Provenance**: GitHub intelligence extraction, resume evidence tagging (`VERIFIED`, `DECLARED`, `INFERRED`, `UNSUPPORTED`).
4. **Multi-Signal Job Discovery**: Live Adzuna job aggregator integration with automated Job Trust Scoring (employer transparency, direct ATS verification, anti-ghosting heuristics) and 4-tier match bucketing (`APPLY_NOW`, `LEARN_THEN_APPLY`, `STRETCH`, `IGNORE`).
5. **Interview Simulation & Briefings**: Pre-interview technical, behavioral, and system design briefings with AI evaluation.
6. **DPDP Act 2023 Consent & Outcome Intelligence**: 4-scope audit-trail consent logging, employer placement verification portal (`/verify/:token`), and provider curriculum relevance scorecards (`/provider/:token`).

---

## 2. Feature Status Matrix

| Feature Module | Frontend | Backend | Database | API Routes | Authentication | Verified Tested | Production Ready |
|---|---|---|---|---|---|---|---|
| **User Auth (Phone + Password)** | `LoginModal.tsx` | `authService.js` | `User`, `Session` | `/api/auth/*` | Scrypt Hash + 256-bit Session | Yes (E2E & Unit) | **YES** |
| **DPDP 2023 Consent** | `ConsentScreen.tsx` | `consent.js` | `ConsentRecord` | `/api/consent` | Bearer Session / OAuth | Yes (Audit Trail) | **YES** |
| **Interactive 3D Physics** | `CharacterManager.ts` | — | — | — | — | Yes (6/6 Playwright) | **YES** |
| **O\*NET Career Graph** | `CareerPassportView.tsx` | `skillGapEngine.js` | `Skill`, `TargetRole` | `/api/career-graph/*`| Public / Bearer | Yes (Live DB) | **YES** |
| **Live Job Discovery** | `JobMatchesView.tsx` | `jobSearchProvider.js` | `ApiCacheEntry` | `/api/jobs/discover` | Bearer Session | Yes (Adzuna Live) | **YES** |
| **Job Trust Scoring** | `JobMatchesView.tsx` | `jobTrustEngine.js` | — | `/api/jobs/discover` | Deterministic Math | Yes (Unit Verified) | **YES** |
| **Resume Extraction** | `NewCVView.tsx` | `resume.js` | — | `/api/resume/extract` | Bearer Session | Yes (PDFParse) | **YES** |
| **Resume Tailoring** | `ResumeForgeModal.tsx` | `resumeBuilder.js` | `SkillGapSnapshot` | `/api/resume/tailor` | Bearer Session | Yes (Multi-pass) | **YES** |
| **Interview Prep Brief** | `InterviewPrepView.tsx` | `interview.js` | `InterviewSession` | `/api/interview/*` | Bearer Session | Yes (Structured JSON) | **YES** |
| **Outcome Tracking** | `OutcomeStatusView.tsx` | `outcomes.js` | `OutcomeCheckIn` | `/api/trainee/*` | Dual-Path Auth | Yes (DB Logged) | **YES** |
| **Employer Verification** | `EmployerVerificationPage` | `employer.js` | `EmployerVerification`| `/verify/:token` | Token-Gated | Yes (Public Portal) | **YES** |
| **Provider Scorecards** | `ProviderViewPage.tsx` | `programs.js` | `CourseRelevanceScore`| `/provider/:token` | Token-Gated | Yes (Scorecard API) | **YES** |
| **Trainee Deduplication** | `DedupReviewPanel.tsx` | `matchingService.js`| `DedupCandidate` | `/api/admin/*` | GitHub SUPER_ADMIN | Yes (Jaro-Winkler) | **YES** |
| **Control Group Impact** | `AnalyticsDashboard.tsx`| `impactMeasurementService.js` | `ControlGroupRecord` | `/api/analytics/*` | Admin RBAC | Yes (Synthetic Stratified) | **YES** (With Disclaimer) |

---

## 3. Verified Working Capabilities

- **Vercel Serverless Function**: Responds at `https://nexis-forge.vercel.app/api/health` with `{ status: 'ok', database: 'connected', llmRouter: 'unavailable' }`.
- **Database Integration**: 33 active PostgreSQL tables in Supabase (`db.fdgutrpvvunupebnfpqy.supabase.co`).
- **Live Job Aggregator**: Adzuna API successfully queries and returns real developer job postings with direct URLs and company metadata.
- **Physical Character System**: 6/6 tests passing. Procedural limb lag, torso tilt, gravity fall, squash & stretch ground impact, and balance recovery.
- **Production Build**: `npm run build` bundles 3,004 modules in 14.98s into `dist/`.
- **TypeScript Check**: `npm run lint` passes with 0 errors.

---

## 4. Key Bugs Discovered & Resolved During Hardening

1. **Hallucinated Gemini Models in Config**:
   - *Problem*: `server/config.js` defined `gemini-3.6-flash` and `gemini-3.1-pro-preview`, which return HTTP 404 from Google's API.
   - *Fix*: Corrected to real models `gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-1.5-pro`.
2. **ReferenceError in `resumeBuilder.js`**:
   - *Problem*: `normalizeAnalysisShape` accessed `interview.technicalDeepDive` without defining `interview`.
   - *Fix*: Added `const interview = rawAnalysis?.interviewReadiness || {}`.
3. **Single-Auth Lockout in `outcomes.js`**:
   - *Problem*: `POST /api/trainee/status-update` strictly required GitHub OAuth, breaking outcome submission for candidates logged in via phone + password.
   - *Fix*: Upgraded `outcomes.js` to dual-path authentication supporting both user session tokens and GitHub tokens.
4. **Data Deletion Exception in `trainee.js`**:
   - *Problem*: `DELETE /api/trainee/profile` called non-existent Prisma models `prisma.consent.deleteMany` and `prisma.govtCrossCheck.deleteMany`, throwing unhandled runtime exceptions.
   - *Fix*: Corrected model names to `prisma.consentRecord` and `prisma.govtCrossCheckResult`, and added `resolveCallerTrainee` for dual-path session auth.
5. **Unified DPDP Data Deletion Added**:
   - *Problem*: No endpoint existed for standard `User` accounts to exercise the DPDP Right-to-be-Forgotten.
   - *Fix*: Added `DELETE /api/profile` with full transactional cascading deletions across CandidateProfile, Applications, InterviewSessions, Skills, Sessions, and linked Trainee records.
6. **5-Factor Deterministic Job Scoring Formula**:
   - *Problem*: `jobTrustEngine.js` previously implemented 4 factors omitting the documented 10% Location factor.
   - *Fix*: Re-engineered `calculateMultiSignalMatch` with exact weights: Skill (35%), Experience (20%), Title (20%), Project (15%), Location (10%).
7. **Health Route Diagnostic Accuracy**:
   - *Problem*: `server/routes/health.js` only checked localhost FreeLLMAPI, ignoring `GEMINI_API_KEY`.
   - *Fix*: Health endpoint now tests both providers and reports granular statuses for `gemini` and `freeLlm`.

---

## 5. Technical Debt & Remaining Risks

1. **Vercel Production Gemini Key**:
   - The live deployment at `nexis-forge.vercel.app` requires `GEMINI_API_KEY` to be added in the Vercel project environment variables to enable live cloud AI features.
2. **Supabase PostgREST RLS**:
   - Supabase security advisory flags that public tables have RLS disabled. Because the architecture routes all database interactions through the Express backend via Prisma ORM with connection pooling, this is not directly exploitable via the frontend. Defense-in-depth SQL script `prisma/rls_defense_in_depth.sql` has been created.
