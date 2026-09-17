-- CreateTable
CREATE TABLE "Trainee" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "githubId" TEXT,
    "linkedinId" TEXT,
    "linkedinVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "dateOfBirth" TIMESTAMP(3),
    "district" TEXT,
    "priorQualification" TEXT,
    "mergedIntoId" TEXT,

    CONSTRAINT "Trainee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrolment" (
    "id" TEXT NOT NULL,
    "traineeId" TEXT NOT NULL,
    "scheme" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "cohortName" TEXT NOT NULL,
    "enrolmentDate" TIMESTAMP(3) NOT NULL,
    "certificationDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enrolment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "traineeId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "version" TEXT NOT NULL DEFAULT 'v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutcomeCheckIn" (
    "id" TEXT NOT NULL,
    "traineeId" TEXT NOT NULL,
    "checkinType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "employmentStatus" TEXT,
    "employerName" TEXT,
    "wageBand" TEXT,
    "notes" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roleRelevance" TEXT,
    "selfEmploymentType" TEXT,
    "apprenticeshipEmployer" TEXT,
    "nonPlacementReason" TEXT,
    "placementDistrict" TEXT,

    CONSTRAINT "OutcomeCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployerVerification" (
    "id" TEXT NOT NULL,
    "outcomeCheckInId" TEXT NOT NULL,
    "traineeId" TEXT NOT NULL,
    "employerNameClaimed" TEXT NOT NULL,
    "employerContactEmail" TEXT NOT NULL,
    "contactDomainFlag" BOOLEAN NOT NULL,
    "verificationToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reasonCode" TEXT,
    "reasonNotes" TEXT,
    "verifiedByName" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployerVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "githubUsername" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminActionLog" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DedupCandidate" (
    "id" TEXT NOT NULL,
    "traineeIdA" TEXT NOT NULL,
    "traineeIdB" TEXT NOT NULL,
    "matchScore" DOUBLE PRECISION NOT NULL,
    "matchReasons" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedByAdminId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DedupCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpVerification" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "hashedOtp" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovtCrossCheckResult" (
    "id" TEXT NOT NULL,
    "traineeId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "matchFound" BOOLEAN NOT NULL,
    "matchConfidence" DOUBLE PRECISION,
    "matchedRecordSummary" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovtCrossCheckResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillGapSnapshot" (
    "id" TEXT NOT NULL,
    "traineeId" TEXT NOT NULL,
    "jdTitle" TEXT NOT NULL,
    "missingSkills" TEXT NOT NULL,
    "atsScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillGapSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseRelevanceScore" (
    "id" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "totalClaims" INTEGER NOT NULL,
    "confirmedCount" INTEGER NOT NULL,
    "deniedCount" INTEGER NOT NULL,
    "employerReasonBreakdown" TEXT NOT NULL,
    "traineeReasonBreakdown" TEXT NOT NULL,
    "topMissingSkills" TEXT NOT NULL,
    "relevanceScore" DOUBLE PRECISION,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseRelevanceScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderAccessToken" (
    "id" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ProviderAccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlGroupRecord" (
    "id" TEXT NOT NULL,
    "ageBand" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "priorQualification" TEXT NOT NULL,
    "employmentStatus" TEXT NOT NULL,
    "wageBand" TEXT,
    "isSynthetic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ControlGroupRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CANDIDATE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "traineeId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "headline" TEXT,
    "location" TEXT,
    "education" TEXT,
    "experienceSummary" TEXT,
    "githubUrl" TEXT,
    "linkedinUrl" TEXT,
    "targetRoles" TEXT,
    "preferredLocations" TEXT,
    "preferredWorkMode" TEXT,
    "salaryPreference" TEXT,
    "profileCompleteness" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerReadinessSnapshot" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "resumeScore" INTEGER NOT NULL,
    "skillScore" INTEGER NOT NULL,
    "projectScore" INTEGER NOT NULL,
    "interviewScore" INTEGER NOT NULL,
    "portfolioScore" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareerReadinessSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerAction" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "skill" TEXT,
    "estimatedEffort" TEXT,
    "expectedImpact" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CareerAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "applicationLink" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SAVED',
    "rejectionReason" TEXT,
    "appliedDate" TIMESTAMP(3),
    "responseDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationEvent" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerPassportItem" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "issuedBy" TEXT,
    "issuedAt" TIMESTAMP(3),
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareerPassportItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewSession" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "overallScore" INTEGER,
    "feedbackSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewQnA" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "skill" TEXT,
    "difficulty" TEXT,
    "expectedConcepts" TEXT,
    "answer" TEXT,
    "detectedConcepts" TEXT,
    "missingConcepts" TEXT,
    "score" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewQnA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillEvidence" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "evidenceType" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "evidenceDetails" TEXT,
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "actorRole" TEXT,
    "targetType" TEXT,
    "targetId" TEXT,
    "details" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiCacheEntry" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiCacheEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiUsageMetric" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "dailyCount" INTEGER NOT NULL DEFAULT 0,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastRequest" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateKey" TEXT NOT NULL,

    CONSTRAINT "ApiUsageMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "onetCode" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "aliases" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TargetRole" (
    "id" TEXT NOT NULL,
    "onetCode" TEXT,
    "title" TEXT NOT NULL,
    "family" TEXT,
    "zone" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TargetRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleSkillRequirement" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "importance" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "level" TEXT NOT NULL DEFAULT 'REQUIRED',

    CONSTRAINT "RoleSkillRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSkill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "proficiency" TEXT,
    "provenance" TEXT NOT NULL DEFAULT 'DECLARED',
    "evidenceSource" TEXT,
    "lastVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseRecommendation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "skillsCovered" TEXT NOT NULL,
    "duration" TEXT,
    "level" TEXT,
    "isFree" BOOLEAN NOT NULL DEFAULT true,
    "isGovt" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentEventLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "agent" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Trainee_phoneNumber_key" ON "Trainee"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Trainee_githubId_key" ON "Trainee"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "Trainee_linkedinId_key" ON "Trainee"("linkedinId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployerVerification_outcomeCheckInId_key" ON "EmployerVerification"("outcomeCheckInId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployerVerification_verificationToken_key" ON "EmployerVerification"("verificationToken");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_githubUsername_key" ON "AdminUser"("githubUsername");

-- CreateIndex
CREATE UNIQUE INDEX "DedupCandidate_traineeIdA_traineeIdB_key" ON "DedupCandidate"("traineeIdA", "traineeIdB");

-- CreateIndex
CREATE INDEX "OtpVerification_phoneNumber_idx" ON "OtpVerification"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CourseRelevanceScore_courseName_providerName_key" ON "CourseRelevanceScore"("courseName", "providerName");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderAccessToken_token_key" ON "ProviderAccessToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_traineeId_key" ON "User"("traineeId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_tokenHash_idx" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateProfile_userId_key" ON "CandidateProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiCacheEntry_cacheKey_key" ON "ApiCacheEntry"("cacheKey");

-- CreateIndex
CREATE INDEX "ApiCacheEntry_cacheKey_idx" ON "ApiCacheEntry"("cacheKey");

-- CreateIndex
CREATE INDEX "ApiCacheEntry_expiresAt_idx" ON "ApiCacheEntry"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApiUsageMetric_provider_endpoint_dateKey_key" ON "ApiUsageMetric"("provider", "endpoint", "dateKey");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_onetCode_key" ON "Skill"("onetCode");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TargetRole_onetCode_key" ON "TargetRole"("onetCode");

-- CreateIndex
CREATE UNIQUE INDEX "RoleSkillRequirement_roleId_skillId_key" ON "RoleSkillRequirement"("roleId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSkill_userId_skillId_key" ON "UserSkill"("userId", "skillId");

-- AddForeignKey
ALTER TABLE "Enrolment" ADD CONSTRAINT "Enrolment_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutcomeCheckIn" ADD CONSTRAINT "OutcomeCheckIn_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployerVerification" ADD CONSTRAINT "EmployerVerification_outcomeCheckInId_fkey" FOREIGN KEY ("outcomeCheckInId") REFERENCES "OutcomeCheckIn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployerVerification" ADD CONSTRAINT "EmployerVerification_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminActionLog" ADD CONSTRAINT "AdminActionLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DedupCandidate" ADD CONSTRAINT "DedupCandidate_traineeIdA_fkey" FOREIGN KEY ("traineeIdA") REFERENCES "Trainee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DedupCandidate" ADD CONSTRAINT "DedupCandidate_traineeIdB_fkey" FOREIGN KEY ("traineeIdB") REFERENCES "Trainee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DedupCandidate" ADD CONSTRAINT "DedupCandidate_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovtCrossCheckResult" ADD CONSTRAINT "GovtCrossCheckResult_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillGapSnapshot" ADD CONSTRAINT "SkillGapSnapshot_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerReadinessSnapshot" ADD CONSTRAINT "CareerReadinessSnapshot_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerAction" ADD CONSTRAINT "CareerAction_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationEvent" ADD CONSTRAINT "ApplicationEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "JobApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerPassportItem" ADD CONSTRAINT "CareerPassportItem_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewQnA" ADD CONSTRAINT "InterviewQnA_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillEvidence" ADD CONSTRAINT "SkillEvidence_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleSkillRequirement" ADD CONSTRAINT "RoleSkillRequirement_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "TargetRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleSkillRequirement" ADD CONSTRAINT "RoleSkillRequirement_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentEventLog" ADD CONSTRAINT "AgentEventLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

