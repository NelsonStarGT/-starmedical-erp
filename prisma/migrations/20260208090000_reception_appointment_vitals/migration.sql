CREATE TABLE "ReceptionAppointmentVitals" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
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

    CONSTRAINT "ReceptionAppointmentVitals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReceptionAppointmentVitals_appointmentId_key" ON "ReceptionAppointmentVitals"("appointmentId");
CREATE INDEX "ReceptionAppointmentVitals_siteId_idx" ON "ReceptionAppointmentVitals"("siteId");
CREATE INDEX "ReceptionAppointmentVitals_createdByUserId_idx" ON "ReceptionAppointmentVitals"("createdByUserId");

ALTER TABLE "ReceptionAppointmentVitals"
ADD CONSTRAINT "ReceptionAppointmentVitals_appointmentId_fkey"
FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReceptionAppointmentVitals"
ADD CONSTRAINT "ReceptionAppointmentVitals_siteId_fkey"
FOREIGN KEY ("siteId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReceptionAppointmentVitals"
ADD CONSTRAINT "ReceptionAppointmentVitals_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
