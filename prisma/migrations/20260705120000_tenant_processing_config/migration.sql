-- Tenant processing configuration for document-processing control panel.

CREATE TABLE IF NOT EXISTS "TenantProcessingConfig" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "storageProvider" TEXT NOT NULL DEFAULT 's3',
  "bucket" TEXT NOT NULL DEFAULT 'processing-artifacts',
  "prefix" TEXT NOT NULL DEFAULT 'tenants',
  "retentionDaysByJobType" JSONB,
  "maxUploadMB" INTEGER NOT NULL DEFAULT 8,
  "maxRowsExcel" INTEGER NOT NULL DEFAULT 5000,
  "maxPagesPdf" INTEGER NOT NULL DEFAULT 120,
  "timeoutMs" INTEGER NOT NULL DEFAULT 15000,
  "maxConcurrency" INTEGER NOT NULL DEFAULT 2,
  "allowedJobTypes" JSONB,
  "notifyOnFailure" BOOLEAN NOT NULL DEFAULT true,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantProcessingConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TenantProcessingConfig_tenantId_key"
  ON "TenantProcessingConfig"("tenantId");

CREATE INDEX IF NOT EXISTS "TenantProcessingConfig_updatedAt_idx"
  ON "TenantProcessingConfig"("updatedAt");
