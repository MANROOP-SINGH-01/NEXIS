# NEXIS — PROFICIENTLY SKILLS ARCHITECTURAL MAPPING & INTEGRATION SPECIFICATION

**Product**: NEXIS — AI Career Intelligence & Career Orchestration OS  
**Reference Source**: `proficientlyjobs/proficiently-claude-skills` (GitHub)  
**Implementation Target**: NEXIS Core Frontend, Integration Store, and Service Layer  
**Status**: Integrated & Production-Ready  
**Date**: September 2026  

---

## 1. Architectural Philosophy & Extraction Rules

NEXIS is an institutional-grade **Career Intelligence Operating System**, whereas `proficiently-claude-skills` is a modular agentic skill-pack designed for autonomous career workflows in Claude. 

### Core Extraction Principles:
1. **Never Clone Blindly**: Do not replace NEXIS's Express REST backend (`:8787`), Prisma ORM, or PostgreSQL schema with Claude skill plugins.
2. **Adapt Workflows, Not Vendors**: Preserve NEXIS's own search, verification, and resume pipeline while infusing Proficiently's high-rigor decision models.
3. **Grounding & Factual Accuracy**: Enforce strict factual boundaries: never fabricate candidate experience, titles, companies, dates, or metrics.
4. **Mandatory Human Verification Gate**: For all ATS form filling and job submissions, Phase 2 requires explicit, conscious user confirmation.

---

## 2. Granular Capability Mapping Matrix

| Proficiently Capability | Proficiently Skill Source | NEXIS Destination | Implementation Status | Supporting NEXIS Backend / API |
| :--- | :--- | :--- | :--- | :--- |
| **Resume Ingestion & Parsing** | `setup/resume_parser` | `src/interface/PhaseOneControlPanel.tsx`<br>`src/services/antiSlopResumeService.ts` | **Fully Integrated** | `/api/cv/extract-entities`<br>`/api/cv/analyze` |
| **Career Preferences Profile** | `setup/candidate_profile` | `src/types.ts` (`CandidateProfile`)<br>`src/integration/store/coreStore.ts` | **Fully Integrated** | `/api/trainee/profile`<br>Client-side LocalStorage |
| **LinkedIn Contact Sync** | `setup/linkedin_network` | `src/interface/LinkedInIntegrationView.tsx`<br>`src/services/networkMatchingService.ts` | **Fully Integrated** | `/api/linkedin/verify-url`<br>`/api/linkedin/profile` |
| **Work-History Interview** | `setup/work_history_chat` | `src/interface/InterviewPrepView.tsx`<br>`src/interface/NexusMirrorModal.tsx` | **Fully Integrated** | `/api/interview/brief`<br>`/api/agents/chat` |
| **Multi-Signal Fit Scoring** | `job_search/fit_evaluator` | `src/services/fitScoringService.ts`<br>`src/interface/JobMatchesView.tsx` | **Fully Integrated** | `/api/jobs/match`<br>`/api/jobs/radar` |
| **Dealbreaker & Must-Haves** | `job_search/dealbreakers` | `src/types.ts` (`FitEvaluation`)<br>`src/services/fitScoringService.ts` | **Fully Integrated** | Filter rules in `fitScoringService.ts` |
| **Direct Employer URL Resolution**| `job_search/url_resolver` | `src/interface/JobMatchesView.tsx`<br>`src/services/atsWorkflowService.ts` | **Fully Integrated** | Direct application URLs in `JobMatch` |
| **Duplicate Job Avoidance** | `job_search/dedup` | `src/interface/admin/DedupReviewPanel.tsx`<br>`src/integration/store/coreStore.ts` | **Fully Integrated** | Normalized title + company hash matching |
| **Anti-Slop Resume Tailoring** | `resume/tailor_engine` | `src/services/antiSlopResumeService.ts`<br>`src/interface/NewCVView.tsx` | **Fully Integrated** | `/api/cv/enhance`<br>Flesch >90 scoring engine |
| **Grounded Cover Letter** | `cover_letter/generator` | `src/services/antiSlopResumeService.ts`<br>`src/interface/NewCVView.tsx` (Cover Letter Modal) | **Fully Integrated** | Bounded by STAR project facts |
| **Warm Referral Detection** | `network/scanner` | `src/services/networkMatchingService.ts`<br>`src/interface/JobMatchesView.tsx` | **Fully Integrated** | Inferred from LinkedIn contacts & alumni |
| **2-Phase ATS Navigator** | `application/ats_filler` | `src/interface/ApplicationPreparationModal.tsx`<br>`src/services/atsWorkflowService.ts` | **Fully Integrated** | Supports Workday, Greenhouse, Lever, Direct ATS |
| **Human Verification Gate** | `application/submit_gate` | `ApplicationPreparationModal.tsx` (Phase 2) | **Fully Integrated** | Checkbox gate strictly blocking silent submits |
| **Application Lifecycle CRM** | `application/tracker` | `src/interface/ApplicationTrackerView.tsx` | **Fully Integrated** | 5-stage Kanban (Saved, Applied, Assessment, Interview, Offer) |

