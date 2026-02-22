-- Central Config: branches, SAT establishments, branch business hours and ERP theme singleton.

ALTER TABLE "Branch"
  ADD COLUMN IF NOT EXISTS "phone" TEXT,
  ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'America/Guatemala';

CREATE TABLE IF NOT EXISTS "BranchBusinessHours" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "validFrom" TIMESTAMP(3) NOT NULL,
  "validTo" TIMESTAMP(3),
  "scheduleJson" JSONB NOT NULL,
  "slotMinutesDefault" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BranchBusinessHours_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BranchBusinessHours_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "BranchSatEstablishment" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "satEstablishmentCode" TEXT NOT NULL,
  "legalName" TEXT NOT NULL,
  "tradeName" TEXT,
  "address" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BranchSatEstablishment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BranchSatEstablishment_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "BranchFelSeries" (
  "id" TEXT NOT NULL,
  "establishmentId" TEXT NOT NULL,
  "serie" TEXT NOT NULL,
  "documentType" TEXT NOT NULL DEFAULT 'FACTURA',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BranchFelSeries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BranchFelSeries_establishmentId_fkey"
    FOREIGN KEY ("establishmentId") REFERENCES "BranchSatEstablishment"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "TenantThemeConfig" (
  "id" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "theme" JSONB NOT NULL,
  "fontKey" TEXT NOT NULL DEFAULT 'inter',
  "logoUrl" TEXT,
  "logoAssetId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantThemeConfig_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TenantThemeConfig_logoAssetId_fkey"
    FOREIGN KEY ("logoAssetId") REFERENCES "FileAsset"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "TenantThemeConfig_updatedByUserId_fkey"
    FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "BranchBusinessHours_branchId_idx"
  ON "BranchBusinessHours"("branchId");

CREATE INDEX IF NOT EXISTS "BranchBusinessHours_branchId_validFrom_idx"
  ON "BranchBusinessHours"("branchId", "validFrom");

CREATE INDEX IF NOT EXISTS "BranchSatEstablishment_branchId_idx"
  ON "BranchSatEstablishment"("branchId");

CREATE UNIQUE INDEX IF NOT EXISTS "BranchSatEstablishment_satEstablishmentCode_key"
  ON "BranchSatEstablishment"("satEstablishmentCode");

CREATE INDEX IF NOT EXISTS "BranchFelSeries_establishmentId_idx"
  ON "BranchFelSeries"("establishmentId");

CREATE UNIQUE INDEX IF NOT EXISTS "BranchFelSeries_establishmentId_serie_documentType_key"
  ON "BranchFelSeries"("establishmentId", "serie", "documentType");

CREATE INDEX IF NOT EXISTS "TenantThemeConfig_updatedAt_idx"
  ON "TenantThemeConfig"("updatedAt");

CREATE INDEX IF NOT EXISTS "TenantThemeConfig_updatedByUserId_idx"
  ON "TenantThemeConfig"("updatedByUserId");

INSERT INTO "TenantThemeConfig" (
  "id",
  "version",
  "theme",
  "fontKey",
  "logoUrl",
  "logoAssetId",
  "updatedByUserId"
) VALUES (
  'global',
  1,
  CAST('{"primary":"#2e75ba","secondary":"#4aadf5","accent":"#4aa59c","bg":"#f8fafc","surface":"#ffffff","text":"#0f172a"}' AS jsonb),
  'inter',
  NULL,
  NULL,
  NULL
)
ON CONFLICT ("id") DO NOTHING;
