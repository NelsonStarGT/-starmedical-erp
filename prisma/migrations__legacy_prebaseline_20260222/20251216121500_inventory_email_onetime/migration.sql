-- AlterTable
ALTER TABLE "InventoryEmailSetting" ADD COLUMN     "oneTimeDate" TIMESTAMP(3),
ADD COLUMN     "oneTimeTime" TEXT,
ADD COLUMN     "sentAt" TIMESTAMP(3);
