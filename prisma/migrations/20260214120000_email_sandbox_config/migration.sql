-- Email sandbox config for Mailpit multi-tenant routing
CREATE TABLE "EmailSandboxConfig" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "modeDefault" TEXT NOT NULL DEFAULT 'INHERIT',
  "tenantModes" JSONB,
  "mailpitHost" TEXT NOT NULL DEFAULT '127.0.0.1',
  "mailpitSmtpPort" INTEGER NOT NULL DEFAULT 1025,
  "mailpitApiPort" INTEGER NOT NULL DEFAULT 8025,
  "aliasDomain" TEXT NOT NULL DEFAULT 'sandbox.starmedical.test',
  "retentionDays" INTEGER NOT NULL DEFAULT 3,
  "blockPhi" BOOLEAN NOT NULL DEFAULT true,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EmailSandboxConfig_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailSandboxConfig_updatedAt_idx" ON "EmailSandboxConfig"("updatedAt");
CREATE INDEX "EmailSandboxConfig_updatedByUserId_idx" ON "EmailSandboxConfig"("updatedByUserId");

INSERT INTO "EmailSandboxConfig" (
  "id",
  "enabled",
  "modeDefault",
  "tenantModes",
  "mailpitHost",
  "mailpitSmtpPort",
  "mailpitApiPort",
  "aliasDomain",
  "retentionDays",
  "blockPhi"
)
VALUES (
  'global',
  false,
  'INHERIT',
  '{}'::jsonb,
  '127.0.0.1',
  1025,
  8025,
  'sandbox.starmedical.test',
  3,
  true
)
ON CONFLICT ("id") DO NOTHING;
