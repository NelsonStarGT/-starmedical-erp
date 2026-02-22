import type { AppointmentStatus, OperationalArea, VisitPriority, QueueItemStatus, VisitStatus } from "@prisma/client";

export type VisitStatusCounts = {
  siteId: string;
  dateKey: string;
  arrived: number;
  checkedIn: number;
  inQueue: number;
  called: number;
  inService: number;
  inDiagnostic: number;
  readyForDischarge: number;
  onHold: number;
  totalActive: number;
};

export type QueueOverviewItem = {
  area: OperationalArea;
  totalEnCola: number;
  llamados: number;
  enAtencion: number;
  pausados: number;
  tiempoPromedioEspera: number | null;
  ticketActualLlamado?: string | null;
};

export type WorklistFilters = {
  area?: OperationalArea;
  status?: VisitStatus;
  priority?: VisitPriority;
  minMinutesInState?: number;
  companyOnly?: boolean;
  companyClientId?: string;
  onlyPendingAuthorization?: boolean;
};

export type ReceptionWorklistItem = {
  visitId: string;
  queueItemId?: string | null;
  ticketCode: string | null;
  patientDisplayName: string;
  areaActual: OperationalArea;
  estadoVisita: VisitStatus;
  estadoCola: QueueItemStatus | null;
  prioridad: VisitPriority;
  tiempoEnEstado: number;
  slaState: "normal" | "warning" | "critical";
  vitalsStatus: "PENDING" | "COMPLETE";
  companyId?: string | null;
  companyName?: string | null;
  convenioPlan?: string | null;
  authorizationStatus?: string | null;
  nextAction: string;
  assignedRoomId?: string | null;
  assignedUserId?: string | null;
};

export type AvailabilitySnapshot = {
  siteId: string;
  dateKey: string;
  busyDoctors: number;
  availableDoctors: number;
  absentDoctors: number;
  roomsAvailable: number;
  roomsOccupied: number;
  branchHoursConfigured: boolean;
  branchHoursMessage: string | null;
  visitsInServiceByDoctor: Array<{ userId: string; count: number }>;
};

export type QueueStatusCounts = {
  siteId: string;
  dateKey: string;
  waiting: number;
  called: number;
  inService: number;
  completed: number;
};

export type SlaSeverity = "INFO" | "WARNING" | "CRITICAL";

export type SlaAlertType =
  | "WAITING_TOO_LONG"
  | "CALLED_TOO_LONG"
  | "IN_SERVICE_TOO_LONG"
  | "PAUSED_TOO_LONG"
  | "QUEUE_SATURATED"
  | "PHYSICIAN_OVERLOAD";

export type SlaAlert = {
  type: SlaAlertType;
  severity: SlaSeverity;
  message: string;
  minutesExcedidos?: number;
  visitId?: string;
  queueItemId?: string;
  area?: OperationalArea;
  userId?: string;
  count?: number;
};

export type ReceptionUpcomingAppointment = {
  id: string;
  scheduledAt: string;
  durationMin: number;
  status: AppointmentStatus;
  patientId: string;
  patientName: string;
  patientPhone: string | null;
  specialistId: string;
  specialistName: string | null;
  typeName: string | null;
  roomName: string | null;
  visitId: string | null;
  visitTicketCode: string | null;
};

export type ReceptionRecentEvent = {
  id: string;
  createdAt: string;
  eventType: string;
  note: string | null;
  actorName: string | null;
  area: OperationalArea | null;
  visitId: string;
  ticketCode: string | null;
};

export type ReceptionDashboardTopWaitingItem = {
  visitId: string;
  queueItemId: string;
  ticketCode: string | null;
  patientDisplayName: string;
  area: OperationalArea;
  minutesWaiting: number;
  slaState: "normal" | "warning" | "critical";
};

export type ReceptionDashboardAreaSummary = {
  area: OperationalArea;
  waitingCount: number;
  avgWaitMin: number;
  maxWaitMin: number;
};

export type ReceptionDashboardKpis = {
  patientsInSala: number;
  avgWaitTodayMin: number;
  warningPercent: number;
  criticalPercent: number;
  inServiceCount: number;
  bottleneckAreas: Array<{ area: OperationalArea; waitingCount: number; avgWaitMin: number }>;
  upcomingAppointments60m: number;
};

export type ReceptionDashboardLiteSnapshot = {
  siteId: string;
  generatedAt: string;
  kpis: ReceptionDashboardKpis;
  topWaiting: ReceptionDashboardTopWaitingItem[];
  areaSummary: ReceptionDashboardAreaSummary[];
};
