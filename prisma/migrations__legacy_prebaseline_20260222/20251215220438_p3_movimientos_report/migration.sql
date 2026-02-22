/*
  Warnings:

  - Added the required column `reportType` to the `InventoryReportLog` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "InventoryReportType" AS ENUM ('KARDEX', 'MOVIMIENTOS');

-- AlterTable
ALTER TABLE "InventoryEmailSetting" ADD COLUMN     "reportType" "InventoryReportType" NOT NULL DEFAULT 'KARDEX';

-- AlterTable
ALTER TABLE "InventoryReportLog" ADD COLUMN     "reportType" "InventoryReportType" NOT NULL;
