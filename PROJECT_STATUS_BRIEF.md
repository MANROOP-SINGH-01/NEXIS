# NEXIS / FORGE V3: Project Status Brief & System Architecture Specification

> **Document Version**: 3.2.0  
> **Target Audience**: AI Engineering Systems, Product Architects, Venture Reviewers, Technical Leads  
> **Last Verified**: September 2026  
> **Status**: Localhost Fully Operational (Vite `3000` / Express `8787` / Prisma SQLite Active)

---

## 1. Executive Summary & Vision Statement

**NEXIS** (also known as **FORGE v3**) is an **AI-driven career acceleration and vocational outcome verification platform** built specifically to bridge the divide between job seekers, skill development initiatives (including Government of India schemes like PMKVY, SWAYAM, NPTEL, Skill India Digital), and enterprise employment markets.

Rather than being a traditional resume builder or generic job board, NEXIS operates as an **Autonomous Career Strategy Agent (CrewAI / Multi-Agent Pattern)** that:
1. Ingests raw candidate resumes and matches them against target job descriptions with mathematical precision.
2. Extracts deep skill gaps and immediately links candidates to **accredited Indian Government portals** (SWAYAM, NPTEL, Skill India) alongside global verified curriculums.
3. Conducts **real-time AI interview simulations** with personalized question generation based on candidate-specific skill vulnerabilities.
4. Generates recruiter-grade, ATS-compliant resumes with real-time PDF compilation.
5. Verifies employment outcomes, deduplicates candidate records across training centers, and generates longitudinal wage progression analytics for institutions.

---

## 2. Problem Statement

Modern vocational education and employment pipelines suffer from three fundamental bottlenecks:

1. **The Keyword/ATS Mismatch Disconnect**:
   Candidates often possess required skills but fail algorithmic recruiter screenings due to unstructured phrasing, missing metrics, and misaligned vocabulary.
2. **The "Upskilling Blind Spot"**:
   When candidates are rejected or lack core competencies, they face fragmented, high-cost course ecosystems. High-quality, government-accredited, free programs (e.g. NPTEL by IITs, SWAYAM, Skill India) remain undiscovered.
3. **The Outcome & Verification Black Hole**:
   Vocational institutes (PMKVY, DGT, private bootcamps) struggle with post-completion tracking. They lack corroboration mechanisms (Employer Verification, Registry cross-referencing with e-Shram / Udyam) to demonstrate true placement ROI and identify curriculum rot.

---

## 3. The NEXIS Solution Architecture

NEXIS deploys a multi-layered, reactive web architecture structured around autonomous agent roles:

```
                                  +-----------------------------+
                                  |    Vite + React Frontend    |
                                  | (Tailwind, Lucide, Canvas)  |
                                  +--------------+--------------+
                                                 | (Proxy / API)
                                                 v
                                  +-----------------------------+
                                  |   Express.js Node Backend   |
                                  |         Port: 8787          |
                                  +--------------+--------------+
                                                 |
         +-------------------+-------------------+-------------------+-------------------+
         |                   |                   |                   |                   |
         v                   v                   v                   v                   v
+-----------------+ +-----------------+ +-----------------+ +-----------------+ +-----------------+
| Google Gemini   | | Sarvam AI       | | Adzuna Jobs &   | | Prisma Data     | | PDFKit Engine   |
| 3.6 Flash / Pro | | (sarvam-105b)   | | Google Serper   | | ORM (dev.db)    | | (Binary Stream) |
| (Reasoning &    | | (Indic Lingual  | | (Live Discovery | | (Trainee, Dedup | | (Structured CV  |
| Tailoring)      | |  & Failover)    | |  & Portals)     | |  & Analytics)   | |  Generation)    |
+-----------------+ +-----------------+ +-----------------+ +-----------------+ +-----------------+
```

### Core Agent Archetypes:
- **Nexus-Director**: Strategy orchestrator providing conversational, tactical guidance on keyword positioning and bullet impact.
- **Nexus-Strategist**: Analytical engine evaluating role alignment, ATS scoring, and extracting skill gaps.
- **Nexus-Hunter**: Autonomous job discovery agent that queries live market listings, calculates Blue Ocean competitiveness scores, and selects prime targets.
- **Nexus-Mirror**: Interactive interview simulation engine creating targeted technical and behavioral grill questions.

