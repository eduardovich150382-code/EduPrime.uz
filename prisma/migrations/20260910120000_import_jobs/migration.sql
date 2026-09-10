-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('UPLOADED', 'PARSING', 'STRUCTURING', 'TRANSLATING', 'REVIEW', 'COMMITTED', 'FAILED');

-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EDITED');

-- AlterTable
ALTER TABLE "DailyUsage" ADD COLUMN     "imports" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileKind" TEXT NOT NULL,
    "sourceLang" TEXT NOT NULL DEFAULT 'uz',
    "targetLang" TEXT NOT NULL DEFAULT 'uz',
    "status" "ImportStatus" NOT NULL DEFAULT 'UPLOADED',
    "pageCount" INTEGER NOT NULL DEFAULT 0,
    "blockCount" INTEGER NOT NULL DEFAULT 0,
    "autoGreen" INTEGER NOT NULL DEFAULT 0,
    "costTokens" INTEGER NOT NULL DEFAULT 0,
    "model" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "committedAt" TIMESTAMP(3),

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportAsset" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "page" INTEGER NOT NULL,
    "bbox" JSONB NOT NULL,
    "url" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "widthPx" INTEGER NOT NULL,
    "heightPx" INTEGER NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'FIGURE',

    CONSTRAINT "ImportAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportDraft" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "raw" JSONB NOT NULL,
    "textOriginal" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "optionsOriginal" JSONB NOT NULL DEFAULT '[]',
    "options" JSONB NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL DEFAULT 'MULTIPLE_CHOICE',
    "explanation" TEXT,
    "topicGuess" TEXT,
    "bloomLevel" TEXT,
    "difficulty" INTEGER,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qualityScore" INTEGER NOT NULL DEFAULT 0,
    "issues" JSONB NOT NULL DEFAULT '[]',
    "sourcePage" INTEGER,
    "sourceBbox" JSONB,
    "status" "DraftStatus" NOT NULL DEFAULT 'PENDING',
    "itemId" TEXT,

    CONSTRAINT "ImportDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportJob_teacherId_status_idx" ON "ImportJob"("teacherId", "status");

-- CreateIndex
CREATE INDEX "ImportAsset_jobId_page_idx" ON "ImportAsset"("jobId", "page");

-- CreateIndex
CREATE INDEX "ImportAsset_jobId_sha256_idx" ON "ImportAsset"("jobId", "sha256");

-- CreateIndex
CREATE INDEX "ImportDraft_jobId_status_idx" ON "ImportDraft"("jobId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ImportDraft_jobId_order_key" ON "ImportDraft"("jobId", "order");

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportAsset" ADD CONSTRAINT "ImportAsset_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportDraft" ADD CONSTRAINT "ImportDraft_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

