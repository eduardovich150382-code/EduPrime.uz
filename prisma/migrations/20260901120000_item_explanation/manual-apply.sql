BEGIN;

-- CreateTable
CREATE TABLE "ItemExplanation" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "forAnswer" TEXT,
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

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES (gen_random_uuid()::text, '3aef9cd321713553de6c1c21357ece702f9429c31068970029d243d70aec95ad', now(), '20260901120000_item_explanation', NULL, NULL, now(), 1);

COMMIT;
