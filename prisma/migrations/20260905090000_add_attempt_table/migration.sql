-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "sessionId" TEXT,
    "testResultId" TEXT,
    "answer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "timeSpentSec" INTEGER NOT NULL DEFAULT 0,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Attempt_itemId_answeredAt_idx" ON "Attempt"("itemId", "answeredAt");

-- CreateIndex
CREATE INDEX "Attempt_userId_itemId_idx" ON "Attempt"("userId", "itemId");

-- CreateIndex
CREATE INDEX "Attempt_userId_isCorrect_answeredAt_idx" ON "Attempt"("userId", "isCorrect", "answeredAt");

