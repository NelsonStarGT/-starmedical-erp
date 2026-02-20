CREATE TABLE "OpsMetricsSnapshot" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tenantId" TEXT,
  "branchId" TEXT,
  "projectName" TEXT NOT NULL,
  "range" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "durationMs" INTEGER,
  "requestId" TEXT,
  "source" TEXT,
  "buildCommit" TEXT,
  "buildVersion" TEXT,

  CONSTRAINT "OpsMetricsSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OpsMetricsSnapshotService" (
  "id" TEXT NOT NULL,
  "snapshotId" TEXT NOT NULL,
  "tenantId" TEXT,
  "serviceKey" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "cpuPercent" DOUBLE PRECISION,
  "memoryBytes" BIGINT,
  "memoryPercent" DOUBLE PRECISION,
  "netRxBps" DOUBLE PRECISION,
  "netTxBps" DOUBLE PRECISION,
  "bandwidthBps" DOUBLE PRECISION,
  "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OpsMetricsSnapshotService_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OpsAlertEvent" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tenantId" TEXT,
  "branchId" TEXT,
  "level" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT,
  "serviceKey" TEXT,
  "summary" TEXT NOT NULL,
  "detailJson" JSONB,
  "dedupeKey" TEXT NOT NULL,
  "cooldownUntil" TIMESTAMP(3),
  "requestId" TEXT,
  "source" TEXT,

  CONSTRAINT "OpsAlertEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OpsSchedulerConfig" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "frequencySeconds" INTEGER NOT NULL DEFAULT 120,
  "channelsJson" JSONB,
  "recipientsJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OpsSchedulerConfig_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OpsMetricsSnapshot_tenantId_createdAt_idx" ON "OpsMetricsSnapshot"("tenantId", "createdAt");
CREATE INDEX "OpsMetricsSnapshot_status_createdAt_idx" ON "OpsMetricsSnapshot"("status", "createdAt");
CREATE INDEX "OpsMetricsSnapshot_requestId_idx" ON "OpsMetricsSnapshot"("requestId");

CREATE INDEX "OpsMetricsSnapshotService_snapshotId_idx" ON "OpsMetricsSnapshotService"("snapshotId");
CREATE INDEX "OpsMetricsSnapshotService_tenantId_checkedAt_idx" ON "OpsMetricsSnapshotService"("tenantId", "checkedAt");
CREATE INDEX "OpsMetricsSnapshotService_serviceKey_status_checkedAt_idx" ON "OpsMetricsSnapshotService"("serviceKey", "status", "checkedAt");

CREATE INDEX "OpsAlertEvent_tenantId_createdAt_idx" ON "OpsAlertEvent"("tenantId", "createdAt");
CREATE INDEX "OpsAlertEvent_type_level_createdAt_idx" ON "OpsAlertEvent"("type", "level", "createdAt");
CREATE INDEX "OpsAlertEvent_serviceKey_createdAt_idx" ON "OpsAlertEvent"("serviceKey", "createdAt");
CREATE INDEX "OpsAlertEvent_dedupeKey_createdAt_idx" ON "OpsAlertEvent"("dedupeKey", "createdAt");

CREATE UNIQUE INDEX "OpsSchedulerConfig_tenantId_key" ON "OpsSchedulerConfig"("tenantId");
CREATE INDEX "OpsSchedulerConfig_updatedAt_idx" ON "OpsSchedulerConfig"("updatedAt");

ALTER TABLE "OpsMetricsSnapshotService"
  ADD CONSTRAINT "OpsMetricsSnapshotService_snapshotId_fkey"
  FOREIGN KEY ("snapshotId") REFERENCES "OpsMetricsSnapshot"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
