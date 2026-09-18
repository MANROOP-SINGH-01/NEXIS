# NEXIS — Frontend Architecture & Capability Audit

## 1. Executive Summary

NEXIS is an AI-powered Career Intelligence & Career Orchestration Platform combining deep algorithmic job discovery, real-time ATS resume tailoring, multi-dimensional skill debt analytics, and an interactive 3D AI agent simulation.

This audit establishes the ground truth of all existing frontend routes, component trees, API contracts, state management stores, and database schemas before executing the visual rebuild based on the PulseAI warm design system.

---

## 2. Route & View Inventory

| Route / View ID | Primary Component | Purpose & State Dependencies | Backend Endpoint Dependencies |
| :--- | :--- | :--- | :--- |
| `overview` (`/`, `/overview`, `/app`) | `CareerHealthDashboard.tsx`, `PulseOverviewView.tsx` | High-level command center, career readiness score, trajectory pulse, agent orchestration status. | `GET /api/health`, `GET /api/analytics/summary`, `GET /api/agent/status` |
| `jobs` (`/jobs`, `/matches`) | `JobMatchesView.tsx` | Algorithmic job discovery, Proficiently transparent fit scoring (SKIP/LOW/MED/HIGH), referral network detection, Two-Phase ATS Application prep. | `GET /api/jobs/feed`, `GET /api/jobs/matches`, `POST /api/jobs/search`, `POST /api/jobs/apply` |
| `resume` (`/resume`, `/cv`) | `ResumeForgeModal.tsx`, `NewCVView.tsx` | STAR-bullet resume editor, Anti-Slop Flesch reading score (>90), ATS keyword alignment, Grounded Cover Letter Generator. | `POST /api/resume/parse`, `POST /api/resume/tailor`, `POST /api/resume/score`, `POST /api/resume/export-pdf` |
| `skills` (`/skills`, `/radar`) | `SkillGapsView.tsx` | Market skill gap analysis, proficiency rings, wage impact simulator, course recommendations. | `GET /api/skills/market-demand`, `POST /api/skills/analyze-gap` |
| `applications` (`/applications`, `/tracker`) | `ApplicationTrackerView.tsx` | 5-stage application pipeline (Saved, Applied, Interviewing, Offer, Rejected), Two-Phase proposal inspection. | `GET /api/applications`, `PATCH /api/applications/:id/status`, `POST /api/applications` |
| `learning` (`/learning`, `/courses`) | `LearningRoadmapView.tsx` | Curated skill-acquisition paths with SWAYAM, NPTEL, Coursera, and free community resources. | `GET /api/courses/search`, `GET /api/courses/recommendations` |
| `interview` (`/interview`, `/prep`) | `InterviewStudioView.tsx` | Role-tailored mock interview prep, behavioral STAR feedback, technical questions. | `POST /api/interview/generate-questions`, `POST /api/interview/evaluate-response` |
| `passport` (`/passport`, `/credentials`) | `CareerPassportView.tsx` | Cryptographically verifiable credentials, GitHub proof-of-work badges, and verifiable career passport. | `GET /api/passport/verify`, `GET /api/github/audit` |
| `analytics` (`/analytics`, `/government`) | `AnalyticsDashboard.tsx` | PulseAI-style infrastructure and career analytics, government training provider dashboards (PMKVY/DDU-GKY). | `GET /api/analytics/government`, `GET /api/analytics/system` |
| `settings` (`/settings`, `/profile`) | `SettingsView.tsx`, `PrivacySettingsView.tsx` | User career preferences, work history profile, BYOK API keys (Gemini, Claude, OpenAI), DPDP consent. | `GET /api/auth/me`, `PUT /api/user/preferences`, `PUT /api/user/profile` |

---

## 3. Component Hierarchy & Module Map

