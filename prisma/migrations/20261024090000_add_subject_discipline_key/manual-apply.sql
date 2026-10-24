BEGIN;

-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "disciplineKey" TEXT;

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES (gen_random_uuid()::text, 'e687a032d54ece31e594d2e2cbd9377500fb693c8e03a6ee9e58b82f37f3d0d8', now(), '20261024090000_add_subject_discipline_key', NULL, NULL, now(), 1);

COMMIT;
