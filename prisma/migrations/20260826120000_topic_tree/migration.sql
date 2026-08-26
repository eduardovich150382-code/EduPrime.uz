-- CreateTable
CREATE TABLE "TopicNode" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "parentId" TEXT,
    "slug" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "nameUz" TEXT NOT NULL,
    "nameRu" TEXT,
    "nameEn" TEXT,
    "grade" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TopicNode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TopicNode_path_idx" ON "TopicNode"("path");

-- CreateIndex
CREATE INDEX "TopicNode_subjectId_level_order_idx" ON "TopicNode"("subjectId", "level", "order");

-- CreateIndex
CREATE UNIQUE INDEX "TopicNode_subjectId_slug_key" ON "TopicNode"("subjectId", "slug");

-- AddForeignKey
ALTER TABLE "TopicNode" ADD CONSTRAINT "TopicNode_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicNode" ADD CONSTRAINT "TopicNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "TopicNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

