# NEXIS — Public Repository Landscape & Competitive Intelligence

**Document Status:** Formal Research Synthesis  
**Date:** September 20, 2026  
**Problem Statement:** SIH26135 — "Difficulties in tracking employment outcomes, skill gaps, and the impact of skilling initiatives"  
**Sponsor:** Government of Maharashtra (MSIS / Skill Department)  

---

## 1. Executive Summary

A comprehensive GitHub search for SIH26135 and skilling outcome systems yielded **18 publicly discoverable repositories** targeting SIH26135, along with primary domain frameworks for identity deduplication (`Splink`) and skill extraction (`SkillNER`, `ESCO`).

The primary competitor pattern across SIH26135 entries is an **ML-prediction dashboard** (predicting placement or attrition probability using scikit-learn/RandomForest/GradientBoosting) or a standard reporting interface. 
Virtually **none of the competing teams** have built:
1. A multi-level **evidence-provenance ledger** separating self-reported, employer-confirmed, and document-backed claims.
2. A **DPDP-aligned granular consent management system** with enforceable withdrawal gates.
3. An **interactive 3D orchestration and agent simulation environment** (the NEXIS 3D Office).
4. An **append-only longitudinal outcome event stream** with transition preservation.

---

## 2. Comprehensive Repository Inventory

| # | Repository & Owner | Primary Focus / Description | License | Relevance | Cloned / Analyzed |
|---|---|---|---|---|---|
| 1 | `Tanish200-ind/SIH26135` | Deterministic skilling intelligence platform; FastAPI + SQLite + React; no-ML stance with exact ratio formulas. | MIT / Unlicensed | **HIGH** | Cloned & Inspected |
| 2 | `meaaditya07/SIH26135` | SkillTrace AI: FastAPI + Next.js 14 + Celery/Redis; hiring pipeline states (`applied → shortlisted → interview → offered → hired`), export center, placement model. | Unlicensed | **HIGH** | Cloned & Inspected |
| 3 | `Abhinav-Sachan/skillsetu-sih26135` | SkillSetu: AI longitudinal skilling outcomes platform; trainee portfolio, assessment tracking. | Unlicensed | **MEDIUM** | Cloned & Inspected |
| 4 | `CodewithBhakti/SIH26135-SkillTrace-AI` | SkillTrace AI mirror: longitudinal tracking, skill gap metrics, policy insights. | Unlicensed | **MEDIUM** | Cloned & Inspected |
| 5 | `marthdholariya/Hexcore-sih` | Hexcore: Node-style backend, employment simulator, KPI dashboards. | Unlicensed | **MEDIUM** | Cloned & Inspected |
| 6 | `sahooarnav2007-gif/proj2` | Skill Sync: Enterprise-grade attrition prediction via Random Forest, multi-channel outreach. | Unspecified | **MEDIUM** | Research Reference |
| 7 | `Mohit-Sable/...` | MSOL: "82% TPO-claimed vs 41% verified 90-day retention" headline metric; APAAR-linked skill passport. | Unspecified | **HIGH** | Research Reference |
| 8 | `prav99n-34/Skillark1` | SKILLARC: Flask/Jinja2/SQLite with 140+ synthetic trainees and role-scoped views. | Unspecified | **MEDIUM** | Research Reference |
| 9 | `Shreyas25869/...` | SIH-26135: 17-table Postgres schema with Row Level Security (RLS). | Unspecified | **HIGH** | Research Reference |
| 10 | `Mrinal444/skilloutcome` | Calibrated placement/attrition models with chronological train/test splits. | Unspecified | **HIGH** | Research Reference |
| 11 | `moj-analytical-services/splink` | Probabilistic record linkage using Fellegi-Sunter statistical model (UK Ministry of Justice). | **MIT** | **HIGH** | Cloned & Inspected |
| 12 | `AnasAito/SkillNER` | NLP skill extractor based on Lightcast (EMSI) and Spacy taxonomies. | **MIT** | **HIGH** | Cloned & Inspected |
| 13 | `KonstantinosPetrakis/esco-skill-extractor` | Transformer embeddings against ESCO taxonomies. | All-Rights-Reserved | **REFERENCE** | Reference Only |
| 14 | `SAH-21/SAARTHI-SIH26135` | Personalized career & education advisor for SIH26135. | Unlicensed | **LOW** | Cataloged |
| 15 | `shreyasinghtech83-sys/SIH26135-Skilling-Outcomes` | Longitudinal Skilling Outcomes & Impact Measurement. | Unlicensed | **LOW** | Cataloged |
| 16 | `25A31A43C5/skillbridge-ai` | SkillBridge AI: Skill gap and outcome tracking. | Unlicensed | **LOW** | Cataloged |
| 17 | `tejasidhardhofficial-web/SIH26135-SkillTrack` | SkillTrack dashboard for trainees and providers. | Unlicensed | **LOW** | Cataloged |
| 18 | `tiwariabhijeet517-lab/SIH26135-Employment-Skill-Gap-Backend` | Express backend for tracking skills and placement events. | Unlicensed | **LOW** | Cataloged |

