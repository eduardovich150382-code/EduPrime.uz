BEGIN;

-- AlterTable
ALTER TABLE "CourseLesson" ADD COLUMN     "checkpoints" JSONB;

-- AlterTable
ALTER TABLE "LessonBlock" ADD COLUMN     "checkpoints" JSONB;

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES (gen_random_uuid()::text, '234484d1b8e1314b6b362697abdee4ca8d00aded229cd6302dd3485917ade461', now(), '20260904165147_add_video_checkpoints', NULL, NULL, now(), 1);

COMMIT;
