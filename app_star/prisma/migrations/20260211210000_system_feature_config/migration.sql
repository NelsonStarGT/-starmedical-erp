-- System feature flags singleton for internal behavior governance.

CREATE TABLE IF NOT EXISTS "SystemFeatureConfig" (
  "id" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "flags" JSONB NOT NULL,
  "strictMode" BOOLEAN NOT NULL DEFAULT false,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemFeatureConfig_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SystemFeatureConfig_updatedByUserId_fkey"
    FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "SystemFeatureConfig_updatedAt_idx"
  ON "SystemFeatureConfig"("updatedAt");

CREATE INDEX IF NOT EXISTS "SystemFeatureConfig_updatedByUserId_idx"
  ON "SystemFeatureConfig"("updatedByUserId");

INSERT INTO "SystemFeatureConfig" (
  "id",
  "version",
  "flags",
  "strictMode",
  "updatedByUserId"
) VALUES (
  'global',
  1,
  CAST('{"portal":{"enabled":true,"strictAvailability":true},"sat":{"requireActiveSeries":true},"branches":{"preventDeactivateWithFutureAppointments":true},"theme":{"requireValidHex":true},"reception":{"forceBranchSelection":true}}' AS jsonb),
  false,
  NULL
)
ON CONFLICT ("id") DO NOTHING;