---

## 3. Deep Architectural Comparisons

### 3.1 `Tanish200-ind/SIH26135`
- **Architecture:** Python FastAPI backend, SQLite database, React 18 frontend with dependency-free SVG charts.
- **Strengths:** 
  - Rigid refusal to use black-box ML or fake AI numbers.
  - Transparent analytics ratios living in a single centralized module (`analytics/common/ratios.py`).
  - Clear in-app synthetic demonstration data warnings.
- **Weaknesses:**
  - Read-only prototype; no write APIs, no follow-up scheduler, no employer verification mechanism, no DPDP consent infrastructure.
- **NEXIS Adaptation:** Replicate their centralized ratio definitions and synthetic data labeling in NEXIS analytics services (`server/services/analyticsService.js`).

### 3.2 `meaaditya07/SIH26135` (SkillTrace AI)
- **Architecture:** FastAPI + SQLAlchemy (async) + Alembic + Next.js 14 + Celery/Redis.
- **Strengths:**
  - Well-defined finite state machine for job applications: `applied → shortlisted → interview → offered → hired`.
  - Byte-level export engine producing multi-format reports (PDF, CSV, XLSX) without DB coupling.
  - Granular notification templates and queue worker structure.
- **Weaknesses:**
  - Uses black-box scikit-learn GradientBoosting for "placement probability" rather than root-cause analysis.
  - Lacks consent management, multi-level evidence scoring, and longitudinal follow-up retry workflows.
- **NEXIS Adaptation:** Adopt their strict state-transition guards for the NEXIS outcome state machine (`CERTIFIED → SEEKING_WORK → EMPLOYED → RETAINED`, etc.) and export patterns.

### 3.3 `moj-analytical-services/splink` (v4/v5)
- **Architecture:** High-performance probabilistic record linkage library supporting DuckDB, Spark, and PostgreSQL backends.
- **Strengths:**
  - Gold standard for identity linkage when phone numbers or addresses change.
  - Provides mathematical match weight and probability scores without sending PII to an LLM.
- **Implementation Decision:** Deploy Splink as an isolated Python sidecar service for deduplication review, emitting match candidate pairs to `DedupReviewPanel.tsx`.

### 3.4 `AnasAito/SkillNER`
- **Architecture:** Spacy-based token matcher against Lightcast/EMSI skill database.
- **Findings:**
  - Confirmed MIT license.
  - Stale since January 2024 (2.5+ years without updates).
- **Implementation Decision:** Do not bundle SkillNER as a runtime dependency. Instead, implement deterministic keyword and regex extraction with non-null `sourceSpan` offsets, crosswalked with NSQF and ESCO taxonomies.

---

## 4. Licensing and Reuse Policy

1. **Strict Zero-Copy Rule:** No source code has been copied from any unlicensed or ambiguously licensed competitor repositories (`meaaditya07`, `Tanish200`, `Abhinav-Sachan`, etc.). Their architectures and design decisions were analyzed as comparative research only.
2. **Permitted MIT Libraries:** `splink` and `SkillNER` are verified MIT-licensed. Any conceptual models adapted from them maintain standard MIT attribution.
3. **Internal Implementation:** All NEXIS features are implemented independently within the established Express + React + Prisma architecture.

---

## 5. Competitive Differentiation for SIH Judges

| Dimension | Typical SIH26135 Competitor | NEXIS Implementation |
|---|---|---|
| **Core Pitch** | "AI predicts whether trainee will get a job" | "Longitudinal outcome intelligence + verifiable evidence ledger" |
| **Verification** | Provider-reported or binary placed=true flag | 4-tier evidence ledger with confidence scores ($C = \min(100, 25S+25E+20D+15T+15X)$) |
| **Non-Response** | Often silently counted as unemployed | Explicit `UNREACHABLE` missing-observation state, never assumed unemployed |
| **Consent & Privacy** | None or single generic checkbox | Full DPDP 2025/2026 Phase-2 alignment (8 granular purposes + one-click withdrawal) |
| **Job Search** | Generic web links or hallucinated AI jobs | Official Adzuna API with required attribution badge + 6-factor deterministic scoring |
| **Orchestration UX**| Static 2D tables and cards | Immersive 3D Agent Command Center (WebGL) integrated with real-time SSE event stream |
