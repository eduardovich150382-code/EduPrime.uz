BEGIN;

-- AlterTable
ALTER TABLE "ImportJob" ADD COLUMN     "pagesDone" JSONB NOT NULL DEFAULT '[]';

-- CreateIndex
CREATE UNIQUE INDEX "ImportAsset_jobId_page_sha256_key" ON "ImportAsset"("jobId", "page", "sha256");

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES (gen_random_uuid()::text, 'c26c09b22a5da91eb6b1e5d876f73ef46da1facaacbf1cf2e602e6550475b38a', now(), '20260911080000_import_asset_dedupe', NULL, NULL, now(), 1);

COMMIT;
