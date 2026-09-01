-- CreateTable
CREATE TABLE "ExplanationVote" (
    "userId" TEXT NOT NULL,
    "explanationId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExplanationVote_pkey" PRIMARY KEY ("userId","explanationId")
);

-- AddForeignKey
ALTER TABLE "ExplanationVote" ADD CONSTRAINT "ExplanationVote_explanationId_fkey" FOREIGN KEY ("explanationId") REFERENCES "ItemExplanation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