---

## 4. Comprehensive Tech Stack Breakdown

### Frontend:
- **Framework**: React 18 with TypeScript (`strict: true`, clean compile).
- **Bundler & Tooling**: Vite 5 with Hot Module Replacement (HMR).
- **Styling**: Vanilla Tailwind CSS with custom HSL brand variables, dark-mode/slate aesthetics, and zero external bloated UI dependencies.
- **State Management**: Zustand lightweight reactive stores (`coreStore.ts`, `uiStore.ts`).
- **Icons & Graphics**: Lucide React for consistent technical iconography.

### Backend:
- **Runtime**: Node.js v22 (ES Modules native).
- **Web Server**: Express.js with JSON body parsing, CORS, file-upload handling (`multer`), and rate limiting.
- **Database & ORM**: **Prisma ORM (v5.22.0)** configured with SQLite for local development (`prisma/dev.db`), completely portable and schema-ready for PostgreSQL / Supabase in cloud environments.
- **PDF Compilation**: Pure Node.js `pdfkit` vector document renderer generating high-fidelity, ATS-friendly PDFs without headless Chromium overhead.

---

## 5. Live APIs & Integration Matrix

All external APIs are currently configured, live-tested, and operating in real time:

| API Provider | Model / Endpoint | Role in NEXIS | Live Status | Key Characteristics |
| :--- | :--- | :--- | :--- | :--- |
| **Google Gemini AI** | `gemini-3.6-flash`, `gemini-3.1-pro-preview` | Resume Tailoring, Skill Extraction, Interview Question Briefs, Director Chat | **ACTIVE (200 OK)** | Sub-second latency, structured JSON mode, deep technical reasoning. |
| **Sarvam AI** | `sarvam-105b` | Indic linguistic failover, cross-lingual candidate profile processing | **ACTIVE (200 OK)** | Enterprise multilingual model with custom headers (`api-subscription-key`). |
| **Adzuna API** | `/v1/api/jobs/in/search` | Live job search and authentic market opening retrieval | **ACTIVE (200 OK)** | Direct application links, salary bands, low-competition scoring. |
| **Google Serper API** | `google.serper.dev/search` | Scraping accredited government and training websites | **ACTIVE (200 OK)** | Real-time web index queries targeting `.gov.in` and `.ac.in` portals. |
| **Prisma ORM** | `file:./dev.db` | Trainee profiles, OTP sessions, Skill Gap history, Admin dedup review | **ACTIVE (Connected)** | Relational model integrity, cryptographic HMAC auth token verification. |

---

## 6. Functional Modules & Views

### 1. New CV / Tailor (`src/interface/NewCVView.tsx`)
- **Interactive Resume Canvas**: Displays candidate contact details, objective summary, work experience timeline, categorized technical skills (Core Frontend, Backend & DB, Cloud & DevOps), and projects.
- **Real-Time Re-Tailor**: Triggers `POST /api/resume/tailor` to rebuild resume structure against any custom JD using Gemini.
- **One-Click PDF Generator**: Streams vector binary PDF directly to the browser with zero external dependencies.

### 2. Interview Prep (`src/interface/InterviewPrepView.tsx`)
- **Pre-Interview Briefing Engine**: Dynamically fetches focus areas via `POST /api/interview/brief`.
- **4 Deep Evaluation Vectors**:
  - Technical Architecture
  - System Design & Scalability
  - Behavioral & Incident Ownership (STAR method)
  - Cloud & DevOps Execution
- **Gap-Specific Grill Defense**: Identifies candidate's missing skills and provides actionable 2-hour prep recipes.
- **Nexus-Mirror Launcher**: Opens full conversational mock interview simulator.

### 3. Recommended Programs (`src/interface/RecommendedProgramsView.tsx`)
- **Government Accredited Portals Integrated**:
  - **SWAYAM** (Ministry of Education / AICTE)
  - **NPTEL** (IIT Madras, IIT Kharagpur, IIT Bombay)
  - **Skill India Digital Hub** (MSDE / PMKVY 4.0)
  - **FutureSkills Prime** (MeitY & NASSCOM)
