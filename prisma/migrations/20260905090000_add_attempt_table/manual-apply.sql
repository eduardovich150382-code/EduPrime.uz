BEGIN;

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "sessionId" TEXT,
    "testResultId" TEXT,
    "answer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "timeSpentSec" INTEGER NOT NULL DEFAULT 0,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Attempt_itemId_answeredAt_idx" ON "Attempt"("itemId", "answeredAt");

-- CreateIndex
CREATE INDEX "Attempt_userId_itemId_idx" ON "Attempt"("userId", "itemId");

-- CreateIndex
CREATE INDEX "Attempt_userId_isCorrect_answeredAt_idx" ON "Attempt"("userId", "isCorrect", "answeredAt");

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES (gen_random_uuid()::text, '6d3056cb592776732b82c3c69d72cb1fbf6f69a0f2cacb88b914fe4c6f0dabfe', now(), '20260905090000_add_attempt_table', NULL, NULL, now(), 1);

COMMIT;
