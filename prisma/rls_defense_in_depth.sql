-- ==============================================================================
-- NEXIS / Forge v3: Supabase Row Level Security (RLS) Defense-in-Depth Policies
-- ==============================================================================
-- ARCHITECTURE CONTEXT:
-- All NEXIS application traffic routes through Express 4 / Prisma ORM.
-- Prisma connects directly using the PostgreSQL 'postgres' role via pooled connection.
-- The 'postgres' role owns the tables and has BYPASS_RLS privileges in PostgreSQL.
--
-- THREAT MODEL:
-- Supabase automatically exposes an HTTP PostgREST API at https://<project-ref>.supabase.co/rest/v1/.
-- If RLS is disabled, any request presenting the public 'anon' key could query
-- tables directly via PostgREST, bypassing Express authentication entirely.
--
-- REMEDIATION:
-- Enabling RLS on each table ensures that unauthorized requests via PostgREST (roles 'anon'
-- and 'authenticated') are denied access by default, while Prisma ('postgres' role) continues
-- to execute all application queries and migrations without restriction.
-- ==============================================================================

-- 1. Candidate & Identity Tables (Personal Data)
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CandidateProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Trainee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConsentRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Enrolment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OutcomeCheckIn" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmployerVerification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OtpVerification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserSkill" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CareerPassportItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SkillEvidence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InterviewSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InterviewQnA" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JobApplication" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApplicationEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CareerAction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CareerReadinessSnapshot" ENABLE ROW LEVEL SECURITY;

-- 2. Administrative & Audit Tables (Admin / Compliance Data)
ALTER TABLE "AdminUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminActionLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DedupCandidate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentEventLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProviderAccessToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GovtCrossCheckResult" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SkillGapSnapshot" ENABLE ROW LEVEL SECURITY;

-- 3. Reference & Aggregation Tables (Public / Platform Data)
ALTER TABLE "Skill" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TargetRole" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RoleSkillRequirement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CourseRecommendation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Job" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ControlGroupRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiUsageMetric" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiCacheEntry" ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- Default Deny for PostgREST public roles (anon & authenticated):
-- In PostgreSQL, when RLS is enabled and no permissive policies exist for a role,
-- all SELECT, INSERT, UPDATE, and DELETE operations for that role are DENIED.
-- Meanwhile, backend Prisma connects as the table owner ('postgres') which
-- possesses BYPASS_RLS, ensuring zero interruption to Express backend routes.
--
-- ROLLBACK COMMAND (if ever needed):
-- ALTER TABLE "<table_name>" DISABLE ROW LEVEL SECURITY;
-- ==============================================================================
