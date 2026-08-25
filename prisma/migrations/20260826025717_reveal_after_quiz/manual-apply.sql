BEGIN;

-- AlterTable
ALTER TABLE "LessonBlock" ADD COLUMN     "revealAfterQuiz" BOOLEAN NOT NULL DEFAULT false;

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES (gen_random_uuid()::text, '54d679520a42ddd8778923285458d1d72e55db87f2292b7763b89c66010c3fca', now(), '20260826025717_reveal_after_quiz', NULL, NULL, now(), 1);

COMMIT;
