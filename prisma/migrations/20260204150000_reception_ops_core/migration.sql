-- Reception v2 (operativo): tablas/enums base para Visit/Queue/QueueItem.
-- Motivo: la DB local puede estar migrada parcialmente y faltar tablas críticas (P2021).

-- CreateEnum
CREATE TYPE "OperationalArea" AS ENUM ('CONSULTATION', 'LAB', 'XRAY', 'ULTRASOUND', 'URGENT_CARE');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('ARRIVED', 'CHECKED_IN', 'IN_QUEUE', 'CALLED', 'IN_SERVICE', 'IN_DIAGNOSTIC', 'READY_FOR_DISCHARGE', 'CHECKED_OUT', 'ON_HOLD', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "VisitSource" AS ENUM ('WALK_IN', 'APPOINTMENT', 'REFERRAL', 'TRANSFER');

-- CreateEnum
CREATE TYPE "VisitEventType" AS ENUM ('STATE_CHANGE', 'ADMISSION_CREATED', 'QUEUE', 'ADD_TO_QUEUE', 'CALL_NEXT', 'START_SERVICE', 'QUEUE_ITEM_DONE', 'SKIP_QUEUE_ITEM', 'QUEUE_ITEM_PAUSED', 'QUEUE_ITEM_RESUMED', 'QUEUE_ITEM_TRANSFERRED', 'REORDER_QUEUE', 'SERVICE_REQUEST', 'SERVICE_REQUEST_CREATED', 'SERVICE_REQUEST_ASSIGNED', 'SERVICE_REQUEST_STARTED', 'SERVICE_REQUEST_COMPLETED', 'SERVICE_REQUEST_CANCELLED', 'INCIDENT', 'NOTE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "QueueItemStatus" AS ENUM ('WAITING', 'CALLED', 'IN_SERVICE', 'PAUSED', 'COMPLETED', 'SKIPPED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "VisitPriority" AS ENUM ('URGENT', 'COMPANY', 'PREFERENTIAL', 'NORMAL');

-- CreateEnum
CREATE TYPE "ServiceRequestStatus" AS ENUM ('REQUESTED', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OperationalIncidentStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "OperationalIncidentType" AS ENUM ('PROCESS_DELAY', 'EQUIPMENT_FAILURE', 'PATIENT_COMPLAINT', 'SAFETY', 'OTHER');

-- CreateEnum
CREATE TYPE "OperationalIncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "source" "VisitSource" NOT NULL DEFAULT 'WALK_IN',
    "ticketCode" TEXT NOT NULL,
    "ticketDateKey" TEXT NOT NULL,
    "ticketArea" "OperationalArea" NOT NULL,
    "initialArea" "OperationalArea" NOT NULL,
    "currentArea" "OperationalArea" NOT NULL,
    "priority" "VisitPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "VisitStatus" NOT NULL DEFAULT 'ARRIVED',
    "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arrivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedInAt" TIMESTAMP(3),
    "checkedOutAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "noShowAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitEvent" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "eventType" "VisitEventType" NOT NULL,
    "fromStatus" "VisitStatus",
    "toStatus" "VisitStatus",
    "area" "OperationalArea",
    "queueId" TEXT,
    "queueItemId" TEXT,
    "serviceRequestId" TEXT,
    "operationalIncidentId" TEXT,
    "note" TEXT,
    "metadata" JSONB,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Queue" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "area" "OperationalArea" NOT NULL,
    "status" "QueueStatus" NOT NULL DEFAULT 'ACTIVE',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueueItem" (
    "id" TEXT NOT NULL,
    "queueId" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "status" "QueueItemStatus" NOT NULL DEFAULT 'WAITING',
    "priority" "VisitPriority" NOT NULL DEFAULT 'NORMAL',
    "roomId" TEXT,
    "sequence" INTEGER,
    "enqueuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "notes" TEXT,
    "assignedToUserId" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QueueItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalIncident" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "queueItemId" TEXT,
    "area" "OperationalArea",
    "type" "OperationalIncidentType" NOT NULL,
    "severity" "OperationalIncidentSeverity" NOT NULL DEFAULT 'LOW',
    "status" "OperationalIncidentStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "reportedByUserId" TEXT,
    "resolvedByUserId" TEXT,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationalIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "area" "OperationalArea" NOT NULL,
    "status" "ServiceRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "description" TEXT,
    "requestedByUserId" TEXT,
    "assignedToUserId" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "externalRef" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketSequence" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "area" "OperationalArea" NOT NULL,
    "dateKey" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Visit_siteId_ticketDateKey_ticketArea_idx" ON "Visit"("siteId", "ticketDateKey", "ticketArea");

-- CreateIndex
CREATE INDEX "Visit_patientId_arrivedAt_idx" ON "Visit"("patientId", "arrivedAt");

-- CreateIndex
CREATE INDEX "Visit_siteId_status_idx" ON "Visit"("siteId", "status");

-- CreateIndex
CREATE INDEX "Visit_siteId_status_createdAt_idx" ON "Visit"("siteId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Visit_siteId_currentArea_status_idx" ON "Visit"("siteId", "currentArea", "status");

-- CreateIndex
CREATE INDEX "Visit_appointmentId_idx" ON "Visit"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Visit_siteId_ticketDateKey_ticketArea_ticketCode_key" ON "Visit"("siteId", "ticketDateKey", "ticketArea", "ticketCode");

-- CreateIndex
CREATE INDEX "VisitEvent_visitId_createdAt_idx" ON "VisitEvent"("visitId", "createdAt");

-- CreateIndex
CREATE INDEX "VisitEvent_eventType_idx" ON "VisitEvent"("eventType");

-- CreateIndex
CREATE INDEX "VisitEvent_actorUserId_idx" ON "VisitEvent"("actorUserId");

-- CreateIndex
CREATE INDEX "Queue_status_idx" ON "Queue"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Queue_siteId_area_key" ON "Queue"("siteId", "area");

-- CreateIndex
CREATE INDEX "QueueItem_queueId_status_idx" ON "QueueItem"("queueId", "status");

-- CreateIndex
CREATE INDEX "QueueItem_queueId_status_enqueuedAt_idx" ON "QueueItem"("queueId", "status", "enqueuedAt");

-- CreateIndex
CREATE INDEX "QueueItem_visitId_idx" ON "QueueItem"("visitId");

-- CreateIndex
CREATE INDEX "QueueItem_status_enqueuedAt_idx" ON "QueueItem"("status", "enqueuedAt");

-- CreateIndex
CREATE INDEX "QueueItem_assignedToUserId_status_idx" ON "QueueItem"("assignedToUserId", "status");

-- CreateIndex
CREATE INDEX "QueueItem_roomId_idx" ON "QueueItem"("roomId");

-- CreateIndex
CREATE INDEX "OperationalIncident_visitId_idx" ON "OperationalIncident"("visitId");

-- CreateIndex
CREATE INDEX "OperationalIncident_status_severity_idx" ON "OperationalIncident"("status", "severity");

-- CreateIndex
CREATE INDEX "OperationalIncident_area_idx" ON "OperationalIncident"("area");

-- CreateIndex
CREATE INDEX "ServiceRequest_visitId_status_idx" ON "ServiceRequest"("visitId", "status");

-- CreateIndex
CREATE INDEX "ServiceRequest_area_status_idx" ON "ServiceRequest"("area", "status");

-- CreateIndex
CREATE INDEX "ServiceRequest_area_status_createdAt_idx" ON "ServiceRequest"("area", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceRequest_status_createdAt_idx" ON "ServiceRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceRequest_requestedAt_idx" ON "ServiceRequest"("requestedAt");

-- CreateIndex
CREATE INDEX "TicketSequence_dateKey_idx" ON "TicketSequence"("dateKey");

-- CreateIndex
CREATE UNIQUE INDEX "TicketSequence_siteId_area_dateKey_key" ON "TicketSequence"("siteId", "area", "dateKey");

-- CreateIndex
CREATE INDEX "LabMessageLog_createdAt_idx" ON "LabMessageLog"("createdAt");

-- CreateIndex
CREATE INDEX "LabSample_createdAt_idx" ON "LabSample"("createdAt");

-- CreateIndex
CREATE INDEX "LabTestItem_priority_idx" ON "LabTestItem"("priority");

-- CreateIndex
CREATE INDEX "LabTestItem_createdAt_idx" ON "LabTestItem"("createdAt");

-- CreateIndex
CREATE INDEX "LabTestOrder_createdAt_idx" ON "LabTestOrder"("createdAt");

-- CreateIndex
CREATE INDEX "LabTestResult_status_idx" ON "LabTestResult"("status");

-- CreateIndex
CREATE INDEX "LabTestResult_createdAt_idx" ON "LabTestResult"("createdAt");

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "ClientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitEvent" ADD CONSTRAINT "VisitEvent_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitEvent" ADD CONSTRAINT "VisitEvent_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitEvent" ADD CONSTRAINT "VisitEvent_queueItemId_fkey" FOREIGN KEY ("queueItemId") REFERENCES "QueueItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitEvent" ADD CONSTRAINT "VisitEvent_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitEvent" ADD CONSTRAINT "VisitEvent_operationalIncidentId_fkey" FOREIGN KEY ("operationalIncidentId") REFERENCES "OperationalIncident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitEvent" ADD CONSTRAINT "VisitEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Queue" ADD CONSTRAINT "Queue_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Queue" ADD CONSTRAINT "Queue_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Queue" ADD CONSTRAINT "Queue_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueItem" ADD CONSTRAINT "QueueItem_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueItem" ADD CONSTRAINT "QueueItem_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueItem" ADD CONSTRAINT "QueueItem_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueItem" ADD CONSTRAINT "QueueItem_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueItem" ADD CONSTRAINT "QueueItem_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueItem" ADD CONSTRAINT "QueueItem_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalIncident" ADD CONSTRAINT "OperationalIncident_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalIncident" ADD CONSTRAINT "OperationalIncident_queueItemId_fkey" FOREIGN KEY ("queueItemId") REFERENCES "QueueItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalIncident" ADD CONSTRAINT "OperationalIncident_reportedByUserId_fkey" FOREIGN KEY ("reportedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalIncident" ADD CONSTRAINT "OperationalIncident_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketSequence" ADD CONSTRAINT "TicketSequence_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

