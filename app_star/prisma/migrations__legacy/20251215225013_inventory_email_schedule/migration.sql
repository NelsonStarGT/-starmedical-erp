-- AlterTable
ALTER TABLE "InventoryEmailSetting" ADD COLUMN     "biweeklyMode" TEXT DEFAULT 'FIXED_DAYS',
ADD COLUMN     "fixedDays" TEXT,
ADD COLUMN     "monthlyDay" INTEGER,
ADD COLUMN     "recipientsJson" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "scheduleType" TEXT NOT NULL DEFAULT 'BIWEEKLY',
ADD COLUMN     "sendTime" TEXT NOT NULL DEFAULT '23:30',
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/Guatemala',
ADD COLUMN     "useLastDay" BOOLEAN DEFAULT true;

-- Backfill new recipientsJson with existing recipients where present
UPDATE "InventoryEmailSetting"
SET "recipientsJson" = COALESCE(NULLIF(TRIM("recipients"), ''), '[]')
WHERE "recipientsJson" = '[]' AND TRIM("recipients") IS NOT NULL;
