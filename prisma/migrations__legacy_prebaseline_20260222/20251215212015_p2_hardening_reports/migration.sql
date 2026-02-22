-- AlterTable
ALTER TABLE "InventoryEmailSetting" ADD COLUMN     "lastSentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "InventoryReportLog" (
    "id" TEXT NOT NULL,
    "settingId" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "error" TEXT,

    CONSTRAINT "InventoryReportLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryReportLog_settingId_periodFrom_periodTo_key" ON "InventoryReportLog"("settingId", "periodFrom", "periodTo");

-- AddForeignKey
ALTER TABLE "InventoryReportLog" ADD CONSTRAINT "InventoryReportLog_settingId_fkey" FOREIGN KEY ("settingId") REFERENCES "InventoryEmailSetting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
