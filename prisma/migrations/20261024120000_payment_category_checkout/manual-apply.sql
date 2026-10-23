BEGIN;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "offerId" TEXT,
ADD COLUMN     "productId" TEXT,
ADD COLUMN     "subjectIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ProductOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES (gen_random_uuid()::text, 'c08659f00be8d7d39ac0aeb0628b1ef8f2dbffca24e20acfb2bde280f306fe1a', now(), '20261024120000_payment_category_checkout', NULL, NULL, now(), 1);

COMMIT;
