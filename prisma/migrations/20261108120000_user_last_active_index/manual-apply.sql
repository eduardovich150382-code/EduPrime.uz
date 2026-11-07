BEGIN;

-- CreateIndex
CREATE INDEX "User_lastActiveAt_idx" ON "User"("lastActiveAt");

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES (gen_random_uuid()::text, 'd3a867f9d8590f4155d6a6f53bb2f74a903a1eccd3a9e7e13ea03a26f7fb16e3', now(), '20261108120000_user_last_active_index', NULL, NULL, now(), 1);

COMMIT;