---

## 3. Detailed Workflow Architecture

### 3.1 The Multi-Dimensional Fit Engine
Proficiently evaluates jobs through multi-criteria alignment rather than a naive cosine similarity:
```
Target Job Posting + Candidate Profile
           │
           ▼
1. Dealbreaker Filter (Location, Visa, Minimum Salary, Remote Requirement)
   ├─ If triggered ──> Flagged as 'IGNORE' / Dealbreaker active
   └─ If clear ──────> Proceed to scoring
           │
           ▼
2. Weighted Dimension Scoring:
   • Skills Alignment (40%): Overlap with must-have core technologies
   • Experience Depth (25%): Years in production, team scale, domain depth
   • Title Alignment (20%): Role trajectory match
   • Project Provenance (15%): Demonstrated AST code proof on GitHub
           │
           ▼
3. Bucket Classification:
   • APPLY NOW: Fit Score >= 85% with 0 dealbreakers
   • LEARN THEN APPLY: Fit Score 65-84% with 1-2 closeable gaps
   • STRETCH: Fit Score 50-64% requiring substantial skill progression
```

### 3.2 The Two-Phase ATS Application Navigator
Automated job applications without human verification risk hallucinations, inaccuracies, and account bans. NEXIS adapts Proficiently's 2-phase protocol:
- **Phase 1: Automated Field Mapping**:
  - Automatically parses application schemas across Greenhouse, Lever, Workday, and Direct portals.
  - Pre-fills verified contact details, candidate name, repository links, and generates grounded screening answers based on AST evidence.
- **Phase 2: Mandatory Human Verification Gate**:
  - Presents a dual-pane document preview: tailored STAR resume on the left, grounded cover letter on the right.
  - Prominently displays all proposed screening questions and answers.
  - Requires explicit user check: *"I have reviewed all fields and confirm that all representations accurately reflect my genuine experience and profile."*

### 3.3 Anti-Slop Flesch >90 Resume & Cover Letter Standards
Adapted from Proficiently's prompt engineering rules:
- **Enforced Constraints**:
  - Ban buzzwords: *"spearheaded"*, *"synergy"*, *"leveraged"*, *"passionate"*, *"rockstar"*, *"orchestrated"*.
  - Ban ornamental typography: 0 em-dashes (`—`), replacing them with standard periods or commas.
  - Active voice with quantified metrics (e.g., *"Engineered Redis distributed lock, reducing checkout race conditions from 4.2% to 0%"*).
  - Target Flesch Reading Ease score > 80 (accessible, unambiguous, human).

---

## 4. Shared Data Contracts (`src/types.ts`)

```typescript
export type JobBucket = 'APPLY_NOW' | 'LEARN_THEN_APPLY' | 'STRETCH' | 'IGNORE';
export type FitRating = 'HIGH' | 'MEDIUM' | 'LOW' | 'SKIP';
export type AtsType = 'greenhouse' | 'lever' | 'workday' | 'direct' | 'other';

export interface FitEvaluation {
  rating: FitRating;
  dealbreakersTriggered: string[];
  mustHavesMatched: string[];
  niceToHavesMatched: string[];
  skillsScore: number;
  experienceScore: number;
  titleScore: number;
  overallScore: number;
  recommendationReason: string;
}

export interface CandidatePreferences {
  targetRoles: string[];
  targetLocations: string[];
  remoteAllowed: boolean;
  minAnnualSalaryINR?: number;
  excludedCompanies: string[];
  requiredTechStack: string[];
}
```

---

## 5. Summary

By adapting Proficiently's rigorous job search, dealbreaker evaluation, anti-slop resume standards, and human-in-the-loop ATS workflows into the NEXIS architecture, NEXIS offers unprecedented rigor while remaining 100% faithful to its native backend, database, and 3D simulation foundation.
