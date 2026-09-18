# NEXIS — Proficiently Claude Skills Integration Plan

## 1. Architectural Overview & Philosophy

The open-source repository `proficientlyjobs/proficiently-claude-skills` provides high-leverage mental models and workflows for career automation:
1. **Never fabricate career data**: Ground every output in the candidate's actual work history.
2. **Transparent, Explainable Fit Scoring**: Prioritize dealbreakers before scoring qualifications.
3. **Warm Outreach Over Cold Applications**: Surface 1st/2nd-degree network contacts and draft personalized outreach.
4. **Two-Phase Human-in-the-Loop ATS Submissions**: Review extracted fields in Phase 1 before committing submission in Phase 2.
5. **Anti-Slop Craftsmanship**: Enforce natural human readability (Flesch >90), ban AI clichés, and eliminate artificial em-dashes.

NEXIS incorporates these patterns as first-class domain services while retaining its native Express/Prisma backend and 3D orchestration engine.

---

## 2. Functional Mapping Matrix

| Proficiently Capability | NEXIS Implementation Service | UI Surface & Interaction |
| :--- | :--- | :--- |
| **`career-preferences`** | `src/services/fitScoringService.ts` | Settings & Job Filter drawer: minimum compensation, commute/remote tolerance, visa sponsorship, target titles. |
| **`work-history` Profile** | `src/types.ts` (`WorkHistoryProfile`), `src/integration/store/coreStore.ts` | Resume Forge Dossier: structured companies, verified metrics, STAR accomplishment store. |
| **`job-fit-evaluator`** | `fitScoringService.evaluateJobFit()` | `JobMatchesView.tsx`: Transparent badge (`SKIP`, `LOW`, `MEDIUM`, `HIGH`) with expandable rationale breakdown. |
| **`network-contacts`** | `src/services/networkMatchingService.ts` | Job Card "Warm Referral" drawer: displays matching alumni/colleagues with 1-click personalized outreach draft. |
| **`application-preparer`** | `src/services/atsWorkflowService.ts` | `ApplicationPreparationModal.tsx`: Two-Phase ATS Application Navigator with field-by-field verification. |
| **`anti-slop-resume`** | `src/services/antiSlopResumeService.ts` | `NewCVView.tsx` & `ResumeForgeModal.tsx`: Real-time Flesch Reading score (>90 target) & AI buzzword sanitizer. |
| **`cover-letter-generator`** | `antiSlopResumeService.generateCoverLetter()` | Grounded 250-350 word cover letter generator referencing only authentic candidate accomplishments. |

---

## 3. Detailed Workflows

### 3.1 Transparent Fit Scoring Engine

```
Job Description & Requirements
              │
              ▼
   [ Step 1: Dealbreakers ] ────── Fail ─────► [ SKIP / DISQUALIFIED ]
   - Compensation minimum?                       (Explicit Reason Stated)
   - Visa sponsorship match?
   - Location / Remote match?
              │ Pass
              ▼
   [ Step 2: Must-Haves ] ──────── Score 0-60 pts
   - Core technical capabilities
   - Years of experience threshold
              │
              ▼
   [ Step 3: Nice-to-Haves ] ───── Score 0-40 pts
   - Secondary tools, domain bonus
              │
              ▼
   Final Category: HIGH (85-100) | MEDIUM (65-84) | LOW (40-64)
```

### 3.2 Two-Phase ATS Application Workflow

```
[ Job Match Selected ] ──► [ Click "Prep ATS Application" ]
                                        │
                                        ▼
             ┌─────────────────────────────────────────────────────┐
             │ PHASE 1: Proposal Review & Field Extraction         │
             │ - Direct job URL resolved (bypassing redirect tags) │
             │ - Pre-filled fields (Name, Email, LinkedIn, etc.)   │
             │ - Candidate overrides & adds custom notes           │
             └──────────────────────────┬──────────────────────────┘
                                        │ Confirm Details
                                        ▼
             ┌─────────────────────────────────────────────────────┐
             │ PHASE 2: Submission Verification                    │
             │ - Final confirmation checklist                      │
             │ - Dispatches to tracking pipeline                   │
             │ - Visual signal sent to 3D Agent Simulation         │
             └─────────────────────────────────────────────────────┘
```

### 3.3 Anti-Slop Content Standards

1. **Flesch Reading Ease > 90**: Enforce conversational, punchy English that recruiters scan in 6 seconds.
2. **Em-Dash Ban**: Eliminate `--` and `—` AI hallmarks; replace with disciplined punctuation or bullet structure.
3. **Banned Clichés**: Flag and remove `spearheaded`, `leveraged`, `synergy`, `passionate`, `cutting-edge`, `rockstar`, `orchestrated`.
4. **STAR Format Verification**: Ensure every accomplishment contains Situation/Task, Action verb, and Quantified Metric (`X% improvement`, `$Y saved`, `Z users onboarded`).
