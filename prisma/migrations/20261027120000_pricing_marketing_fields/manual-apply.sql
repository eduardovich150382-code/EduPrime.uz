BEGIN;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "featuresEn" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "featuresRu" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "featuresUz" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "taglineEn" TEXT,
ADD COLUMN     "taglineRu" TEXT,
ADD COLUMN     "taglineUz" TEXT;

-- AlterTable
ALTER TABLE "ProductOffer" ADD COLUMN     "badgeEn" TEXT,
ADD COLUMN     "badgeRu" TEXT,
ADD COLUMN     "badgeUz" TEXT,
ADD COLUMN     "compareAtPrice" INTEGER,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "promoUntil" TIMESTAMP(3);

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES (gen_random_uuid()::text, '09d156baecaedd7ec81a1e67f0d7baa91f1ba2c476c20898e5e9ddfda5d43b76', now(), '20261027120000_pricing_marketing_fields', NULL, NULL, now(), 1);

COMMIT;
