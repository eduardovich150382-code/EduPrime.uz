-- AlterTable
ALTER TABLE "ImportJob" ADD COLUMN     "pagesDone" JSONB NOT NULL DEFAULT '[]';

-- CreateIndex
CREATE UNIQUE INDEX "ImportAsset_jobId_page_sha256_key" ON "ImportAsset"("jobId", "page", "sha256");

