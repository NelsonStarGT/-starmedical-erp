CREATE TABLE "ReceptionSlaConfig" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "applyToAllAreas" BOOLEAN NOT NULL DEFAULT true,
    "waitingWarningMin" INTEGER NOT NULL DEFAULT 20,
    "waitingCriticalMin" INTEGER NOT NULL DEFAULT 40,
    "inServiceMaxMin" INTEGER NOT NULL DEFAULT 60,
    "calledWarningMin" INTEGER NOT NULL DEFAULT 10,
    "pausedWarningMin" INTEGER NOT NULL DEFAULT 15,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceptionSlaConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReceptionSlaAreaConfig" (
    "id" TEXT NOT NULL,
    "slaConfigId" TEXT NOT NULL,
    "area" "OperationalArea" NOT NULL,
    "priority" "VisitPriority",
    "waitingWarningMin" INTEGER NOT NULL,
    "waitingCriticalMin" INTEGER NOT NULL,
    "inServiceMaxMin" INTEGER NOT NULL,
    "calledWarningMin" INTEGER,
    "pausedWarningMin" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceptionSlaAreaConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReceptionVisitVitals" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "systolicBp" INTEGER NOT NULL,
    "diastolicBp" INTEGER NOT NULL,
    "heartRate" INTEGER,
    "temperatureC" DOUBLE PRECISION,
    "weightKg" DOUBLE PRECISION,
    "heightCm" DOUBLE PRECISION,
    "observations" TEXT,
    "vitalsJson" JSONB,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceptionVisitVitals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReceptionSlaConfig_branchId_key" ON "ReceptionSlaConfig"("branchId");
CREATE INDEX "ReceptionSlaConfig_updatedByUserId_idx" ON "ReceptionSlaConfig"("updatedByUserId");

CREATE UNIQUE INDEX "ReceptionSlaAreaConfig_slaConfigId_area_priority_key" ON "ReceptionSlaAreaConfig"("slaConfigId", "area", "priority");
CREATE INDEX "ReceptionSlaAreaConfig_area_priority_idx" ON "ReceptionSlaAreaConfig"("area", "priority");

CREATE UNIQUE INDEX "ReceptionVisitVitals_visitId_key" ON "ReceptionVisitVitals"("visitId");
CREATE INDEX "ReceptionVisitVitals_siteId_idx" ON "ReceptionVisitVitals"("siteId");
CREATE INDEX "ReceptionVisitVitals_createdByUserId_idx" ON "ReceptionVisitVitals"("createdByUserId");

ALTER TABLE "ReceptionSlaConfig"
ADD CONSTRAINT "ReceptionSlaConfig_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReceptionSlaConfig"
ADD CONSTRAINT "ReceptionSlaConfig_updatedByUserId_fkey"
FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReceptionSlaAreaConfig"
ADD CONSTRAINT "ReceptionSlaAreaConfig_slaConfigId_fkey"
FOREIGN KEY ("slaConfigId") REFERENCES "ReceptionSlaConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReceptionVisitVitals"
ADD CONSTRAINT "ReceptionVisitVitals_visitId_fkey"
FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReceptionVisitVitals"
ADD CONSTRAINT "ReceptionVisitVitals_siteId_fkey"
FOREIGN KEY ("siteId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReceptionVisitVitals"
ADD CONSTRAINT "ReceptionVisitVitals_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
