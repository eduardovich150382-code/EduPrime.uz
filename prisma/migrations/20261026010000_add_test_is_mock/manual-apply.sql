BEGIN;

-- AlterTable
ALTER TABLE "Test" ADD COLUMN     "isMock" BOOLEAN NOT NULL DEFAULT false;

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES (gen_random_uuid()::text, '40bf76e7052a8372a2d5d35c8064c2a044e73491c4da8906c49af3d2a5817ca2', now(), '20261026010000_add_test_is_mock', NULL, NULL, now(), 1);

COMMIT;
