BEGIN;

-- CreateEnum
CREATE TYPE "CampaignReferralStatus" AS ENUM ('PENDING', 'ACTIVE', 'LEFT', 'INVALID');

-- CreateEnum
CREATE TYPE "CampaignPostKind" AS ENUM ('SHARE', 'ANNOUNCE', 'LEADERBOARD', 'LAST_DAY', 'WINNERS');

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "channelUsername" TEXT NOT NULL,
    "channelLink" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "rewardTiers" JSONB NOT NULL,
    "baseRewardMin" INTEGER,
    "baseRewardPct" INTEGER,
    "promoValidDays" INTEGER NOT NULL DEFAULT 5,
    "dailyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "texts" JSONB NOT NULL DEFAULT '{}',
    "lastDailySentAt" TIMESTAMP(3),
    "lastDayReminderSentAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignParticipant" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "refCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignReferral" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "referredTelegramId" BIGINT NOT NULL,
    "referredUsername" TEXT,
    "referredFirstName" TEXT,
    "status" "CampaignReferralStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "checkedAt" TIMESTAMP(3),

    CONSTRAINT "CampaignReferral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignPost" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "kind" "CampaignPostKind" NOT NULL,
    "text" TEXT NOT NULL,
    "imageUrl" TEXT,
    "buttonText" TEXT,
    "buttonUrl" TEXT,
    "channelMessageId" INTEGER,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "campaignId" TEXT,
    "telegramId" BIGINT NOT NULL,
    "percent" INTEGER NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Campaign_isPublished_startsAt_endsAt_idx" ON "Campaign"("isPublished", "startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignParticipant_refCode_key" ON "CampaignParticipant"("refCode");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignParticipant_campaignId_telegramId_key" ON "CampaignParticipant"("campaignId", "telegramId");

-- CreateIndex
CREATE INDEX "CampaignReferral_participantId_status_idx" ON "CampaignReferral"("participantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignReferral_campaignId_referredTelegramId_key" ON "CampaignReferral"("campaignId", "referredTelegramId");

-- CreateIndex
CREATE INDEX "CampaignPost_campaignId_kind_idx" ON "CampaignPost"("campaignId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");

-- CreateIndex
CREATE INDEX "PromoCode_campaignId_idx" ON "PromoCode"("campaignId");

-- AddForeignKey
ALTER TABLE "CampaignParticipant" ADD CONSTRAINT "CampaignParticipant_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignReferral" ADD CONSTRAINT "CampaignReferral_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignReferral" ADD CONSTRAINT "CampaignReferral_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "CampaignParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignPost" ADD CONSTRAINT "CampaignPost_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES (gen_random_uuid()::text, 'fca74c381bc453d769efab3035150d0dbdda233d1701a1e1370171bf85a3ea25', now(), '20261112120000_add_campaigns', NULL, NULL, now(), 1);

COMMIT;
