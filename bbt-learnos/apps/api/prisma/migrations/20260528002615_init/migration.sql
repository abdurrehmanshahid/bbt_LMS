-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('LEARNER', 'CREATOR', 'ADMIN', 'EMPLOYER', 'FRANCHISE_OWNER');

-- CreateEnum
CREATE TYPE "AbsorptionStatus" AS ENUM ('INELIGIBLE', 'ELIGIBLE', 'UNDER_REVIEW', 'ABSORBED', 'REFERRED');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('REEL', 'LECTURE', 'LIVE_RECORDING', 'RESOURCE');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PENDING_MODERATION', 'APPROVED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "ModerationDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'HELD');

-- CreateEnum
CREATE TYPE "EnrollmentPlan" AS ENUM ('FREE', 'MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentGateway" AS ENUM ('STRIPE', 'JAZZCASH', 'EASYPAISA');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CohortStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DISBANDED');

-- CreateEnum
CREATE TYPE "LiveSessionStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PsdaStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('STRIPE_CONNECT', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'LEARNER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learner_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentTrackId" TEXT,
    "currentModuleId" TEXT,
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "absorptionScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "absorptionStatus" "AbsorptionStatus" NOT NULL DEFAULT 'INELIGIBLE',
    "franchiseId" TEXT,

    CONSTRAINT "learner_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 1,
    "displayName" TEXT NOT NULL,
    "bio" TEXT NOT NULL DEFAULT '',
    "qualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "moderationFlags" INTEGER NOT NULL DEFAULT 0,
    "revenueSharePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationDetails" JSONB,
    "tierUpgradeRequestedAt" TIMESTAMP(3),
    "stripeConnectAccountId" TEXT,
    "stripeConnectOnboarded" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "creator_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracks" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "trackNumber" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "enrollmentCount" INTEGER NOT NULL DEFAULT 0,
    "avgCompletionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL,
    "passingScore" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "questions" JSONB,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concepts" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "concepts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concept_prerequisites" (
    "conceptId" TEXT NOT NULL,
    "prerequisiteId" TEXT NOT NULL,

    CONSTRAINT "concept_prerequisites_pkey" PRIMARY KEY ("conceptId","prerequisiteId")
);

-- CreateTable
CREATE TABLE "content" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "moduleId" TEXT,
    "conceptId" TEXT,
    "type" "ContentType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "muxAssetId" TEXT,
    "muxPlaybackId" TEXT,
    "duration" INTEGER,
    "transcript" TEXT,
    "thumbnailUrl" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "tags" TEXT[],
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "saveCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_tag_maps" (
    "contentId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_tag_maps_pkey" PRIMARY KEY ("contentId","tagId")
);