- **Live Search & Fallbacks**: Queries Serper and falls back to curated government courses with direct enrollment links.
- **Badging**: Displays dedicated visual landmarks (`Indian Govt. Program`, `Free Access`).

### 4. Job Matches / Nexus-Hunter (`src/interface/JobMatchesView.tsx`)
- **Live Aggregation**: Pulls active opportunities from Adzuna.
- **Dual Match Scoring**: Calculates both **Role Alignment Score** (0–100%) and **Blue Ocean Score** (identifying direct employer portals with lower applicant competition).
- **Deep Match Explanations**: Gemini produces 2-sentence rationale detailing why the candidate's exact experience fits the listing.

### 5. Institutional & Admin Dashboard (`src/interface/admin/`)
- **Analytics & Wage Progression**: Tracks placement rates, response rates, and salary growth over 3–12 months post-training.
- **Deduplication Review Panel**: Flags candidates registered across multiple centers using Jaro-Winkler string similarity and phone hashes.
- **Government Registry Cross-Check**: Simulates corroboration with e-Shram and UDYAM data layers.

---

## 7. UI/UX Design System & Aesthetics

- **Color Palette**:
  - Primary Slate Background: `#f8fafc` / `#f1f5f9`
  - Deep Brand Accent: `#1e3a8a` (Indigo / Navy)
  - High-Contrast Badging: Emerald (`#059669`) for Free/Placed, Amber (`#d97706`) for Skill Gaps, Orange (`#ea580c`) for Government programs.
- **Typography**: Crisp, modern sans-serif with strict typographic hierarchy, monospaced tech previews, and uppercase micro-labels (`tracking-widest`).
- **Feedback & Micro-interactions**: Pulsing status indicators, animated spinners during AI token streaming, and toast notifications on downloads.
- **Zero Placeholder Guarantee**: No broken images, missing links, or unhandled null states.

---

## 8. Database Schema Architecture (`prisma/schema.prisma`)

The database is built on portable relational models:
- **`Trainee`**: Core candidate identity with phone number, verification state, GitHub soft-link, and LinkedIn ID.
- **`Enrolment`**: Course, scheme (PMKVY 4.0, DGT), training provider, and cohort tracking.
- **`SkillGapSnapshot`**: Persists chronological ATS scores and missing skills over time to measure improvement.
- **`OtpVerification`**: Stores SHA-256 hashed OTPs and expiry timestamps for SMS phone login.
- **`CourseRelevanceScore`**: Aggregates curriculum alignment by comparing employer denial reasons with actual market skill gaps.
- **`DedupCandidate`**: Pairwise candidate merge suggestions with algorithmic similarity scoring.
- **`AdminUser`**: Role-based access control (`SUPER_ADMIN`, `REGIONAL_DIRECTOR`, `PROVIDER_ADMIN`).

---

## 9. Current Status of the Codebase

- **Compilation Status**: `npx tsc --noEmit --skipLibCheck` passes with **0 errors**.
- **Backend Server**: Running continuously on `http://localhost:8787`.
- **Frontend App**: Running continuously on `http://localhost:3000`.
- **Regex & Heuristic Parsers**: Fully escaped against special characters (`C++`, `.NET`, `Node.js`).
- **Model Migration**: Successfully upgraded from deprecated Gemini 2.5 to modern `gemini-3.6-flash`.

---

## 10. AI Extension Vectors & Suggested Next Features

Any AI assistant or product team evaluating NEXIS can build upon these planned extensions:

1. **Speech-to-Speech Mock Interview**:
   Integrate WebRTC with Sarvam Voice API / ElevenLabs to conduct spoken audio interviews with real-time feedback on speaking pace and technical clarity.
2. **Automated GitHub Portfolio Analysis**:
   Parse candidate GitHub repositories using GitHub REST API to automatically verify demonstrated skills directly from code commits and README files.
3. **Multi-Tenant College & Training Partner Portal**:
   Allow training centers to bulk-upload student cohorts and export compliance reports for government scheme funding.
4. **Cloud Database Migration**:
   Switch the Prisma datasource from SQLite to Supabase / Neon PostgreSQL by updating `DATABASE_URL` and running `npx prisma db push`.
