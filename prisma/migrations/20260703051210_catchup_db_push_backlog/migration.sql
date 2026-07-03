-- DropIndex
DROP INDEX "Review_stationId_userId_key";

-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "detectPaused" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "probePaused" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "consTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "prosTags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Station" ADD COLUMN     "announcements_en" JSONB,
ADD COLUMN     "commissionRate" TEXT,
ADD COLUMN     "description_en" TEXT,
ADD COLUMN     "description_enHash" TEXT,
ADD COLUMN     "info_en" JSONB,
ADD COLUMN     "monitoringPaused" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "opsNote" TEXT,
ADD COLUMN     "referralUrl" TEXT,
ADD COLUMN     "retiredAt" TIMESTAMP(3),
ADD COLUMN     "routes_en" JSONB,
ADD COLUMN     "settlement" TEXT;

-- AlterTable
ALTER TABLE "Submission" DROP COLUMN "foundedAt",
ADD COLUMN     "invoice" TEXT,
ADD COLUMN     "payment" TEXT,
ADD COLUMN     "promo" TEXT,
ADD COLUMN     "refund" TEXT,
ADD COLUMN     "resultNote" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bannedAt" TIMESTAMP(3),
ADD COLUMN     "bannedReason" TEXT,
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "googleId" TEXT,
ADD COLUMN     "inviteCode" TEXT,
ADD COLUMN     "invitedById" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';

-- CreateTable
CREATE TABLE "RevenueEntry" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "ym" TEXT NOT NULL,
    "amountRmb" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevenueEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Content" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "title_en" TEXT,
    "title_enHash" TEXT,
    "body" TEXT NOT NULL,
    "body_en" TEXT,
    "body_enHash" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Log" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "recordTitle" TEXT,
    "difference" JSONB,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "user" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreeApi" (
    "id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL DEFAULT '',
    "context" TEXT NOT NULL,
    "maxOutput" TEXT NOT NULL,
    "bindCard" TEXT NOT NULL DEFAULT '免绑卡',
    "network" TEXT NOT NULL DEFAULT '国内直连',
    "quota" TEXT NOT NULL,
    "quota_en" TEXT,
    "quota_enHash" TEXT,
    "modality" TEXT NOT NULL DEFAULT '',
    "endsAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortWeight" INTEGER NOT NULL DEFAULT 0,
    "claimUrl" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreeApi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelayPromo" (
    "id" TEXT NOT NULL,
    "station" TEXT NOT NULL,
    "host" TEXT NOT NULL DEFAULT '',
    "logoUrl" TEXT NOT NULL DEFAULT '',
    "activity" TEXT NOT NULL,
    "activity_en" TEXT,
    "activity_enHash" TEXT,
    "eligibility" TEXT NOT NULL DEFAULT '',
    "eligibility_en" TEXT,
    "eligibility_enHash" TEXT,
    "steps" TEXT NOT NULL DEFAULT '',
    "steps_en" TEXT,
    "steps_enHash" TEXT,
    "terms" TEXT NOT NULL DEFAULT '',
    "terms_en" TEXT,
    "terms_enHash" TEXT,
    "endsAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortWeight" INTEGER NOT NULL DEFAULT 0,
    "claimUrl" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RelayPromo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranslationFailure" (
    "id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "fieldPath" TEXT NOT NULL,
    "srcHash" TEXT NOT NULL,
    "error" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "attemptedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranslationFailure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanLock" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "pid" TEXT,

    CONSTRAINT "ScanLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerification" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "inviteRef" TEXT,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitHit" (
    "id" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitHit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailWhitelist" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "note" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailWhitelist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RevenueEntry_stationId_ym_key" ON "RevenueEntry"("stationId", "ym");

-- CreateIndex
CREATE UNIQUE INDEX "Content_key_key" ON "Content"("key");

-- CreateIndex
CREATE INDEX "Log_resource_createdAt_idx" ON "Log"("resource", "createdAt");

-- CreateIndex
CREATE INDEX "FreeApi_active_sortWeight_idx" ON "FreeApi"("active", "sortWeight");

-- CreateIndex
CREATE INDEX "RelayPromo_active_sortWeight_idx" ON "RelayPromo"("active", "sortWeight");

-- CreateIndex
CREATE UNIQUE INDEX "TranslationFailure_model_recordId_fieldPath_key" ON "TranslationFailure"("model", "recordId", "fieldPath");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerification_email_key" ON "EmailVerification"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RateLimitHit_bucket_createdAt_idx" ON "RateLimitHit"("bucket", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailWhitelist_domain_key" ON "EmailWhitelist"("domain");

-- CreateIndex
CREATE INDEX "Review_stationId_createdAt_idx" ON "Review"("stationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_inviteCode_key" ON "User"("inviteCode");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueEntry" ADD CONSTRAINT "RevenueEntry_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

