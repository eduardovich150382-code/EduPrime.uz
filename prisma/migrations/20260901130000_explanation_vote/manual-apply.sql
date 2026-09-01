BEGIN;

-- CreateTable
CREATE TABLE "ExplanationVote" (
    "userId" TEXT NOT NULL,
    "explanationId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExplanationVote_pkey" PRIMARY KEY ("userId","explanationId")
);

-- AddForeignKey
ALTER TABLE "ExplanationVote" ADD CONSTRAINT "ExplanationVote_explanationId_fkey" FOREIGN KEY ("explanationId") REFERENCES "ItemExplanation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES (gen_random_uuid()::text, '591f9125cbc439f8dc44e3501425f4df692ac7b489a929b1a80617845ebffb65', now(), '20260901130000_explanation_vote', NULL, NULL, now(), 1);

COMMIT;
