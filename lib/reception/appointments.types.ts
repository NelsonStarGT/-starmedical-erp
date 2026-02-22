import type { AppointmentStatus, OperationalArea, QueueItemStatus } from "@prisma/client";

export type ReceptionVisitType = "consult" | "lab";

// Draft mínimo para crear una cita desde Recepción.
export type ReceptionAppointmentDraft = {
  siteId?: string;
  patientId: string;
  visitType: ReceptionVisitType;
  specialty?: string | null; // requerido si visitType=consult
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  reasonText?: string | null; // requerido si visitType=consult (motivo administrativo)
  arrivedToday?: boolean; // si true y date=hoy -> crea Visit + QueueItem
};

export type ReceptionAppointmentCreateResult = {
  appointmentId: string;
  scheduledAt: string; // ISO
  createdQueueItem: boolean;
  visitId: string | null;
  ticketCode: string | null;
};

export type ReceptionAppointment = {
  id: string;
  scheduledAt: string; // ISO
  status: AppointmentStatus;
  patientId: string;
  specialistId: string;
  typeId: string;
  notes: string | null;
};

export type ReceptionQueueItem = {
  id: string;
  visitId: string;
  status: QueueItemStatus;
  area: OperationalArea;
  createdAt: string; // ISO
};

