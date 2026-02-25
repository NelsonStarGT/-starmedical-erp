-- Recovery: Configuración + Seguridad + Facturación por patente + Processing Service

-- Ensure global tenant exists before tenant-scoped backfills.
INSERT INTO "Tenant" ("id", "name", "isActive", "createdAt", "updatedAt")
VALUES ('global', 'Global', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Backfill tenantId in core config tables to avoid cross-tenant leaks on legacy rows.
UPDATE "User" SET "tenantId" = 'global' WHERE "tenantId" IS NULL;
UPDATE "Branch" SET "tenantId" = 'global' WHERE "tenantId" IS NULL;
UPDATE "LegalEntity" SET "tenantId" = 'global' WHERE "tenantId" IS NULL;
UPDATE "UserBranchAccess" SET "tenantId" = 'global' WHERE "tenantId" IS NULL;
UPDATE "BranchBillingProfile" SET "tenantId" = 'global' WHERE "tenantId" IS NULL;
UPDATE "TradeUnit" SET "tenantId" = 'global' WHERE "tenantId" IS NULL;

-- AuditLog hardening fields.
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "ip" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;

UPDATE "AuditLog"
SET "createdAt" = COALESCE("createdAt", "timestamp")
WHERE "createdAt" IS NULL;

CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");

-- Enum for processing-service auth mode.
DO $$
BEGIN
  CREATE TYPE "ProcessingServiceAuthMode" AS ENUM ('TOKEN', 'HMAC', 'TOKEN_HMAC');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "TenantThemePreference" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "theme" JSONB NOT NULL DEFAULT '{"primary":"#4aa59c","secondary":"#4aadf5","accent":"#4aadf5","bg":"#f8fafc","surface":"#ffffff","text":"#0f172a","structure":"#2e75ba"}',
  "fontHeadingKey" TEXT NOT NULL DEFAULT 'montserrat',
  "fontBodyKey" TEXT NOT NULL DEFAULT 'inter',
  "densityDefault" TEXT NOT NULL DEFAULT 'normal',
  "logoUrl" TEXT,
  "logoAssetId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantThemePreference_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TenantThemePreference_tenantId_key" UNIQUE ("tenantId"),
  CONSTRAINT "TenantThemePreference_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "TenantThemePreference_updatedAt_idx" ON "TenantThemePreference"("updatedAt");

CREATE TABLE IF NOT EXISTS "TenantNavigationPolicy" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "defaultSidebarCollapsed" BOOLEAN NOT NULL DEFAULT false,
  "forceSidebarCollapsed" BOOLEAN NOT NULL DEFAULT false,
  "moduleOrderingEnabled" BOOLEAN NOT NULL DEFAULT false,
  "moduleOrder" JSONB,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantNavigationPolicy_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TenantNavigationPolicy_tenantId_key" UNIQUE ("tenantId"),
  CONSTRAINT "TenantNavigationPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "TenantNavigationPolicy_updatedAt_idx" ON "TenantNavigationPolicy"("updatedAt");

CREATE TABLE IF NOT EXISTS "TenantSecurityPolicy" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 480,
  "enforce2FA" BOOLEAN NOT NULL DEFAULT false,
  "passwordMinLength" INTEGER NOT NULL DEFAULT 10,
  "passwordRequireUppercase" BOOLEAN NOT NULL DEFAULT true,
  "passwordRequireLowercase" BOOLEAN NOT NULL DEFAULT true,
  "passwordRequireNumber" BOOLEAN NOT NULL DEFAULT true,
  "passwordRequireSymbol" BOOLEAN NOT NULL DEFAULT false,
  "ipAllowlist" JSONB,
  "allowRememberMe" BOOLEAN NOT NULL DEFAULT true,
  "maxLoginAttempts" INTEGER NOT NULL DEFAULT 5,
  "lockoutMinutes" INTEGER NOT NULL DEFAULT 15,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantSecurityPolicy_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TenantSecurityPolicy_tenantId_key" UNIQUE ("tenantId"),
  CONSTRAINT "TenantSecurityPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "TenantSecurityPolicy_updatedAt_idx" ON "TenantSecurityPolicy"("updatedAt");

CREATE TABLE IF NOT EXISTS "ProcessingServiceConfig" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "baseUrl" TEXT NOT NULL,
  "authMode" "ProcessingServiceAuthMode" NOT NULL DEFAULT 'TOKEN_HMAC',
  "tokenRef" TEXT,
  "hmacSecretRef" TEXT,
  "enablePdf" BOOLEAN NOT NULL DEFAULT true,
  "enableExcel" BOOLEAN NOT NULL DEFAULT true,
  "enableDocx" BOOLEAN NOT NULL DEFAULT true,
  "enableImages" BOOLEAN NOT NULL DEFAULT true,
  "timeoutMs" INTEGER NOT NULL DEFAULT 12000,
  "retryCount" INTEGER NOT NULL DEFAULT 2,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProcessingServiceConfig_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProcessingServiceConfig_tenantId_key" UNIQUE ("tenantId"),
  CONSTRAINT "ProcessingServiceConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ProcessingServiceConfig_updatedAt_idx" ON "ProcessingServiceConfig"("updatedAt");

CREATE TABLE IF NOT EXISTS "TenantBillingPreference" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "defaultLegalEntityId" TEXT,
  "branchDefaults" JSONB,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantBillingPreference_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TenantBillingPreference_tenantId_key" UNIQUE ("tenantId"),
  CONSTRAINT "TenantBillingPreference_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TenantBillingPreference_defaultLegalEntityId_fkey" FOREIGN KEY ("defaultLegalEntityId") REFERENCES "LegalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "TenantBillingPreference_updatedAt_idx" ON "TenantBillingPreference"("updatedAt");

CREATE TABLE IF NOT EXISTS "BillingSeries" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "legalEntityId" TEXT NOT NULL,
  "branchId" TEXT,
  "name" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "nextNumber" INTEGER NOT NULL DEFAULT 1,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingSeries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BillingSeries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "BillingSeries_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "BillingSeries_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "BillingSeries_tenantId_idx" ON "BillingSeries"("tenantId");
CREATE INDEX IF NOT EXISTS "BillingSeries_legalEntityId_isActive_idx" ON "BillingSeries"("legalEntityId", "isActive");
CREATE INDEX IF NOT EXISTS "BillingSeries_branchId_idx" ON "BillingSeries"("branchId");
CREATE UNIQUE INDEX IF NOT EXISTS "BillingSeries_legalEntityId_branchId_name_key" ON "BillingSeries"("legalEntityId", "branchId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "BillingSeries_legalEntityId_branchId_prefix_key" ON "BillingSeries"("legalEntityId", "branchId", "prefix");

CREATE TABLE IF NOT EXISTS "Invoice" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "caseId" TEXT,
  "caseNumber" TEXT NOT NULL,
  "legalEntityId" TEXT NOT NULL,
  "billingSeriesId" TEXT NOT NULL,
  "serialPrefix" TEXT NOT NULL,
  "serialNumber" INTEGER NOT NULL,
  "totalAmount" DECIMAL(14,2) NOT NULL,
  "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'EMITIDA',
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "issuedByUserId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Invoice_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Invoice_billingSeriesId_fkey" FOREIGN KEY ("billingSeriesId") REFERENCES "BillingSeries"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Invoice_tenantId_status_idx" ON "Invoice"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "Invoice_legalEntityId_issuedAt_idx" ON "Invoice"("legalEntityId", "issuedAt");
CREATE INDEX IF NOT EXISTS "Invoice_caseId_idx" ON "Invoice"("caseId");
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_billingSeriesId_serialNumber_key" ON "Invoice"("billingSeriesId", "serialNumber");
