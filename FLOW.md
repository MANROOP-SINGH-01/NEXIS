# NEXIS System Architecture & Complete Flow

## 1. System Overview & Status

| Dimension | Status / Details |
| :--- | :--- |
| **Project Name** | NEXIS (Forge v3) |
| **Core Value Proposition** | 3D immersive vocational training, career orchestration, AI resume forging, verifiable skill gaps, and authenticated employer outcomes. |
| **Frontend Stack** | React 19, TypeScript, Vite 6, TailwindCSS v4, Three.js (3D character simulations), Zustand 5. |
| **Backend Stack** | Express 5.2.1, Prisma ORM 5.22.0 (SQLite in dev, PostgreSQL-ready in prod), Node.js. |
| **AI Providers** | Google Gemini (@google/genai), Sarvam AI (Indian multilingual speech/text), Serper (job search). |
| **Running Ports** | Frontend: http://localhost:3000/, Backend API: http://localhost:8787 (proxied via Vite). |

---

## 2. Complete End-to-End User Journeys

### Flow A: Trainee Onboarding & Identity Lifecycle
`mermaid
sequenceDiagram
    autonumber
    actor Trainee
    participant FE as React Client (App.tsx)
    participant API as Express API (:8787)
    participant OTP as OTP Service / SMS
    participant DB as Prisma (SQLite)

    Trainee->>FE: Enters phone number & details
    FE->>API: POST /api/otp/send { phoneNumber }
    API->>OTP: Generate 6-digit OTP & hash
    OTP-->>API: Saved in OtpVerification
    API-->>FE: OTP sent (Dev logs in console / SMS in prod)
    Trainee->>FE: Submits 6-digit code
    FE->>API: POST /api/otp/verify { phoneNumber, code }
    API->>DB: Check unexpired OTP & verify
    API-->>FE: Returns signed verificationToken
    FE->>API: POST /api/trainees { name, phone, verificationToken, ... }
    API->>DB: Upsert Trainee record
    FE->>API: POST /api/consent { traineeId, dataConsent: true }
    API->>DB: Records DPDP Consent Record
    FE-->>Trainee: Displays 3D Career Command Center
`

---

### Flow B: Career Simulation & 3D Agent Orchestration
1. **Scene Initialization (SceneManager.ts, Three.js)**:
   - Renders a 3D environment with interactive character agents.
   - Decodes compressed models via Draco loader (draco_decoder.js, draco_encoder.js).
2. **Agent Brain Execution (AgentBrain.ts)**:
   - Coordinates autonomous tasks (Skill Gaps, Resume Analysis, Job Matching).
   - Updates reactive state via useCoreStore and useUiStore.
3. **AI Task Execution**:
   - **Resume Forge**: Extracts text using pdf-parse, analyzes ATS keywords and formatting via Google Gemini.
   - **Nexus Hunter**: Queries real-time job listings via Serper and matches with candidate skills.
   - **Interview Prep**: Simulates dynamic Q&A scenarios with voice/multilingual capabilities via Sarvam AI.

---

### Flow C: Employer Verification & Government Cross-Check
`mermaid
graph TD
    A[Trainee Completes Program] --> B[Generate Outcome Record]
    B --> C[Send Secure Link to Employer: /verify/:token]
    C --> D[Employer Verification Portal]
    D -->|Approve/Reject| E[Store Employer Verification]
    E --> F[Automated Govt Data Cross-check]
    F --> G[Admin Analytics & Dedup Review Panel]
`

---

## 3. Database Entities & Relationships

- **Trainee**: Core candidate identity (Phone, Name, Language, GitHub/LinkedIn link, District, DOB).
- **OtpVerification**: Short-lived OTP hashes for SMS/Phone verification.
- **ConsentRecord**: Audit trail complying with data privacy (DPDP guidelines).
- **Enrolment**: Junction between Trainees and vocational training programs.
- **OutcomeCheckIn**: Longitudinal 30/90/180-day employment verification states.
- **EmployerVerification**: Independent third-party validation tokens and approvals.
- **AdminUser**: Role-based access control for administrative audits and deduplication.

---

## 4. API Endpoints Map

| Prefix | Handler | Responsibility |
| :--- | :--- | :--- |
| /api/otp/* | otpAuth.js | SMS OTP generation, verification, signed verification tokens |
| /api/trainees/* | 	rainee.js | CRUD, profile setup, deduplication |
| /api/consent/* | consent.js | Trainee consent recording & revocation audit trail |
| /api/resume/* | 
esume.js | PDF parsing, AI keyword extraction, CV generation |
| /api/jobs/* | jobs.js | Job matching, Serper integration |
| /api/interview/*| interview.js | AI mock interview generation & feedback |
| /api/employer/* | employer.js | Out-of-band verification tokens & status updates |
| /api/admin/* | dmin.js | Candidate deduplication review & system control |
| /verify/:token | Frontend Route | Public portal for employer outcome confirmation |
| /provider/:token | Frontend Route | Public dashboard for training providers |
