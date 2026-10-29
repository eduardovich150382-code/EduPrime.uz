-- AlterTable
ALTER TABLE "User" ADD COLUMN     "adTestStartedAt" TIMESTAMP(3),
ADD COLUMN     "firstSource" TEXT;

-- CreateTable
CREATE TABLE "BotStart" (
    "id" TEXT NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "source" TEXT NOT NULL,
    "isFirst" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotStart_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BotStart_source_createdAt_idx" ON "BotStart"("source", "createdAt");

-- CreateIndex
CREATE INDEX "BotStart_telegramId_idx" ON "BotStart"("telegramId");

