-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'RETIRED');

-- CreateEnum
CREATE TYPE "ItemSource" AS ENUM ('MANUAL', 'PARAMETRIC', 'AI');

-- CreateEnum
CREATE TYPE "ItemVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "ExplanationSource" AS ENUM ('AUTHORED', 'AI', 'NONE');

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "authorTeacherId" TEXT,
    "orgId" TEXT,
    "subjectId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "options" JSONB NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL DEFAULT 'MULTIPLE_CHOICE',
    "explanation" TEXT,
    "explanationImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "explanationSource" "ExplanationSource" NOT NULL DEFAULT 'NONE',
    "videoUrl" TEXT,
    "grade" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "exams" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bloomLevel" TEXT,
    "difficulty" INTEGER,
    "pValue" DOUBLE PRECISION,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lang" TEXT NOT NULL DEFAULT 'uz',
    "source" "ItemSource" NOT NULL DEFAULT 'MANUAL',
    "status" "ItemStatus" NOT NULL DEFAULT 'PUBLISHED',
    "visibility" "ItemVisibility" NOT NULL DEFAULT 'PRIVATE',
    "templateId" TEXT,
    "variantSig" TEXT,
    "legacyQuestionId" TEXT,
    "legacyBankId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemTopic" (
    "itemId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "ItemTopic_pkey" PRIMARY KEY ("itemId","topicId")
);

-- CreateTable
CREATE TABLE "TestItem" (
    "testId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "TestItem_pkey" PRIMARY KEY ("testId","itemId")
);

-- CreateTable
CREATE TABLE "ItemStat" (
    "itemId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "pValue" DOUBLE PRECISION,
    "discrimination" DOUBLE PRECISION,
    "avgTimeSec" DOUBLE PRECISION,
    "distractorHits" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemStat_pkey" PRIMARY KEY ("itemId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Item_variantSig_key" ON "Item"("variantSig");

-- CreateIndex
CREATE UNIQUE INDEX "Item_legacyQuestionId_key" ON "Item"("legacyQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "Item_legacyBankId_key" ON "Item"("legacyBankId");

-- CreateIndex
CREATE INDEX "Item_subjectId_status_visibility_idx" ON "Item"("subjectId", "status", "visibility");

-- CreateIndex
CREATE INDEX "Item_subjectId_difficulty_idx" ON "Item"("subjectId", "difficulty");

-- CreateIndex
CREATE INDEX "Item_templateId_idx" ON "Item"("templateId");

-- CreateIndex
CREATE INDEX "ItemTopic_topicId_idx" ON "ItemTopic"("topicId");

-- CreateIndex
CREATE INDEX "TestItem_testId_order_idx" ON "TestItem"("testId", "order");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTopic" ADD CONSTRAINT "ItemTopic_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTopic" ADD CONSTRAINT "ItemTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "TopicNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestItem" ADD CONSTRAINT "TestItem_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestItem" ADD CONSTRAINT "TestItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemStat" ADD CONSTRAINT "ItemStat_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

