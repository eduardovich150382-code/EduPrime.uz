BEGIN;

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

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES (gen_random_uuid()::text, '3861b3aeb15e749c7534d272473b14a0738cde949e1be3822ef9b51a174c358b', now(), '20261029120000_bot_start_tracking', NULL, NULL, now(), 1);

COMMIT;
