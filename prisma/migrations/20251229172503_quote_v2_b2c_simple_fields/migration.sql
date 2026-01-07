-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "chequePayableTo" TEXT,
ADD COLUMN     "deliveryNote" TEXT,
ADD COLUMN     "deliveryTime" TEXT,
ADD COLUMN     "paymentTerms" TEXT,
ADD COLUMN     "pricesIncludeTax" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "QuoteItem" ADD COLUMN     "enlace" TEXT;