```
src/
├── App.tsx                      # Master shell router, auth gate, global modals, 3D viewport canvas
├── index.css                    # Tailwind + base reset styles
├── types.ts                     # Full TypeScript interface specifications (Domain + Proficiently)
├── integration/
│   └── store/
│       ├── coreStore.ts         # Unified Zustand store (Agents, Jobs, Resume, Profile, Simulation, Fit)
│       └── persistentStorage.ts # LocalStorage sync and state dehydration
├── services/                    # Domain intelligence layer
│   ├── fitScoringService.ts     # Transparent Dealbreaker -> Must-Have -> Nice-to-Have fit engine
│   ├── networkMatchingService.ts# Warm network contact & referral outreach generator
│   ├── atsWorkflowService.ts    # Direct ATS URL resolution & Two-Phase Application proposal builder
│   └── antiSlopResumeService.ts # Anti-slop buzzword sanitizer, Flesch >90 auditor, STAR generator
├── simulation/                  # Living 3D Agent Office (Three.js Engine)
│   ├── SceneManager.ts          # Core 3D engine, camera controls, render loop, workstation binding
│   ├── core/Stage.ts            # Scene setup, lighting, shadows, floor grid
│   └── world/                   # 3D worker characters and interactive props
└── interface/                   # React UI Layer
    ├── layout/                  # Navigation Shell (Sidebar, Topbar, Status Bar)
    ├── auth/                    # Phone OTP + Password authentication portals
    ├── admin/                   # Government analytics and scheme compliance
    ├── ApplicationPreparationModal.tsx # Two-Phase ATS Application Navigator
    ├── ResumeForgeModal.tsx     # Full ATS resume tailoring engine
    ├── JobMatchesView.tsx       # Job discovery with fit indicators & network matches
    ├── NewCVView.tsx            # Anti-slop CV editor with Grounded Cover Letter modal
    └── UIOverlay.tsx            # Floating 3D agent speech bubbles and task status chips
```

---

## 4. Backend API & Contract Dependencies

The Express API backend runs on `http://localhost:8787` and connects to PostgreSQL via Prisma ORM:

1. **Authentication & OTP**:
   - `POST /api/otp/send`: `{ phoneNumber: string }` -> dispatches real SMS (Twilio/MSG91) or console stub.
   - `POST /api/otp/verify`: `{ phoneNumber: string, code: string }` -> returns JWT session & candidate profile.
   - `POST /api/auth/login` & `POST /api/auth/register`: Dual-mode credential support.
2. **Resume & Career Dossier**:
   - `POST /api/resume/parse`: Uploads PDF/Docx and extracts structured JSON (`WorkHistoryProfile`).
   - `POST /api/resume/tailor`: Compares candidate profile to JD and outputs STAR accomplishment bullets.
   - `POST /api/resume/anti-slop-check`: Analyzes reading ease and flags buzzwords/em-dashes.
3. **Job Discovery & Matching**:
   - `GET /api/jobs/feed`: Retrieves verified jobs from configured sources.
   - `POST /api/jobs/evaluate-fit`: Scores job against `CareerPreferences` with transparent reasons.
4. **Government & Provider Analytics**:
   - `GET /api/analytics/government`: Scheme distribution (PMKVY, DDU-GKY, NAPS) and district cohorts.

---

## 5. Identified Anti-Patterns & Deficiencies in Old UI

1. **Visual Inconsistency**: Dark cyber/terminal styling in some views clashed with generic white cards in others.
2. **Uncalibrated Contrast**: Text contrast in secondary badges violated WCAG AA standards.
3. **Excessive Container Nesting**: Card-inside-card syndrome cluttered the resume editor and job discovery views.
4. **Lack of Single Design Source**: Tokens were hardcoded across CSS and JSX instead of being driven by unified variables.
5. **Proficiently Workflow Under-Exposure**: Rich fit evaluations, referral matching, and ATS proposal workflows were implemented in code but lacked full visual prominence in the application shell.

---

## 6. Audit Verdict

All underlying backend APIs, Prisma models, 3D character simulations, and Proficiently service modules are fully functional and verified (`npm run build` passing). The visual redesign must strictly wrap and elevate these capabilities without mutating backend contracts or breaking working state.
