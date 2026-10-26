BEGIN;

-- AlterTable
ALTER TABLE "Test" ADD COLUMN     "isMock" BOOLEAN NOT NULL DEFAULT false;

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES (gen_random_uuid()::text, 'e8bff6d9780f349e0e68b9fc2b87f35bdf1a063f7416e9f8778ca055add50a23', now(), '20261026010000_add_test_is_mock', NULL, NULL, now(), 1);

COMMIT;
