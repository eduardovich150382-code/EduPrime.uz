-- CreateTable
CREATE TABLE "DailyUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "builtTests" INTEGER NOT NULL DEFAULT 0,
    "dtmOnline" INTEGER NOT NULL DEFAULT 0,
    "solutionsUnlocked" INTEGER NOT NULL DEFAULT 0,
    "tutorMessages" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DailyUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolutionUnlock" (
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolutionUnlock_pkey" PRIMARY KEY ("userId","itemId")
);

-- CreateIndex
CREATE INDEX "DailyUsage_userId_date_idx" ON "DailyUsage"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyUsage_userId_date_key" ON "DailyUsage"("userId", "date");

-- CreateIndex
CREATE INDEX "SolutionUnlock_userId_unlockedAt_idx" ON "SolutionUnlock"("userId", "unlockedAt");

-- AddForeignKey
ALTER TABLE "DailyUsage" ADD CONSTRAINT "DailyUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

