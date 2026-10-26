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

