-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "offerId" TEXT,
ADD COLUMN     "productId" TEXT,
ADD COLUMN     "subjectIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ProductOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
