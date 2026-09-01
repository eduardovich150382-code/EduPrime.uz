BEGIN;

-- CreateTable
CREATE TABLE "ItemExplanation" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "forAnswer" TEXT NOT NULL DEFAULT '',
    "text" TEXT NOT NULL,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "promotedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemExplanation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemExplanation_itemId_lang_idx" ON "ItemExplanation"("itemId", "lang");

-- CreateIndex
CREATE UNIQUE INDEX "ItemExplanation_itemId_lang_forAnswer_key" ON "ItemExplanation"("itemId", "lang", "forAnswer");

-- AddForeignKey
ALTER TABLE "ItemExplanation" ADD CONSTRAINT "ItemExplanation_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES (gen_random_uuid()::text, 'fa43969e558d65b6315b280e173e97cfdfd7938628b9549c369d0780ccecccda', now(), '20260901120000_item_explanation', NULL, NULL, now(), 1);

COMMIT;
