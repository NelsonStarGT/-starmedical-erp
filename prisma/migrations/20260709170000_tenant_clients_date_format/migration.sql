DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClientsDateFormat') THEN
    CREATE TYPE "ClientsDateFormat" AS ENUM ('DMY', 'MDY', 'YMD');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "TenantClientsConfig" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "clientsDateFormat" "ClientsDateFormat" NOT NULL DEFAULT 'DMY'::"ClientsDateFormat",
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantClientsConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TenantClientsConfig_tenantId_key" ON "TenantClientsConfig"("tenantId");
CREATE INDEX IF NOT EXISTS "TenantClientsConfig_updatedAt_idx" ON "TenantClientsConfig"("updatedAt");