-- CreateTable
CREATE TABLE "challenges" (
    "id" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "isPinned" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_records" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "adminId" TEXT,
    "decision" "ModerationDecision" NOT NULL DEFAULT 'PENDING',
    "feedbackJson" JSONB,
    "aiFlags" JSONB,
    "aiConfidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "plan" "EnrollmentPlan" NOT NULL DEFAULT 'FREE',
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "stripeSubscriptionId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "score" DOUBLE PRECISION NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answers" JSONB NOT NULL,
    "flaggedForReview" BOOLEAN NOT NULL DEFAULT false,
    "reviewReason" TEXT,
    "sessionStartedAt" TIMESTAMP(3) NOT NULL,
    "submissionDuration" INTEGER NOT NULL,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_badges" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "badgeJson" JSONB NOT NULL,
    "verificationUrl" TEXT NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "skill_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cohorts" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "maxSize" INTEGER NOT NULL DEFAULT 20,
    "status" "CohortStatus" NOT NULL DEFAULT 'ACTIVE',
    "moduleStartIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cohorts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cohort_members" (
    "cohortId" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "cohort_members_pkey" PRIMARY KEY ("cohortId","learnerId")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "gateway" "PaymentGateway" NOT NULL,
    "gatewayTransactionId" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "franchises" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "psdaStatus" "PsdaStatus" NOT NULL DEFAULT 'PENDING',
    "navttcStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "complianceCheckedAt" TIMESTAMP(3),
    "complianceChecklist" JSONB,
    "revenueSharePercent" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "setupFeeAmount" DOUBLE PRECISION NOT NULL,
    "setupFeePaid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "franchises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_gaps" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "suggestedTrack" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_gaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "employerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "track" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "isRemote" BOOLEAN NOT NULL DEFAULT false,
    "type" TEXT NOT NULL,
    "salaryMin" DOUBLE PRECISION,
    "salaryMax" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "closingDate" TIMESTAMP(3),
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_requests" (
    "id" TEXT NOT NULL,
    "employerId" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "contact_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_aug_requests" (
    "id" TEXT NOT NULL,
    "employerId" TEXT NOT NULL,
    "skills" TEXT[],
    "duration" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "maxHourlyBudget" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_aug_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hire_team_requests" (
    "id" TEXT NOT NULL,
    "employerId" TEXT NOT NULL,
    "roles" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hire_team_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lti_platforms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "authLoginUrl" TEXT NOT NULL,
    "authTokenUrl" TEXT NOT NULL,
    "keySetUrl" TEXT NOT NULL,
    "accessTokenUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lti_platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lti_launches" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "learnerId" TEXT,
    "contextId" TEXT NOT NULL,
    "resourceLinkId" TEXT NOT NULL,
    "lineItemUrl" TEXT,
    "nrpsUrl" TEXT,
    "deepLinkingData" JSONB,
    "launchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lti_launches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lti_nonces" (
    "id" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lti_nonces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_sessions" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "LiveSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "dailyRoomName" TEXT,
    "dailyRoomUrl" TEXT,
    "recordingUrl" TEXT,
    "maxParticipants" INTEGER NOT NULL DEFAULT 100,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentorship_slots" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Office Hours',
    "durationMin" INTEGER NOT NULL DEFAULT 30,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mentorship_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentorship_bookings" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "dailyRoomUrl" TEXT,
    "dailyRoomName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mentorship_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "followerId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("followerId","creatorId")
);

-- CreateTable
CREATE TABLE "content_comments" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "hiddenReason" TEXT,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_reports" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_reactions" (
    "userId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_reactions_pkey" PRIMARY KEY ("userId","contentId")
);

-- CreateTable
CREATE TABLE "creator_payouts" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "method" "PayoutMethod" NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "stripeTransferId" TEXT,
    "stripeConnectAccountId" TEXT,
    "bankRef" TEXT,
    "notes" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "processedById" TEXT,

    CONSTRAINT "creator_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "learner_profiles_userId_key" ON "learner_profiles"("userId");

-- CreateIndex
CREATE INDEX "learner_profiles_userId_idx" ON "learner_profiles"("userId");

-- CreateIndex
CREATE INDEX "learner_profiles_currentTrackId_idx" ON "learner_profiles"("currentTrackId");

-- CreateIndex
CREATE INDEX "learner_profiles_absorptionStatus_idx" ON "learner_profiles"("absorptionStatus");

-- CreateIndex
CREATE INDEX "learner_profiles_franchiseId_idx" ON "learner_profiles"("franchiseId");

-- CreateIndex
CREATE UNIQUE INDEX "creator_profiles_userId_key" ON "creator_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "creator_profiles_displayName_key" ON "creator_profiles"("displayName");

-- CreateIndex
CREATE INDEX "creator_profiles_userId_idx" ON "creator_profiles"("userId");

-- CreateIndex
CREATE INDEX "creator_profiles_tier_idx" ON "creator_profiles"("tier");

-- CreateIndex
CREATE INDEX "creator_profiles_tierUpgradeRequestedAt_idx" ON "creator_profiles"("tierUpgradeRequestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "tracks_slug_key" ON "tracks"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tracks_trackNumber_key" ON "tracks"("trackNumber");

-- CreateIndex
CREATE INDEX "tracks_slug_idx" ON "tracks"("slug");

-- CreateIndex
CREATE INDEX "tracks_isActive_idx" ON "tracks"("isActive");

-- CreateIndex
CREATE INDEX "modules_trackId_idx" ON "modules"("trackId");

-- CreateIndex
CREATE UNIQUE INDEX "modules_trackId_order_key" ON "modules"("trackId", "order");

-- CreateIndex
CREATE INDEX "concepts_moduleId_idx" ON "concepts"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "concepts_moduleId_order_key" ON "concepts"("moduleId", "order");

-- CreateIndex
CREATE INDEX "concept_prerequisites_conceptId_idx" ON "concept_prerequisites"("conceptId");

-- CreateIndex
CREATE INDEX "concept_prerequisites_prerequisiteId_idx" ON "concept_prerequisites"("prerequisiteId");

-- CreateIndex
CREATE INDEX "content_creatorId_idx" ON "content"("creatorId");

-- CreateIndex
CREATE INDEX "content_trackId_status_idx" ON "content"("trackId", "status");

-- CreateIndex
CREATE INDEX "content_moduleId_idx" ON "content"("moduleId");

-- CreateIndex
CREATE INDEX "content_conceptId_idx" ON "content"("conceptId");

-- CreateIndex
CREATE INDEX "content_status_idx" ON "content"("status");

-- CreateIndex
CREATE INDEX "content_createdAt_idx" ON "content"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "content_tags_slug_key" ON "content_tags"("slug");

-- CreateIndex
CREATE INDEX "content_tags_slug_idx" ON "content_tags"("slug");

-- CreateIndex
CREATE INDEX "content_tags_useCount_idx" ON "content_tags"("useCount");

-- CreateIndex
CREATE INDEX "content_tag_maps_contentId_idx" ON "content_tag_maps"("contentId");

-- CreateIndex
CREATE INDEX "content_tag_maps_tagId_idx" ON "content_tag_maps"("tagId");

-- CreateIndex
CREATE INDEX "content_tag_maps_createdAt_idx" ON "content_tag_maps"("createdAt");

-- CreateIndex
CREATE INDEX "challenges_tagId_idx" ON "challenges"("tagId");

-- CreateIndex
CREATE INDEX "challenges_isPinned_startsAt_idx" ON "challenges"("isPinned", "startsAt");

-- CreateIndex
CREATE INDEX "challenges_endsAt_idx" ON "challenges"("endsAt");

-- CreateIndex
CREATE INDEX "challenges_createdById_idx" ON "challenges"("createdById");

-- CreateIndex
CREATE INDEX "moderation_records_contentId_idx" ON "moderation_records"("contentId");

-- CreateIndex
CREATE INDEX "moderation_records_adminId_idx" ON "moderation_records"("adminId");

-- CreateIndex
CREATE INDEX "moderation_records_decision_idx" ON "moderation_records"("decision");

-- CreateIndex
CREATE INDEX "enrollments_learnerId_status_idx" ON "enrollments"("learnerId", "status");

-- CreateIndex
CREATE INDEX "enrollments_trackId_idx" ON "enrollments"("trackId");

-- CreateIndex
CREATE INDEX "enrollments_stripeSubscriptionId_idx" ON "enrollments"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_learnerId_trackId_key" ON "enrollments"("learnerId", "trackId");

-- CreateIndex
CREATE INDEX "assessments_learnerId_moduleId_idx" ON "assessments"("learnerId", "moduleId");

-- CreateIndex
CREATE INDEX "assessments_moduleId_idx" ON "assessments"("moduleId");

-- CreateIndex
CREATE INDEX "assessments_flaggedForReview_idx" ON "assessments"("flaggedForReview");

-- CreateIndex
CREATE INDEX "skill_badges_learnerId_idx" ON "skill_badges"("learnerId");

-- CreateIndex
CREATE INDEX "skill_badges_conceptId_idx" ON "skill_badges"("conceptId");

-- CreateIndex
CREATE INDEX "skill_badges_isRevoked_idx" ON "skill_badges"("isRevoked");

-- CreateIndex
CREATE UNIQUE INDEX "skill_badges_learnerId_conceptId_key" ON "skill_badges"("learnerId", "conceptId");

-- CreateIndex
CREATE INDEX "cohorts_trackId_status_idx" ON "cohorts"("trackId", "status");

-- CreateIndex
CREATE INDEX "cohort_members_cohortId_idx" ON "cohort_members"("cohortId");

-- CreateIndex
CREATE INDEX "cohort_members_learnerId_idx" ON "cohort_members"("learnerId");

-- CreateIndex
CREATE INDEX "payments_userId_idx" ON "payments"("userId");

-- CreateIndex
CREATE INDEX "payments_gateway_status_idx" ON "payments"("gateway", "status");

-- CreateIndex
CREATE INDEX "payments_createdAt_idx" ON "payments"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "franchises_ownerId_key" ON "franchises"("ownerId");

-- CreateIndex
CREATE INDEX "franchises_ownerId_idx" ON "franchises"("ownerId");

-- CreateIndex
CREATE INDEX "franchises_psdaStatus_idx" ON "franchises"("psdaStatus");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_sentAt_idx" ON "notifications"("sentAt");

-- CreateIndex
CREATE INDEX "content_gaps_count_idx" ON "content_gaps"("count");

-- CreateIndex
CREATE INDEX "content_gaps_lastSeenAt_idx" ON "content_gaps"("lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "content_gaps_query_type_key" ON "content_gaps"("query", "type");

-- CreateIndex
CREATE INDEX "opportunities_track_isApproved_idx" ON "opportunities"("track", "isApproved");

-- CreateIndex
CREATE INDEX "opportunities_closingDate_idx" ON "opportunities"("closingDate");

-- CreateIndex
CREATE INDEX "contact_requests_learnerId_status_idx" ON "contact_requests"("learnerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "contact_requests_employerId_learnerId_key" ON "contact_requests"("employerId", "learnerId");

-- CreateIndex
CREATE INDEX "staff_aug_requests_status_idx" ON "staff_aug_requests"("status");

-- CreateIndex
CREATE INDEX "hire_team_requests_status_idx" ON "hire_team_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "lti_platforms_clientId_key" ON "lti_platforms"("clientId");

-- CreateIndex
CREATE INDEX "lti_platforms_clientId_idx" ON "lti_platforms"("clientId");

-- CreateIndex
CREATE INDEX "lti_launches_platformId_idx" ON "lti_launches"("platformId");

-- CreateIndex
CREATE INDEX "lti_launches_learnerId_idx" ON "lti_launches"("learnerId");

-- CreateIndex
CREATE UNIQUE INDEX "lti_nonces_nonce_key" ON "lti_nonces"("nonce");

-- CreateIndex
CREATE INDEX "lti_nonces_nonce_idx" ON "lti_nonces"("nonce");

-- CreateIndex
CREATE INDEX "lti_nonces_expiresAt_idx" ON "lti_nonces"("expiresAt");

-- CreateIndex
CREATE INDEX "live_sessions_creatorId_idx" ON "live_sessions"("creatorId");

-- CreateIndex
CREATE INDEX "live_sessions_trackId_status_idx" ON "live_sessions"("trackId", "status");

-- CreateIndex
CREATE INDEX "live_sessions_scheduledAt_idx" ON "live_sessions"("scheduledAt");

-- CreateIndex
CREATE INDEX "mentorship_slots_creatorId_isBooked_idx" ON "mentorship_slots"("creatorId", "isBooked");

-- CreateIndex
CREATE INDEX "mentorship_slots_startsAt_idx" ON "mentorship_slots"("startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "mentorship_bookings_slotId_key" ON "mentorship_bookings"("slotId");

-- CreateIndex
CREATE INDEX "mentorship_bookings_learnerId_idx" ON "mentorship_bookings"("learnerId");

-- CreateIndex
CREATE INDEX "mentorship_bookings_status_idx" ON "mentorship_bookings"("status");

-- CreateIndex
CREATE INDEX "follows_creatorId_idx" ON "follows"("creatorId");

-- CreateIndex
CREATE INDEX "content_comments_contentId_createdAt_idx" ON "content_comments"("contentId", "createdAt");

-- CreateIndex
CREATE INDEX "content_comments_userId_idx" ON "content_comments"("userId");

-- CreateIndex
CREATE INDEX "content_comments_isHidden_createdAt_idx" ON "content_comments"("isHidden", "createdAt");

-- CreateIndex
CREATE INDEX "comment_reports_commentId_idx" ON "comment_reports"("commentId");

-- CreateIndex
CREATE UNIQUE INDEX "comment_reports_commentId_reporterId_key" ON "comment_reports"("commentId", "reporterId");

-- CreateIndex
CREATE INDEX "content_reactions_contentId_idx" ON "content_reactions"("contentId");

-- CreateIndex
CREATE INDEX "creator_payouts_creatorId_status_idx" ON "creator_payouts"("creatorId", "status");

-- CreateIndex
CREATE INDEX "creator_payouts_status_requestedAt_idx" ON "creator_payouts"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "creator_payouts_processedById_idx" ON "creator_payouts"("processedById");

-- AddForeignKey
ALTER TABLE "learner_profiles" ADD CONSTRAINT "learner_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learner_profiles" ADD CONSTRAINT "learner_profiles_currentTrackId_fkey" FOREIGN KEY ("currentTrackId") REFERENCES "tracks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learner_profiles" ADD CONSTRAINT "learner_profiles_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "franchises"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_profiles" ADD CONSTRAINT "creator_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concepts" ADD CONSTRAINT "concepts_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_prerequisites" ADD CONSTRAINT "concept_prerequisites_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_prerequisites" ADD CONSTRAINT "concept_prerequisites_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content" ADD CONSTRAINT "content_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content" ADD CONSTRAINT "content_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content" ADD CONSTRAINT "content_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content" ADD CONSTRAINT "content_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "concepts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_tag_maps" ADD CONSTRAINT "content_tag_maps_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_tag_maps" ADD CONSTRAINT "content_tag_maps_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "content_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "content_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_records" ADD CONSTRAINT "moderation_records_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_records" ADD CONSTRAINT "moderation_records_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_badges" ADD CONSTRAINT "skill_badges_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_badges" ADD CONSTRAINT "skill_badges_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "concepts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohort_members" ADD CONSTRAINT "cohort_members_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohort_members" ADD CONSTRAINT "cohort_members_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "franchises" ADD CONSTRAINT "franchises_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_aug_requests" ADD CONSTRAINT "staff_aug_requests_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hire_team_requests" ADD CONSTRAINT "hire_team_requests_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lti_launches" ADD CONSTRAINT "lti_launches_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "lti_platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lti_launches" ADD CONSTRAINT "lti_launches_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentorship_slots" ADD CONSTRAINT "mentorship_slots_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentorship_bookings" ADD CONSTRAINT "mentorship_bookings_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "mentorship_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentorship_bookings" ADD CONSTRAINT "mentorship_bookings_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_comments" ADD CONSTRAINT "content_comments_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_comments" ADD CONSTRAINT "content_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_comments" ADD CONSTRAINT "content_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "content_comments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "comment_reports" ADD CONSTRAINT "comment_reports_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "content_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_reports" ADD CONSTRAINT "comment_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_reactions" ADD CONSTRAINT "content_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_reactions" ADD CONSTRAINT "content_reactions_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_payouts" ADD CONSTRAINT "creator_payouts_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_payouts" ADD CONSTRAINT "creator_payouts_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
