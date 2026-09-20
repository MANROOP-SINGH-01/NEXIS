# NEXIS — Implementation Inspiration & Architectural Mapping

**Document Status:** Formal Audit Trace  
**Date:** September 20, 2026  
**Purpose:** Maps externally researched patterns, algorithms, and architectures to specific NEXIS implementation modules.

---

## 1. External Architecture → NEXIS Implementation Map

| External Repository | Concept / Architectural Pattern | NEXIS Target Feature | NEXIS Implementation Location | Engineering Rationale |
|---|---|---|---|---|
| `Mohit-Sable/...` (MSOL) | **Claimed-vs-Verified Gap as Headline Metric** ("82% claimed vs 41% verified 90-day retention") | SIH Opening Beat & Executive KPI | `src/interface/admin/AnalyticsDashboard.tsx` & `server/services/analyticsService.js` | Immediately communicates the core failure of existing reporting systems: provider-reported claims collapse under longitudinal verification. |
| `Tanish200-ind/SIH26135` | **Deterministic Centralized Analytics Ratios** (single mathematical ratio module without ML bias) | Provider & District Analytics Engine | `server/services/analyticsService.js` & `server/routes/analytics.js` | Prevents divergent formulas across frontend and backend; ensures every KPI exposes sample size and denominator. |
| `Tanish200-ind/SIH26135` | **Universal Synthetic Demonstration Data Labeling** | Demo Data Disclosure System | `src/interface/primitives/SyntheticDataBadge.tsx` across all views | Strict ethical standard and judge credibility: never misrepresent synthetic demonstration data as official government statistics. |
| `meaaditya07/SIH26135` (SkillTrace AI) | **Finite State Machine Guards for Application & Livelihood Transitions** | Longitudinal Outcome State Machine | `server/services/outcomeService.js` & `src/types.ts` | Eliminates illegal status skips; enforces valid state sequences (`CERTIFIED → SEEKING_WORK → EMPLOYED → RETAINED`, etc.) with transition audit records. |
| `meaaditya07/SIH26135` (SkillTrace AI) | **Pure Byte-Building Report Export Center** (DB-agnostic CSV/PDF/JSON builders) | Government & Provider Export Center | `server/services/exportService.js` & `server/routes/reports.js` | Enables district and state administrators to export reproducible evidence tables without taxing database connection pools. |
| `meaaditya07/SIH26135` (SkillTrace AI) | **Multichannel Notification Templates & Queue Workers** | Follow-Up Scheduler & Escalation Queue | `server/services/followupService.js` & `server/routes/followups.js` | Decouples follow-up checkpoint triggers (T+30, T+90, T+180, T+365) from channel delivery adapters (SMS, WhatsApp, Assisted Call). |
| `Shreyas25869/...` | **17-Table Data Model with Granular Role Scoping** | Additive Prisma Data Model & Row-Level Authorization | `prisma/schema.prisma` & `server/middleware/authMiddleware.js` | Clean separation between identity, verification evidence, and outcome events with strict server-side scoping. |
| `moj-analytical-services/splink` | **Probabilistic Record Linkage via Fellegi-Sunter Model** | Trainee Identity Deduplication & Drift Resolution | `services/splink-service/` & `src/interface/admin/DedupReviewPanel.tsx` | Resolves duplicate trainee records when phone numbers or addresses change, without sending PII to LLMs or relying on Aadhaar. |
| `AnasAito/SkillNER` & ESCO | **Structured Token Matching with Exact Span Offsets** | Explainable Skill Extraction & Gap Grounding | `server/services/skillEngine.js` & `server/routes/skills.js` | Fixes the "unrealistic skill gap" defect by ensuring every extracted skill has a mandatory non-null `sourceSpan` and recognized taxonomy ID. |

---

## 2. Rejection Register (Concepts Deliberately Rejected)

| External Concept | Source Repository | Reason for Rejection in NEXIS |
|---|---|---|
| **Black-box Placement Probability Model** (scikit-learn GradientBoosting) | `meaaditya07/SIH26135`, `Mrinal444/skilloutcome` | SIH judges will have seen multiple generic prediction dashboards. Point predictions fail to explain *why* a trainee is struggling and offer zero remediation. NEXIS builds a deterministic root-cause taxonomy instead. |
| **Aadhaar-centric Universal Identity** | Various proposal decks | Legal and data-sovereignty restrictions: NEXIS has no statutory authority to store or process raw Aadhaar numbers under DPDP. NEXIS uses stable pseudonymous `publicId` with probabilistic contact linkage. |
| **Web-Scraping Job Harvesters** (BeautifulSoup / Playwright scraping LinkedIn/Indeed) | Various SIH scrapers | Scraping external portals violates Terms of Service, introduces fragile brittle DOM dependencies, and breaks on live demos. NEXIS uses the official, attributed Adzuna API. |
| **Blockchain Credential Ledger** | Multiple SIH brainstorms | Adds unnecessary transaction overhead, gas fees, and key-management failure modes without addressing the actual problem (identity drift and lack of post-training employer reporting). |
