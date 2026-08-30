-- CreateEnum
CREATE TYPE "SessionMode" AS ENUM ('FIXED', 'ADAPTIVE');

-- DropForeignKey
ALTER TABLE "TestResult" DROP CONSTRAINT "TestResult_testId_fkey";

-- AlterTable
ALTER TABLE "TestResult" ADD COLUMN     "sessionId" TEXT,
ALTER COLUMN "testId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "TestSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "spec" JSONB NOT NULL,
    "itemIds" TEXT[],
    "seed" INTEGER NOT NULL,
    "mode" "SessionMode" NOT NULL DEFAULT 'FIXED',
    "durationMin" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "TestSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TestSession_userId_startedAt_idx" ON "TestSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "TestResult_sessionId_idx" ON "TestResult"("sessionId");

-- AddForeignKey
ALTER TABLE "TestSession" ADD CONSTRAINT "TestSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TestSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

