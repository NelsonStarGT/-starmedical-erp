DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClientsDateFormat') THEN
    CREATE TYPE "ClientsDateFormat" AS ENUM ('DMY', 'MDY', 'YMD');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TenantTimeFormat') THEN
    CREATE TYPE "TenantTimeFormat" AS ENUM ('H12', 'H24');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TenantWeekStartsOn') THEN
    CREATE TYPE "TenantWeekStartsOn" AS ENUM ('MON', 'SUN');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "TenantDateTimeConfig" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "dateFormat" "ClientsDateFormat" NOT NULL DEFAULT 'DMY'::"ClientsDateFormat",
  "timeFormat" "TenantTimeFormat" NOT NULL DEFAULT 'H24'::"TenantTimeFormat",
  "timezone" TEXT NOT NULL DEFAULT 'America/Guatemala',
  "weekStartsOn" "TenantWeekStartsOn" NOT NULL DEFAULT 'MON'::"TenantWeekStartsOn",
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantDateTimeConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TenantDateTimeConfig_tenantId_key" ON "TenantDateTimeConfig"("tenantId");
CREATE INDEX IF NOT EXISTS "TenantDateTimeConfig_updatedAt_idx" ON "TenantDateTimeConfig"("updatedAt");
