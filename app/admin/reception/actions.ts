"use server";

import crypto from "crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  AppointmentStatus,
  ClientCatalogType,
  ClientSelfRegistrationStatus,
  ClientProfileType,
  OperationalArea,
  PatientSex,
  Prisma,
  VisitPriority,
  QueueItemStatus,
  VisitEventType,
  VisitStatus
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserFromCookies, type SessionUser } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { isAdmin } from "@/lib/rbac";
import {
  actionCreateCompanyClient,
  actionCreateInstitutionClient,
  actionCreateInsurerClient,
  actionCreatePersonClient
} from "@/app/admin/clientes/actions";
import { dpiSchema } from "@/lib/validation/identity";
import { createVisitEvent } from "@/lib/reception/visit-events.service";
import { createVisitFromAppointment, createWalkInVisit, transitionVisitStatus } from "@/lib/reception/visit.service";
import {
  enqueueVisit,
  callNext,
  startServiceFromQueue,
  completeQueueItem,
  pauseQueueItem,
  resumeQueueItem,
  skipQueueItem,
  transferQueueItem
} from "@/lib/reception/queues.service";
import {
  getAvailabilitySnapshot,
  getReceptionDashboardLite,
  getQueueStatusCounts,
  getQueueOverview,
  getReceptionRecentEvents,
  getReceptionUpcomingAppointments,
  getReceptionWorklist,
  getVisitStatusCounts
} from "@/lib/reception/dashboard.service";
import { getSlaAlerts } from "@/lib/reception/sla.service";
import { getTicketDateKey } from "@/lib/reception/ticketing.service";
import { RECEPTION_AREAS } from "@/lib/reception/constants";
import type { WorklistFilters } from "@/lib/reception/dashboard.types";
import { ACTIVE_QUEUE_ITEM_STATUSES } from "@/lib/reception/queue-guards";
import { OPEN_SERVICE_REQUEST_STATUSES } from "@/lib/reception/visit-guards";
import {
  RECEPTION_SLA_AUDIT_ENTITY_TYPE,
  getReceptionSlaPolicy,
  restoreReceptionSlaRecommended,
  saveReceptionSlaAdvancedConfig,
  saveReceptionSlaSimpleConfig
} from "@/lib/reception/sla-settings.service";
import { RECEPTION_ACTIVE_BRANCH_COOKIE_NAME, resolveReceptionBranchId } from "@/lib/reception/active-branch";
import { assertReceptionBranchSelectable, listReceptionBranchOptions } from "@/lib/reception/branches.service";
import {
  createClientRegistrationInviteToken,
  hashClientRegistrationToken
} from "@/lib/reception/clientRegistrationTokens";
import {
  getClientSelfRegistrationFormOptions,
  getSelfRegistrationIdentityHints,
  validateClientSelfRegistrationPayload,
  type ClientSelfRegistrationPayload
} from "@/lib/reception/clientSelfRegistration";
import { INSTITUTIONAL_REGIMES } from "@/lib/catalogs/institutionalRegimes";
import { INSTITUTION_TYPES } from "@/lib/catalogs/institutionTypes";
import { tenantIdFromUser } from "@/lib/tenant";
import {
  assertCapabilities,
  assertCapability,
  assertReceptionAccess,
  assertRoleAtLeast,
  assertVisitTransitionPermission,
  buildReceptionContext
} from "@/lib/reception/rbac";

type WalkInInput = {
  patientId: string;
  siteId?: string;
  initialArea: OperationalArea;
  priority: VisitPriority;
  notes?: string;
};

type AdmissionMode = "new" | "existing";

type AdmissionPatientData = {
  firstName: string;
  lastName?: string;
  phone: string;
  sex?: PatientSex | null;
  birthDate?: string;
  dpi: string;
  nit?: string;
};

type AdmissionInput = {
  mode: AdmissionMode;
  siteId?: string;
  patientId?: string;
  patientData?: AdmissionPatientData;
  area: OperationalArea;
  priority: VisitPriority;
  notes?: string;
};

type QueueItemActionInput = {
  queueItemId: string;
  siteId?: string;
  reason?: string;
};

type QueueCallInput = {
  siteId?: string;
  area: OperationalArea;
  roomId?: string | null;
  assignedToUserId?: string | null;
};

type EnqueueInput = {
  visitId: string;
  siteId?: string;
  area: OperationalArea;
  priorityOverride?: VisitPriority | null;
};

type MarkAppointmentArrivalInput = {
  appointmentId: string;
  siteId?: string;
};

type CreateReceptionAppointmentInput = {
  patientId: string;
  siteId?: string;
  visitType?: "consult" | "lab";
  specialty?: string | null;
  serviceTypeIds?: string[];
  specialistId?: string | null;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  reasonText?: string | null;
  arrivedToday?: boolean;
};

type ReceptionAppointmentServiceOption = {
  id: string;
  name: string;
  durationMin: number;
  color: string | null;
};

type ReceptionDoctorOption = {
  id: string;
  name: string;
  email: string;
};

type SaveReceptionAppointmentVitalsInput = {
  appointmentId: string;
  siteId?: string;
  systolicBp: number;
  diastolicBp: number;
  heartRate?: number | null;
  temperatureC?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  observations?: string | null;
};

type SaveReceptionVisitVitalsInput = {
  visitId: string;
  siteId?: string;
  systolicBp: number;
  diastolicBp: number;
  heartRate?: number | null;
  temperatureC?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  observations?: string | null;
};

type ReceptionSlaSimpleInput = {
  siteId?: string;
  applyToAllAreas: boolean;
  waitingWarningMin: number;
  waitingCriticalMin: number;
  inServiceMaxMin: number;
};

type ReceptionSlaAdvancedInput = {
  siteId?: string;
  applyToAllAreas: boolean;
  waitingWarningMin: number;
  waitingCriticalMin: number;
  inServiceMaxMin: number;
  areaRows: Array<{
    area: OperationalArea;
    waitingWarningMin: number;
    waitingCriticalMin: number;
    inServiceMaxMin: number;
  }>;
};

type TransferQueueItemInput = {
  queueItemId: string;
  siteId?: string;
  toArea: OperationalArea;
  reason: string;
};

type TransitionInput = {
  visitId: string;
  toStatus: VisitStatus;
  reason?: string;
};

export type PortalAppointmentRequestRow = {
  id: string;
  patientId: string;
  patientName: string;
  patientDpi: string | null;
  patientPhone: string | null;
  typeName: string;
  durationMin: number;
  branchId: string;
  branchName: string | null;
  preferredDate1: string;
  preferredDate2: string | null;
  reason: string;
  requestedAt: string;
  scheduledAt: string;
};

export type ClientSelfRegistrationQueueRow = {
  id: string;
  inviteId: string;
  provisionalCode: string;
  clientType: ClientProfileType;
  status: ClientSelfRegistrationStatus;
  displayName: string | null;
  documentRef: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
  inviteExpiresAt: string;
  reviewedAt: string | null;
  rejectedReason: string | null;
  assignedClient: {
    id: string;
    clientCode: string | null;
    label: string;
  } | null;
};

export type ClientSelfRegistrationDuplicateRow = {
  id: string;
  clientCode: string | null;
  type: ClientProfileType;
  label: string;
  nit: string | null;
  dpi: string | null;
  email: string | null;
  phone: string | null;
};

export type ClientSelfRegistrationDetail = ClientSelfRegistrationQueueRow & {
  payloadJson: unknown;
  duplicates: ClientSelfRegistrationDuplicateRow[];
};

type PortalRequestsScope = "all" | "active";

type ReceptionDashboardAppointmentRange = "today" | "next24h" | "next7d";

type ReceptionDashboardUpcomingAppointmentRow = {
  id: string;
  scheduledAt: string;
  status: AppointmentStatus;
  patientId: string;
  patientName: string;
  patientPhone: string | null;
  typeName: string | null;
  branchId: string;
  branchName: string | null;
};

type ConfirmPortalAppointmentRequestInput = {
  appointmentId: string;
  siteId?: string;
  scheduledAt: string;
  specialistId?: string | null;
};

type RejectPortalAppointmentRequestInput = {
  appointmentId: string;
  siteId?: string;
  reason: string;
};

type QueueBoardItem = {
  id: string;
  visitId: string;
  ticketCode: string | null;
  status: QueueItemStatus;
  priority: VisitPriority;
  elapsedMinutes: number;
  roomLabel?: string | null;
};

type QueueBoardArea = {
  area: OperationalArea;
  waiting: QueueBoardItem[];
  called: QueueBoardItem[];
  inService: QueueBoardItem[];
  paused: QueueBoardItem[];
};

type PatientSearchResult = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  dpi: string | null;
  nit: string | null;
};

type PatientCreateInput = {
  firstName: string;
  lastName?: string;
  phone: string;
  sex?: PatientSex | null;
  birthDate?: string;
  dpi?: string;
  nit?: string;
};

const AREA_SET = new Set(Object.values(OperationalArea));
const PRIORITY_SET = new Set(Object.values(VisitPriority));
const STATUS_SET = new Set(Object.values(VisitStatus));

async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUserFromCookies(cookies());
  if (!user) {
    throw new Error("No autenticado.");
  }
  return user;
}

async function resolveSiteId(user: SessionUser, siteId?: string) {
  const cookieStore = await cookies();
  const cookieBranchId = cookieStore.get(RECEPTION_ACTIVE_BRANCH_COOKIE_NAME)?.value ?? null;
  const effective = resolveReceptionBranchId(user, {
    requestedBranchId: siteId,
    cookieBranchId
  });
  if (!effective) throw new Error("Sede requerida.");
  return effective;
}

function assertArea(area: OperationalArea) {
  if (!AREA_SET.has(area)) throw new Error("Área inválida.");
}

function assertPriority(priority: VisitPriority) {
  if (!PRIORITY_SET.has(priority)) throw new Error("Prioridad inválida.");
}

function assertStatus(status: VisitStatus) {
  if (!STATUS_SET.has(status)) throw new Error("Estado inválido.");
}

function normalizeFilters(filters?: WorklistFilters): WorklistFilters | undefined {
  if (!filters) return undefined;
  const normalized: WorklistFilters = {};
  if (filters.area) {
    assertArea(filters.area);
    normalized.area = filters.area;
  }
  if (filters.status) {
    assertStatus(filters.status);
    normalized.status = filters.status;
  }
  if (filters.priority) {
    assertPriority(filters.priority);
    normalized.priority = filters.priority;
  }
  if (filters.minMinutesInState && filters.minMinutesInState > 0) {
    normalized.minMinutesInState = Math.floor(filters.minMinutesInState);
  }
  if (filters.companyOnly) {
    normalized.companyOnly = true;
  }
  if (filters.companyClientId?.trim()) {
    normalized.companyClientId = filters.companyClientId.trim();
  }
  if (filters.onlyPendingAuthorization) {
    normalized.onlyPendingAuthorization = true;
  }
  return normalized;
}

function revalidateReception(paths?: string[]) {
  const targets = paths && paths.length ? paths : [
    "/admin/recepcion/dashboard",
    "/admin/recepcion",
    "/admin/recepcion/companies",
    "/admin/recepcion/worklist",
    "/admin/recepcion/queues",
    "/admin/recepcion/check-in",
    "/admin/recepcion/appointments",
    "/admin/recepcion/solicitudes-portal",
    "/admin/recepcion/registros",
    "/admin/recepcion/settings"
  ];
  targets.forEach((path) => revalidatePath(path));
}

async function requireQueueItemInActiveSite(input: { queueItemId: string; siteId: string }) {
  const item = await prisma.queueItem.findUnique({
    where: { id: input.queueItemId },
    select: {
      id: true,
      status: true,
      queue: { select: { siteId: true, area: true } }
    }
  });
  if (!item) {
    throw new Error("Turno no encontrado.");
  }
  if (item.queue.siteId !== input.siteId) {
    throw new Error("El turno no pertenece a la sede activa.");
  }
  return item;
}

export async function actionCreateAdmission(input: AdmissionInput) {
  const user = await requireUser();
  assertCapabilities(user, ["VISIT_CREATE", "VISIT_CHECKIN", "QUEUE_ENQUEUE"]);

  const mode = input.mode === "existing"
    ? "existing"
    : input.mode === "new"
      ? "new"
      : null;
  if (!mode) {
    throw new Error("Modo de admisión inválido.");
  }

  const siteId = await resolveSiteId(user, input.siteId);
  assertArea(input.area);
  assertPriority(input.priority);
  const notes = input.notes?.trim() || null;

  const result = await prisma.$transaction(async (tx) => {
    let patientId: string;

    if (mode === "new") {
      const patientData = input.patientData;
      if (!patientData) throw new Error("Datos de paciente requeridos para admisión nueva.");
      const firstName = patientData.firstName?.trim();
      if (!firstName) throw new Error("Nombre(s) requerido.");
      const lastName = patientData.lastName?.trim() || null;
      const phone = patientData.phone?.trim();
      if (!phone) throw new Error("Teléfono requerido.");

      const sex = patientData.sex ?? null;
      if (sex && sex !== PatientSex.M && sex !== PatientSex.F) {
        throw new Error("Sexo inválido.");
      }

      const dpi = patientData.dpi.trim();
      if (!dpi) throw new Error("DPI requerido.");
      const dpiParsed = dpiSchema.safeParse(dpi);
      if (!dpiParsed.success) {
        throw new Error(dpiParsed.error.issues[0]?.message ?? "DPI inválido.");
      }

      const nit = patientData.nit?.trim() || null;

      const birthDate = patientData.birthDate ? new Date(patientData.birthDate) : null;
      if (birthDate && Number.isNaN(birthDate.getTime())) {
        throw new Error("Fecha de nacimiento inválida.");
      }

      // DPI es obligatorio: bloquea duplicados con DPI
      const existingByDpi = await tx.clientProfile.findFirst({
        where: { dpi },
        select: { id: true }
      });
      if (existingByDpi) {
        throw new Error("Ya existe un paciente con ese DPI. Usa admisión existente.");
      }

      // NIT opcional: si viene, también cuidamos duplicados por NIT
      if (nit) {
        const existingByNit = await tx.clientProfile.findFirst({
          where: { nit },
          select: { id: true }
        });
        if (existingByNit) {
          throw new Error("Ya existe un paciente con ese NIT. Usa admisión existente.");
        }
      }

      const created = await tx.clientProfile.create({
        data: {
          type: ClientProfileType.PERSON,
          firstName,
          lastName,
          phone,
          sex,
          birthDate,
          dpi,
          nit
        },
        select: { id: true }
      });

      patientId = created.id;
    } else {
      const selectedId = input.patientId?.trim();
      if (!selectedId) throw new Error("Paciente requerido para admisión existente.");
      const exists = await tx.clientProfile.findUnique({
        where: { id: selectedId },
        select: { id: true }
      });
      if (!exists) throw new Error("Paciente no encontrado.");
      patientId = exists.id;
    }

    const visit = await createWalkInVisit(
      {
        patientId,
        siteId,
        initialArea: input.area,
        priority: input.priority,
        createdByUserId: user.id,
        notes
      },
      tx
    );

    await createVisitEvent(
      {
        visitId: visit.id,
        eventType: VisitEventType.ADMISSION_CREATED,
        actorUserId: user.id,
        area: input.area,
        reason: mode === "new" ? "Admisión nueva creada" : "Admisión existente creada",
        metadata: {
          mode
        }
      },
      tx
    );

    await transitionVisitStatus(
      {
        visitId: visit.id,
        toStatus: VisitStatus.CHECKED_IN,
        actorUserId: user.id
      },
      tx
    );

    const queueItem = await enqueueVisit(
      {
        visitId: visit.id,
        siteId,
        area: input.area,
        actorUserId: user.id,
        priorityOverride: input.priority
      },
      tx
    );

    const updated = await tx.visit.findUnique({
      where: { id: visit.id },
      select: { ticketCode: true }
    });

    return {
      visitId: visit.id,
      queueItemId: queueItem.id,
      ticketCode: updated?.ticketCode ?? visit.ticketCode
    };
  });

  revalidateReception();
  return result;
}

/**
 * @deprecated Legacy entrypoint. Use `actionCreateAdmission` instead.
 * This is intentionally disabled to avoid multiple admission paths.
 */
export async function actionCreateWalkInVisitAndCheckIn(_input: WalkInInput) {
  throw new Error(
    "Acción deprecated: actionCreateWalkInVisitAndCheckIn. Usa actionCreateAdmission (Admisión existente)."
  );
}

export async function actionEnqueueVisit(input: EnqueueInput) {
  const user = await requireUser();
  assertCapability(user, "QUEUE_ENQUEUE");
  const siteId = await resolveSiteId(user, input.siteId);
  assertArea(input.area);
  if (input.priorityOverride) assertPriority(input.priorityOverride);

  const queueItem = await enqueueVisit({
    visitId: input.visitId,
    siteId,
    area: input.area,
    actorUserId: user.id,
    priorityOverride: input.priorityOverride ?? null
  });

  revalidateReception();
  return queueItem;
}

export async function actionCallNext(input: QueueCallInput) {
  const user = await requireUser();
  assertCapability(user, "QUEUE_CALL_NEXT");
  const siteId = await resolveSiteId(user, input.siteId);
  assertArea(input.area);

  const result = await callNext({
    siteId,
    area: input.area,
    actorUserId: user.id,
    roomId: input.roomId ?? null,
    assignedToUserId: input.assignedToUserId ?? null
  });

  revalidateReception();
  return result;
}

export async function actionStartServiceFromQueue(input: QueueItemActionInput) {
  const user = await requireUser();
  assertCapability(user, "QUEUE_START");
  const siteId = await resolveSiteId(user, input.siteId);
  await requireQueueItemInActiveSite({ queueItemId: input.queueItemId, siteId });
  const result = await startServiceFromQueue({ queueItemId: input.queueItemId, actorUserId: user.id });
  revalidateReception();
  return result;
}

export async function actionCompleteQueueItem(input: QueueItemActionInput) {
  const user = await requireUser();
  assertCapability(user, "QUEUE_COMPLETE");
  const siteId = await resolveSiteId(user, input.siteId);
  await requireQueueItemInActiveSite({ queueItemId: input.queueItemId, siteId });
  const reason = input.reason?.trim() || null;
  const result = await completeQueueItem({ queueItemId: input.queueItemId, actorUserId: user.id, reason });
  revalidateReception();
  return result;
}

export async function actionPauseQueueItem(input: QueueItemActionInput) {
  const user = await requireUser();
  assertCapability(user, "QUEUE_PAUSE_RESUME");
  const siteId = await resolveSiteId(user, input.siteId);
  await requireQueueItemInActiveSite({ queueItemId: input.queueItemId, siteId });
  const reason = input.reason?.trim();
  if (!reason) {
    throw new Error("Motivo requerido para pausar un turno.");
  }
  const result = await pauseQueueItem({ queueItemId: input.queueItemId, actorUserId: user.id, reason });
  revalidateReception();
  return result;
}

export async function actionResumeQueueItem(input: QueueItemActionInput) {
  const user = await requireUser();
  assertCapability(user, "QUEUE_PAUSE_RESUME");
  const siteId = await resolveSiteId(user, input.siteId);
  await requireQueueItemInActiveSite({ queueItemId: input.queueItemId, siteId });
  const reason = input.reason?.trim() || null;
  const result = await resumeQueueItem({ queueItemId: input.queueItemId, actorUserId: user.id, reason });
  revalidateReception();
  return result;
}

export async function actionSkipQueueItem(input: QueueItemActionInput) {
  const user = await requireUser();
  assertCapability(user, "QUEUE_SKIP");
  const siteId = await resolveSiteId(user, input.siteId);
  await requireQueueItemInActiveSite({ queueItemId: input.queueItemId, siteId });
  const reason = input.reason?.trim();
  if (!reason) {
    throw new Error("Motivo requerido para saltar un turno.");
  }
  const result = await skipQueueItem({ queueItemId: input.queueItemId, actorUserId: user.id, reason });
  revalidateReception();
  return result;
}

export async function actionTransferQueueItem(input: TransferQueueItemInput) {
  const user = await requireUser();
  assertCapability(user, "QUEUE_TRANSFER");
  const siteId = await resolveSiteId(user, input.siteId);
  await requireQueueItemInActiveSite({ queueItemId: input.queueItemId, siteId });
  assertArea(input.toArea);
  const reason = input.reason?.trim();
  if (!reason) {
    throw new Error("Motivo requerido para transferir un turno.");
  }

  const result = await transferQueueItem({
    queueItemId: input.queueItemId,
    siteId,
    toArea: input.toArea,
    actorUserId: user.id,
    reason
  });
  revalidateReception();
  return result;
}

export async function actionTransitionVisitStatus(input: TransitionInput) {
  const user = await requireUser();
  assertStatus(input.toStatus);
  const reason = input.reason?.trim() || null;
  const visit = await prisma.visit.findUnique({
    where: { id: input.visitId },
    select: { id: true, status: true, siteId: true }
  });
  if (!visit) throw new Error("Visita no encontrada.");
  if (user.branchId && visit.siteId && user.branchId !== visit.siteId && !isAdmin(user)) {
    throw new Error("Sucursal no autorizada.");
  }

  const [openRequests, activeQueueItems] = await prisma.$transaction([
    prisma.serviceRequest.count({
      where: { visitId: input.visitId, status: { in: Array.from(OPEN_SERVICE_REQUEST_STATUSES) } }
    }),
    prisma.queueItem.count({
      where: { visitId: input.visitId, status: { in: Array.from(ACTIVE_QUEUE_ITEM_STATUSES) } }
    })
  ]);

  assertVisitTransitionPermission(user, {
    toStatus: input.toStatus,
    currentStatus: visit.status,
    hasOpenServiceRequests: openRequests > 0,
    hasActiveQueueItems: activeQueueItems > 0
  });

  if (input.toStatus === VisitStatus.CANCELLED || input.toStatus === VisitStatus.NO_SHOW) {
    if (!reason) {
      throw new Error("Motivo requerido para cancelar o marcar no-show.");
    }
  }

  if (input.toStatus === VisitStatus.ON_HOLD || visit.status === VisitStatus.ON_HOLD) {
    if (!reason) {
      throw new Error("Motivo requerido para pausar o reanudar la visita.");
    }
  }

  if (
    input.toStatus === VisitStatus.CHECKED_OUT &&
    (openRequests > 0 || activeQueueItems > 0 || visit.status !== VisitStatus.READY_FOR_DISCHARGE) &&
    !reason
  ) {
    throw new Error("Motivo requerido para cerrar la visita con pendientes.");
  }

  const result = await transitionVisitStatus({
    visitId: input.visitId,
    toStatus: input.toStatus,
    actorUserId: user.id,
    reason
  });
  revalidateReception();
  return result;
}

export async function actionGetReceptionDashboardSnapshot(siteId?: string) {
  const user = await requireUser();
  assertReceptionAccess(user);
  const effectiveSiteId = await resolveSiteId(user, siteId);

  const [counts, queueStatusCounts, overview, alerts, availability, upcomingAppointments, recentEvents] =
    await Promise.all([
      getVisitStatusCounts({ siteId: effectiveSiteId }),
      getQueueStatusCounts({ siteId: effectiveSiteId }),
      getQueueOverview({ siteId: effectiveSiteId }),
      getSlaAlerts({ siteId: effectiveSiteId }),
      getAvailabilitySnapshot({ siteId: effectiveSiteId }),
      getReceptionUpcomingAppointments({ siteId: effectiveSiteId, limit: 10, includePastMinutes: 90 }),
      getReceptionRecentEvents({ siteId: effectiveSiteId, limit: 18 })
    ]);

  return {
    siteId: effectiveSiteId,
    generatedAt: new Date().toISOString(),
    counts,
    queueStatusCounts,
    overview,
    alerts,
    availability,
    upcomingAppointments,
    recentEvents
  };
}

export async function actionGetReceptionDashboardLite(siteId?: string) {
  const user = await requireUser();
  assertReceptionAccess(user);
  const effectiveSiteId = await resolveSiteId(user, siteId);
  const now = new Date();
  const todayStart = startOfTodayLocal(now);
  const todayEnd = endOfTodayLocal(now);
  const next24hEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const next7dEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const eligibleStatuses = [AppointmentStatus.REQUESTED, AppointmentStatus.PROGRAMADA, AppointmentStatus.CONFIRMADA];

  const [baseSnapshot, totalAppointmentsToday, pendingPortalRequests, futureAppointments] = await Promise.all([
    getReceptionDashboardLite({ siteId: effectiveSiteId }),
    prisma.appointment.count({
      where: {
        branchId: effectiveSiteId,
        status: { in: eligibleStatuses },
        date: { gte: todayStart, lte: todayEnd }
      }
    }),
    prisma.appointment.count({
      where: {
        branchId: effectiveSiteId,
        status: AppointmentStatus.REQUESTED
      }
    }),
    prisma.appointment.findMany({
      where: {
        branchId: effectiveSiteId,
        status: { in: eligibleStatuses },
        date: { gte: now, lte: next7dEnd }
      },
      orderBy: { date: "asc" },
      take: 150,
      select: {
        id: true,
        date: true,
        status: true,
        patientId: true,
        branchId: true,
        type: { select: { name: true } }
      }
    })
  ]);

  const patientIds = Array.from(new Set(futureAppointments.map((row) => row.patientId)));
  const branchIds = Array.from(new Set(futureAppointments.map((row) => row.branchId)));

  const [patients, branches] = await Promise.all([
    patientIds.length
      ? prisma.clientProfile.findMany({
          where: { id: { in: patientIds } },
          select: {
            id: true,
            type: true,
            firstName: true,
            middleName: true,
            lastName: true,
            secondLastName: true,
            companyName: true,
            tradeName: true,
            phone: true
          }
        })
      : Promise.resolve([]),
    branchIds.length
      ? prisma.branch.findMany({
          where: { id: { in: branchIds } },
          select: { id: true, name: true }
        })
      : Promise.resolve([])
  ]);

  const patientById = new Map(patients.map((row) => [row.id, row]));
  const branchById = new Map(branches.map((row) => [row.id, row.name]));

  const mappedAppointments: ReceptionDashboardUpcomingAppointmentRow[] = futureAppointments.map((row) => {
    const patient = patientById.get(row.patientId);
    return {
      id: row.id,
      scheduledAt: row.date.toISOString(),
      status: row.status,
      patientId: row.patientId,
      patientName: patient
        ? formatDashboardPatientName({
            type: patient.type,
            firstName: patient.firstName,
            middleName: patient.middleName,
            lastName: patient.lastName,
            secondLastName: patient.secondLastName,
            companyName: patient.companyName,
            tradeName: patient.tradeName
          })
        : "Paciente",
      patientPhone: patient?.phone ?? null,
      typeName: row.type.name ?? null,
      branchId: row.branchId,
      branchName: branchById.get(row.branchId) ?? null
    };
  });

  const inRange = (value: string, range: ReceptionDashboardAppointmentRange) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    if (range === "today") return date >= now && date <= todayEnd;
    if (range === "next24h") return date >= now && date <= next24hEnd;
    return date >= now && date <= next7dEnd;
  };

  const upcomingToday = mappedAppointments.filter((row) => inRange(row.scheduledAt, "today"));
  const upcomingNext24h = mappedAppointments.filter((row) => inRange(row.scheduledAt, "next24h"));
  const upcomingNext7d = mappedAppointments.filter((row) => inRange(row.scheduledAt, "next7d"));

  return {
    ...baseSnapshot,
    kpis: {
      ...baseSnapshot.kpis,
      appointmentsToday: totalAppointmentsToday,
      upcomingAppointments24h: upcomingNext24h.length,
      upcomingAppointments7d: upcomingNext7d.length,
      pendingPortalRequests
    },
    upcomingByRange: {
      today: upcomingToday.slice(0, 30),
      next24h: upcomingNext24h.slice(0, 30),
      next7d: upcomingNext7d.slice(0, 60)
    }
  };
}

export async function actionGetReceptionWorklist(input: { siteId?: string; filters?: WorklistFilters }) {
  const user = await requireUser();
  assertReceptionAccess(user);
  const effectiveSiteId = await resolveSiteId(user, input.siteId);
  const filters = normalizeFilters(input.filters);

  const [items, nextByArea] = await Promise.all([
    getReceptionWorklist({ siteId: effectiveSiteId, filters }),
    getNextQueueByArea(effectiveSiteId)
  ]);

  return {
    siteId: effectiveSiteId,
    generatedAt: new Date().toISOString(),
    items,
    nextQueueItemByArea: nextByArea
  };
}

export async function actionGetQueueBoardSnapshot(siteId?: string) {
  const user = await requireUser();
  assertReceptionAccess(user);
  const effectiveSiteId = await resolveSiteId(user, siteId);
  const dateKey = getTicketDateKey();
  const now = Date.now();

  const [items, alerts] = await Promise.all([
    prisma.queueItem.findMany({
      where: {
        queue: { siteId: effectiveSiteId },
        status: { in: [QueueItemStatus.WAITING, QueueItemStatus.CALLED, QueueItemStatus.IN_SERVICE, QueueItemStatus.PAUSED] },
        visit: { ticketDateKey: dateKey }
      },
      orderBy: [
        { priority: "asc" },
        { sequence: "asc" },
        { enqueuedAt: "asc" }
      ],
      select: {
        id: true,
        visitId: true,
        status: true,
        priority: true,
        enqueuedAt: true,
        calledAt: true,
        startedAt: true,
        pausedAt: true,
        queue: { select: { area: true } },
        visit: { select: { ticketCode: true } },
        room: { select: { name: true } }
      }
    }),
    getSlaAlerts({ siteId: effectiveSiteId })
  ]);

  const slaByArea: Record<string, "normal" | "warning" | "critical"> = {};
  for (const area of RECEPTION_AREAS) {
    slaByArea[area] = "normal";
  }
  for (const alert of alerts) {
    if (!alert.area) continue;
    const current = slaByArea[alert.area] ?? "normal";
    if (alert.severity === "CRITICAL") {
      slaByArea[alert.area] = "critical";
      continue;
    }
    if (alert.severity === "WARNING" && current !== "critical") {
      slaByArea[alert.area] = "warning";
    }
  }

  const buildElapsed = (status: QueueItemStatus, row: typeof items[number]) => {
    const base =
      status === QueueItemStatus.CALLED
        ? row.calledAt ?? row.enqueuedAt
        : status === QueueItemStatus.IN_SERVICE
          ? row.startedAt ?? row.calledAt ?? row.enqueuedAt
          : status === QueueItemStatus.PAUSED
            ? row.pausedAt ?? row.enqueuedAt
            : row.enqueuedAt;
    return Math.max(0, Math.round((now - base.getTime()) / 60000));
  };

  const areas: QueueBoardArea[] = RECEPTION_AREAS.map((area) => ({
    area,
    waiting: [],
    called: [],
    inService: [],
    paused: []
  }));

  const areaMap = new Map<string, typeof areas[number]>(areas.map((area) => [area.area, area]));

  for (const item of items) {
    const bucket = areaMap.get(item.queue.area);
    if (!bucket) continue;
    const payload: QueueBoardItem = {
      id: item.id,
      visitId: item.visitId,
      ticketCode: item.visit?.ticketCode ?? null,
      status: item.status,
      priority: item.priority,
      elapsedMinutes: buildElapsed(item.status, item),
      roomLabel: item.room?.name ?? null
    };
    if (item.status === QueueItemStatus.WAITING) bucket.waiting.push(payload);
    else if (item.status === QueueItemStatus.CALLED) bucket.called.push(payload);
    else if (item.status === QueueItemStatus.IN_SERVICE) bucket.inService.push(payload);
    else if (item.status === QueueItemStatus.PAUSED) bucket.paused.push(payload);
  }

  return {
    siteId: effectiveSiteId,
    generatedAt: new Date().toISOString(),
    areas,
    slaByArea
  };
}

export async function actionGetAvailabilitySnapshot(siteId?: string) {
  const user = await requireUser();
  assertReceptionAccess(user);
  const effectiveSiteId = await resolveSiteId(user, siteId);
  return getAvailabilitySnapshot({ siteId: effectiveSiteId });
}

export async function actionMarkAppointmentArrival(input: MarkAppointmentArrivalInput) {
  const user = await requireUser();
  assertCapabilities(user, ["VISIT_CREATE", "VISIT_CHECKIN", "QUEUE_ENQUEUE"]);
  const siteId = await resolveSiteId(user, input.siteId);

  const appointmentId = input.appointmentId?.trim();
  if (!appointmentId) throw new Error("Cita requerida.");

  const result = await prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true, branchId: true, status: true }
    });
    if (!appointment) throw new Error("Cita no encontrada.");
    if (appointment.branchId !== siteId) {
      throw new Error("La cita no pertenece a la sede activa.");
    }

    if (appointment.status === AppointmentStatus.CANCELADA) {
      throw new Error("No se puede marcar llegada: la cita está cancelada.");
    }
    if (appointment.status === AppointmentStatus.NO_SHOW) {
      throw new Error("No se puede marcar llegada: la cita está marcada como no-show.");
    }
    if (appointment.status === AppointmentStatus.ATENDIDA) {
      throw new Error("No se puede marcar llegada: la cita ya fue atendida.");
    }

    const existing = await tx.visit.findFirst({
      where: { appointmentId },
      select: { id: true, ticketCode: true }
    });

    if (existing) {
      return {
        visitId: existing.id,
        ticketCode: existing.ticketCode ?? null,
        created: false
      };
    }

    const visit = await createVisitFromAppointment(
      {
        appointmentId,
        siteId,
        createdByUserId: user.id
      },
      tx
    );

    await createVisitEvent(
      {
        visitId: visit.id,
        eventType: VisitEventType.ADMISSION_CREATED,
        actorUserId: user.id,
        area: visit.initialArea,
        reason: "Admisión desde cita creada",
        metadata: { source: "appointment", appointmentId }
      },
      tx
    );

    await transitionVisitStatus(
      {
        visitId: visit.id,
        toStatus: VisitStatus.CHECKED_IN,
        actorUserId: user.id
      },
      tx
    );

    await enqueueVisit(
      {
        visitId: visit.id,
        siteId,
        area: visit.initialArea,
        actorUserId: user.id
      },
      tx
    );

    await tx.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.EN_SALA, updatedById: user.id }
    });

    const refreshed = await tx.visit.findUnique({
      where: { id: visit.id },
      select: { ticketCode: true }
    });

    return {
      visitId: visit.id,
      ticketCode: refreshed?.ticketCode ?? visit.ticketCode ?? null,
      created: true
    };
  });

  revalidateReception(["/admin/recepcion"]);
  return result;
}

function assertIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Fecha inválida.");
}

function assertTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) throw new Error("Hora inválida.");
}

function normalizeText(value: string | null | undefined) {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parsePortalRequestNotes(notes: string | null, fallbackPreferredDate: Date) {
  const fragments = String(notes || "")
    .split(/\n|\|/g)
    .map((line) => line.trim())
    .filter(Boolean);

  const findValue = (prefix: string) => {
    const normalizedPrefix = normalizeText(prefix);
    const found = fragments.find((line) => normalizeText(line).startsWith(normalizedPrefix));
    if (!found) return null;
    const separatorIndex = found.indexOf(":");
    if (separatorIndex < 0) return null;
    const value = found.slice(separatorIndex + 1).trim();
    return value || null;
  };

  const reasonValue = findValue("Motivo");
  const preferred1Value = findValue("Preferencia 1");
  const preferred2Value = findValue("Preferencia 2");

  const parseDateValue = (value: string | null) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  };

  const preferredDate1 = parseDateValue(preferred1Value) ?? fallbackPreferredDate;
  const preferredDate2 = parseDateValue(preferred2Value);

  const fallbackReason = fragments.find((line) => {
    const normalized = normalizeText(line);
    return normalized.length > 0 && !normalized.startsWith("solicitud portal") && !normalized.startsWith("preferencia");
  });

  return {
    reason: reasonValue || fallbackReason || "Sin motivo registrado.",
    preferredDate1,
    preferredDate2
  };
}

function appendReceptionNote(existingNotes: string | null | undefined, lines: string[]) {
  const cleanExisting = existingNotes?.trim() || "";
  const cleanLines = lines.map((line) => line.trim()).filter(Boolean);
  return [cleanExisting, ...cleanLines].filter(Boolean).join("\n");
}

function formatClientFullName(input: {
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  secondLastName: string | null;
}) {
  return [input.firstName, input.middleName, input.lastName, input.secondLastName]
    .map((value) => value?.trim() || "")
    .filter(Boolean)
    .join(" ");
}

function startOfTodayLocal(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfTodayLocal(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function formatDashboardPatientName(input: {
  type: ClientProfileType;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  secondLastName: string | null;
  companyName: string | null;
  tradeName: string | null;
}) {
  if (input.type === ClientProfileType.PERSON) {
    const fullName = formatClientFullName({
      firstName: input.firstName,
      middleName: input.middleName,
      lastName: input.lastName,
      secondLastName: input.secondLastName
    });
    return fullName || "Paciente";
  }

  const companyLabel = input.companyName?.trim() || input.tradeName?.trim() || "";
  if (companyLabel) return companyLabel;

  const fallbackName = formatClientFullName({
    firstName: input.firstName,
    middleName: input.middleName,
    lastName: input.lastName,
    secondLastName: input.secondLastName
  });
  return fallbackName || "Paciente";
}

function formatClientDisplayLabel(input: {
  type: ClientProfileType;
  clientCode: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  secondLastName: string | null;
  companyName: string | null;
  tradeName: string | null;
}) {
  const codeTag = input.clientCode ? `[${input.clientCode}] ` : "";
  if (input.type === ClientProfileType.PERSON) {
    const fullName = [input.firstName, input.middleName, input.lastName, input.secondLastName]
      .map((part) => part?.trim() || "")
      .filter(Boolean)
      .join(" ");
    return `${codeTag}${fullName || "Persona"}`;
  }
  const businessName = input.companyName?.trim() || input.tradeName?.trim() || "Cliente";
  return `${codeTag}${businessName}`;
}

function normalizeClientSelfRegistrationStatusFilter(value?: string | null) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (!normalized || normalized === "ALL") return null;
  if (
    normalized === ClientSelfRegistrationStatus.PENDING ||
    normalized === ClientSelfRegistrationStatus.APPROVED ||
    normalized === ClientSelfRegistrationStatus.REJECTED
  ) {
    return normalized as ClientSelfRegistrationStatus;
  }
  throw new Error("Estado de registro inválido.");
}

function parseClientSelfRegistrationPayload(
  clientType: ClientProfileType,
  payloadJson: Prisma.JsonValue
): ClientSelfRegistrationPayload {
  return validateClientSelfRegistrationPayload({
    clientType,
    payload: payloadJson
  });
}

async function ensureInstitutionCatalogIdForApproval(input: {
  id: string | null;
  type: "INSTITUTION_TYPE" | "INSTITUTION_CATEGORY";
}) {
  const targetId = String(input.id ?? "").trim();
  if (!targetId) return null;

  const current = await prisma.clientCatalogItem.findFirst({
    where: {
      id: targetId,
      type: input.type
    },
    select: { id: true }
  });
  if (current) {
    await prisma.clientCatalogItem.update({
      where: { id: current.id },
      data: { isActive: true }
    });
    return current.id;
  }

  const fallbackName =
    input.type === ClientCatalogType.INSTITUTION_TYPE
      ? INSTITUTION_TYPES.find((item) => item.id === targetId)?.label
      : INSTITUTIONAL_REGIMES.find((item) => item.id === targetId)?.label;

  if (!fallbackName) return null;

  const byName = await prisma.clientCatalogItem.findFirst({
    where: {
      type: input.type,
      name: fallbackName
    },
    select: { id: true }
  });
  if (byName) {
    await prisma.clientCatalogItem.update({
      where: { id: byName.id },
      data: { isActive: true }
    });
    return byName.id;
  }

  const created = await prisma.clientCatalogItem.create({
    data: {
      id: targetId,
      type: input.type,
      name: fallbackName,
      isActive: true
    },
    select: { id: true }
  });
  return created.id;
}

function resolvePortalRequestScope(inputScope?: string | null): PortalRequestsScope {
  return inputScope === "active" ? "active" : "all";
}

async function resolveAppointmentTypeForVisit(visitType: "consult" | "lab") {
  if (visitType === "lab") {
    // Permite operar LAB sin depender de catálogo preconfigurado.
    // TODO(reception-appointments): mover a configuración (AppointmentType) por sede/servicio.
    return prisma.appointmentType.upsert({
      where: { id: "t-lab" },
      update: {},
      create: {
        id: "t-lab",
        name: "Laboratorio",
        description: "Toma de muestras / laboratorio",
        durationMin: 15,
        color: "#4aadf5",
        status: "Activo"
      },
      select: { id: true, durationMin: true }
    });
  }

  const consult = await prisma.appointmentType.findFirst({
    where: {
      name: { contains: "consulta", mode: "insensitive" }
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, durationMin: true }
  });

  if (consult) return consult;

  const fallback = await prisma.appointmentType.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, durationMin: true }
  });
  if (!fallback) throw new Error("No hay tipos de cita configurados.");
  return fallback;
}

async function listDoctorsForBranch(siteId: string): Promise<ReceptionDoctorOption[]> {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        { branchId: siteId },
        { employee: { is: { branchAssignments: { some: { branchId: siteId } } } } }
      ]
    },
    select: {
      id: true,
      name: true,
      email: true,
      profile: { select: { jobRole: { select: { name: true } } } },
      roles: { select: { role: { select: { name: true } } } },
      employee: {
        select: {
          positionAssignments: {
            where: { OR: [{ endDate: null }, { endDate: { gte: new Date() } }] },
            select: { position: { select: { name: true } } }
          }
        }
      }
    }
  });

  const doctorCandidates = users.filter((user) => {
    const roleNames = user.roles.map((item) => item.role.name);
    const positionNames = user.employee?.positionAssignments.map((item) => item.position.name) ?? [];
    const descriptors = [
      user.name,
      user.profile?.jobRole?.name,
      ...roleNames,
      ...positionNames
    ]
      .filter(Boolean)
      .map((item) => normalizeText(item));

    return descriptors.some((text) => {
      const compact = text.replace(/\./g, " ");
      return (
        compact.includes("medic") ||
        compact.includes("doctor") ||
        compact.includes("especialista") ||
        /\bdr\b/.test(compact) ||
        /\bdra\b/.test(compact)
      );
    });
  });

  return doctorCandidates
    .map((user) => ({
      id: user.id,
      name: user.name?.trim() || user.email,
      email: user.email
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

function parseVisitType(input: CreateReceptionAppointmentInput, serviceNames: string[]) {
  if (input.visitType === "lab" || input.visitType === "consult") return input.visitType;

  const hasLabLike = serviceNames.some((name) => {
    const value = normalizeText(name);
    return value.includes("lab") || value.includes("laboratorio");
  });
  return hasLabLike ? "lab" : "consult";
}

async function resolveAppointmentTypes(serviceTypeIds: string[] | undefined, visitType: "consult" | "lab") {
  const cleanServiceIds = Array.from(
    new Set((serviceTypeIds ?? []).map((value) => value.trim()).filter(Boolean))
  );

  if (cleanServiceIds.length === 0) {
    const fallback = await resolveAppointmentTypeForVisit(visitType);
    return {
      primary: fallback,
      selectedServiceNames: [visitType === "lab" ? "Laboratorio" : "Consulta"]
    };
  }

  const rows = await prisma.appointmentType.findMany({
    where: { id: { in: cleanServiceIds } },
    select: { id: true, name: true, durationMin: true }
  });
  if (rows.length !== cleanServiceIds.length) {
    throw new Error("Uno o más servicios seleccionados no son válidos.");
  }

  const byId = new Map(rows.map((row) => [row.id, row]));
  const ordered = cleanServiceIds.map((id) => byId.get(id)).filter(Boolean);
  const primary = ordered[0];
  if (!primary) throw new Error("Servicio principal inválido.");

  return {
    primary: { id: primary.id, durationMin: primary.durationMin },
    selectedServiceNames: ordered.map((item) => item!.name)
  };
}

async function resolveSpecialistForAppointment(input: {
  siteId: string;
  visitType: "consult" | "lab";
  selectedSpecialistId?: string | null;
  specialty?: string | null;
}) {
  const doctors = await listDoctorsForBranch(input.siteId);
  if (doctors.length === 0) {
    throw new Error("No hay médicos activos configurados para la sede.");
  }

  const selectedId = input.selectedSpecialistId?.trim();
  if (selectedId) {
    const found = doctors.find((doctor) => doctor.id === selectedId);
    if (!found) throw new Error("El médico seleccionado no pertenece a la sede activa.");
    return found.id;
  }

  // Compatibilidad: si aún llega specialty desde un cliente viejo, intentamos mapear por nombre.
  const specialty = normalizeText(input.specialty);
  if (specialty) {
    const byName = doctors.find((doctor) => normalizeText(doctor.name).includes(specialty));
    if (byName) return byName.id;
  }

  if (input.visitType === "lab") return doctors[0]!.id;
  throw new Error("Médico requerido.");
}

export async function actionListReceptionAppointmentServices(): Promise<ReceptionAppointmentServiceOption[]> {
  const user = await requireUser();
  assertCapability(user, "VISIT_CREATE");

  const services = await prisma.appointmentType.findMany({
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      durationMin: true,
      color: true
    }
  });

  return services;
}

export async function actionListReceptionDoctors(siteId?: string): Promise<ReceptionDoctorOption[]> {
  const user = await requireUser();
  assertCapability(user, "VISIT_CREATE");
  const resolvedSiteId = await resolveSiteId(user, siteId);
  return listDoctorsForBranch(resolvedSiteId);
}

export async function actionCreateReceptionAppointment(input: CreateReceptionAppointmentInput) {
  const user = await requireUser();
  assertCapability(user, "VISIT_CREATE");
  const siteId = await resolveSiteId(user, input.siteId);

  // TODO(reception-appointments): considerar delegar creación/traslapes al scheduler canónico (POST /api/agenda)
  // para reutilizar validaciones de solapamiento + emisión de eventos (agendaEmitter).

  const patientId = input.patientId?.trim();
  if (!patientId) throw new Error("Paciente requerido.");
  const patientExists = await prisma.clientProfile.findUnique({ where: { id: patientId }, select: { id: true } });
  if (!patientExists) throw new Error("Paciente no encontrado.");

  const date = input.date?.trim();
  if (!date) throw new Error("Fecha requerida.");
  assertIsoDate(date);

  const time = input.time?.trim();
  if (!time) throw new Error("Hora requerida.");
  assertTime(time);

  const scheduledAt = new Date(`${date}T${time}:00`);
  if (Number.isNaN(scheduledAt.getTime())) throw new Error("Fecha/hora inválida.");

  const selectedServices = await resolveAppointmentTypes(input.serviceTypeIds, input.visitType ?? "consult");
  const visitType = parseVisitType(input, selectedServices.selectedServiceNames);
  const specialty = input.specialty?.trim() || null;
  const reasonText = input.reasonText?.trim() || null;

  if (!reasonText) throw new Error("Motivo requerido.");

  const specialistId = await resolveSpecialistForAppointment({
    siteId,
    visitType,
    selectedSpecialistId: input.specialistId,
    specialty
  });

  const notes = [
    `Motivo: ${reasonText}`,
    `Servicios: ${selectedServices.selectedServiceNames.join(", ")}`
  ].join(" | ");

  const created = await prisma.appointment.create({
    data: {
      date: scheduledAt,
      durationMin: selectedServices.primary.durationMin,
      patientId,
      specialistId,
      branchId: siteId,
      roomId: null,
      typeId: selectedServices.primary.id,
      status: AppointmentStatus.PROGRAMADA,
      notes,
      createdById: user.id,
      updatedById: user.id
    },
    select: { id: true, date: true }
  });

  // Revalidate agenda views in Recepción.
  revalidateReception(["/admin/recepcion", "/admin/recepcion/appointments"]);

  const shouldArrive = Boolean(input.arrivedToday);
  if (!shouldArrive) {
    return {
      appointmentId: created.id,
      scheduledAt: created.date.toISOString(),
      createdQueueItem: false,
      visitId: null,
      ticketCode: null
    };
  }

  // Registrar llegada solo si la cita es hoy (fecha local).
  const today = getTicketDateKey();
  if (date !== today) {
    throw new Error("Solo se puede registrar llegada para citas de hoy.");
  }

  // Reusa el mismo flujo que el dashboard: crea Visit + QueueItem.
  const arrival = await actionMarkAppointmentArrival({ appointmentId: created.id, siteId });
  return {
    appointmentId: created.id,
    scheduledAt: created.date.toISOString(),
    createdQueueItem: Boolean(arrival.created),
    visitId: arrival.visitId,
    ticketCode: arrival.ticketCode
  };
}

export async function actionListPortalAppointmentRequests(input?: {
  siteId?: string;
  scope?: PortalRequestsScope;
}): Promise<PortalAppointmentRequestRow[]> {
  const user = await requireUser();
  assertCapability(user, "VISIT_CREATE");

  const scope = resolvePortalRequestScope(input?.scope);
  let branchFilterId: string | null = null;

  if (scope === "active") {
    branchFilterId = await resolveSiteId(user, input?.siteId);
  } else if (!isAdmin(user)) {
    branchFilterId = user.branchId ?? null;
    if (!branchFilterId) {
      throw new Error("Sede requerida.");
    }
  }

  const requestedRows = await prisma.appointment.findMany({
    where: {
      branchId: branchFilterId ?? undefined,
      status: AppointmentStatus.REQUESTED
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      patientId: true,
      date: true,
      createdAt: true,
      notes: true,
      branchId: true,
      type: {
        select: {
          name: true,
          durationMin: true
        }
      }
    }
  });

  if (requestedRows.length === 0) return [];

  const patientIds = Array.from(new Set(requestedRows.map((row) => row.patientId)));
  const branchIds = Array.from(new Set(requestedRows.map((row) => row.branchId)));

  const [patients, branches] = await Promise.all([
    prisma.clientProfile.findMany({
      where: { id: { in: patientIds } },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        secondLastName: true,
        dpi: true,
        phone: true
      }
    }),
    prisma.branch.findMany({
      where: { id: { in: branchIds } },
      select: { id: true, name: true }
    })
  ]);

  const patientById = new Map(patients.map((row) => [row.id, row]));
  const branchById = new Map(branches.map((row) => [row.id, row.name]));

  return requestedRows.map((row) => {
    const parsed = parsePortalRequestNotes(row.notes, row.date);
    const patient = patientById.get(row.patientId);
    const patientName = patient
      ? formatClientFullName({
          firstName: patient.firstName,
          middleName: patient.middleName,
          lastName: patient.lastName,
          secondLastName: patient.secondLastName
        })
      : "";
    return {
      id: row.id,
      patientId: row.patientId,
      patientName: patientName || "Paciente no encontrado",
      patientDpi: patient?.dpi ?? null,
      patientPhone: patient?.phone ?? null,
      typeName: row.type.name,
      durationMin: row.type.durationMin,
      branchId: row.branchId,
      branchName: branchById.get(row.branchId) ?? null,
      preferredDate1: parsed.preferredDate1.toISOString(),
      preferredDate2: parsed.preferredDate2 ? parsed.preferredDate2.toISOString() : null,
      reason: parsed.reason,
      requestedAt: row.createdAt.toISOString(),
      scheduledAt: row.date.toISOString()
    };
  });
}

export async function actionConfirmPortalAppointmentRequest(input: ConfirmPortalAppointmentRequestInput) {
  const user = await requireUser();
  assertCapability(user, "VISIT_CREATE");
  const siteId = await resolveSiteId(user, input.siteId);

  const appointmentId = input.appointmentId?.trim();
  if (!appointmentId) throw new Error("Solicitud requerida.");

  const scheduledAt = new Date(String(input.scheduledAt || "").trim());
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new Error("Fecha/hora final inválida.");
  }

  const requestedSpecialistId = input.specialistId?.trim() || null;
  if (requestedSpecialistId) {
    const doctors = await listDoctorsForBranch(siteId);
    if (!doctors.some((doctor) => doctor.id === requestedSpecialistId)) {
      throw new Error("El especialista no pertenece a la sede activa.");
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        branchId: true,
        status: true,
        notes: true,
        date: true,
        specialistId: true
      }
    });

    if (!appointment) throw new Error("Solicitud no encontrada.");
    if (appointment.branchId !== siteId) throw new Error("La solicitud no pertenece a la sede activa.");
    if (appointment.status !== AppointmentStatus.REQUESTED) {
      throw new Error("La solicitud ya fue procesada.");
    }

    const nextSpecialistId = requestedSpecialistId || appointment.specialistId;
    const timestamp = new Date().toISOString();
    const updatedNotes = appendReceptionNote(appointment.notes, [
      `CONFIRMADA POR RECEPCIÓN: ${timestamp}`,
      `Fecha final: ${scheduledAt.toISOString()}`,
      requestedSpecialistId ? `Especialista asignado: ${requestedSpecialistId}` : "Especialista: sin cambios"
    ]);

    const updated = await tx.appointment.update({
      where: { id: appointment.id },
      data: {
        date: scheduledAt,
        specialistId: nextSpecialistId,
        status: AppointmentStatus.CONFIRMADA,
        notes: updatedNotes,
        updatedById: user.id
      },
      select: {
        id: true,
        date: true,
        status: true,
        specialistId: true,
        notes: true
      }
    });

    return {
      appointmentId: updated.id,
      status: updated.status,
      scheduledAt: updated.date.toISOString(),
      before: {
        status: appointment.status,
        date: appointment.date.toISOString(),
        specialistId: appointment.specialistId
      },
      after: {
        status: updated.status,
        date: updated.date.toISOString(),
        specialistId: updated.specialistId
      }
    };
  });

  await auditLog({
    action: "RECEPTION_PORTAL_REQUEST_CONFIRMED",
    entityType: "Appointment",
    entityId: result.appointmentId,
    user,
    before: result.before,
    after: result.after,
    metadata: {
      source: "portal_request",
      siteId,
      requestedSpecialistId: requestedSpecialistId || null
    }
  });

  revalidateReception(["/admin/recepcion/solicitudes-portal", "/admin/recepcion/appointments", "/admin/recepcion"]);
  revalidatePath("/portal/app");
  revalidatePath("/portal/app/appointments");
  return {
    appointmentId: result.appointmentId,
    status: result.status,
    scheduledAt: result.scheduledAt
  };
}

export async function actionRejectPortalAppointmentRequest(input: RejectPortalAppointmentRequestInput) {
  const user = await requireUser();
  assertCapability(user, "VISIT_CREATE");
  const siteId = await resolveSiteId(user, input.siteId);

  const appointmentId = input.appointmentId?.trim();
  if (!appointmentId) throw new Error("Solicitud requerida.");
  const reason = input.reason?.trim();
  if (!reason || reason.length < 5) {
    throw new Error("Motivo de rechazo requerido (mínimo 5 caracteres).");
  }

  const result = await prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        branchId: true,
        status: true,
        notes: true
      }
    });

    if (!appointment) throw new Error("Solicitud no encontrada.");
    if (appointment.branchId !== siteId) throw new Error("La solicitud no pertenece a la sede activa.");
    if (appointment.status !== AppointmentStatus.REQUESTED) {
      throw new Error("La solicitud ya fue procesada.");
    }

    const timestamp = new Date().toISOString();
    const updatedNotes = appendReceptionNote(appointment.notes, [
      `RECHAZADA POR RECEPCIÓN: ${timestamp}`,
      `Motivo rechazo: ${reason}`
    ]);

    const updated = await tx.appointment.update({
      where: { id: appointment.id },
      data: {
        status: AppointmentStatus.CANCELADA,
        notes: updatedNotes,
        updatedById: user.id
      },
      select: {
        id: true,
        status: true
      }
    });

    return {
      appointmentId: updated.id,
      status: updated.status,
      before: {
        status: appointment.status
      },
      after: {
        status: updated.status
      }
    };
  });

  await auditLog({
    action: "RECEPTION_PORTAL_REQUEST_REJECTED",
    entityType: "Appointment",
    entityId: result.appointmentId,
    user,
    before: result.before,
    after: result.after,
    metadata: {
      source: "portal_request",
      siteId,
      reason
    }
  });

  revalidateReception(["/admin/recepcion/solicitudes-portal", "/admin/recepcion/appointments", "/admin/recepcion"]);
  revalidatePath("/portal/app");
  revalidatePath("/portal/app/appointments");
  return {
    appointmentId: result.appointmentId,
    status: result.status
  };
}

function normalizeVitalsInput(input: {
  systolicBp: number;
  diastolicBp: number;
  heartRate?: number | null;
  temperatureC?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  observations?: string | null;
}) {
  const systolicBp = Math.round(Number(input.systolicBp));
  const diastolicBp = Math.round(Number(input.diastolicBp));
  if (!Number.isFinite(systolicBp) || systolicBp < 60 || systolicBp > 260) throw new Error("PA sistólica inválida.");
  if (!Number.isFinite(diastolicBp) || diastolicBp < 30 || diastolicBp > 180) throw new Error("PA diastólica inválida.");

  const heartRate =
    input.heartRate === null || input.heartRate === undefined || input.heartRate === 0
      ? null
      : Math.round(Number(input.heartRate));
  if (heartRate !== null && (!Number.isFinite(heartRate) || heartRate < 20 || heartRate > 260)) {
    throw new Error("FC inválida.");
  }

  const temperatureC =
    input.temperatureC === null || input.temperatureC === undefined || input.temperatureC === 0
      ? null
      : Number(input.temperatureC);
  if (temperatureC !== null && (!Number.isFinite(temperatureC) || temperatureC < 30 || temperatureC > 45)) {
    throw new Error("Temperatura inválida.");
  }

  const weightKg =
    input.weightKg === null || input.weightKg === undefined || input.weightKg === 0 ? null : Number(input.weightKg);
  if (weightKg !== null && (!Number.isFinite(weightKg) || weightKg < 1 || weightKg > 500)) {
    throw new Error("Peso inválido.");
  }

  const heightCm =
    input.heightCm === null || input.heightCm === undefined || input.heightCm === 0 ? null : Number(input.heightCm);
  if (heightCm !== null && (!Number.isFinite(heightCm) || heightCm < 20 || heightCm > 260)) {
    throw new Error("Talla inválida.");
  }

  const observations = input.observations?.trim() || null;
  return {
    systolicBp,
    diastolicBp,
    heartRate,
    temperatureC,
    weightKg,
    heightCm,
    observations
  };
}

export async function actionSaveReceptionAppointmentVitals(input: SaveReceptionAppointmentVitalsInput) {
  const user = await requireUser();
  assertCapability(user, "VISIT_CREATE");
  const siteId = await resolveSiteId(user, input.siteId);

  const appointmentId = input.appointmentId?.trim();
  if (!appointmentId) throw new Error("Cita requerida.");

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, branchId: true }
  });
  if (!appointment) throw new Error("Cita no encontrada.");
  if (appointment.branchId !== siteId) throw new Error("La cita no pertenece a la sede activa.");

  const { systolicBp, diastolicBp, heartRate, temperatureC, weightKg, heightCm, observations } = normalizeVitalsInput(input);

  const saved = await prisma.receptionAppointmentVitals.upsert({
    where: { appointmentId },
    update: {
      siteId,
      systolicBp,
      diastolicBp,
      heartRate,
      temperatureC,
      weightKg,
      heightCm,
      observations,
      vitalsJson: {
        pa: `${systolicBp}/${diastolicBp}`,
        fc: heartRate,
        tempC: temperatureC,
        pesoKg: weightKg,
        tallaCm: heightCm,
        observaciones: observations
      },
      createdByUserId: user.id
    },
    create: {
      appointmentId,
      siteId,
      systolicBp,
      diastolicBp,
      heartRate,
      temperatureC,
      weightKg,
      heightCm,
      observations,
      vitalsJson: {
        pa: `${systolicBp}/${diastolicBp}`,
        fc: heartRate,
        tempC: temperatureC,
        pesoKg: weightKg,
        tallaCm: heightCm,
        observaciones: observations
      },
      createdByUserId: user.id
    },
    select: {
      id: true,
      appointmentId: true,
      updatedAt: true
    }
  });

  revalidateReception(["/admin/recepcion/appointments", "/admin/recepcion"]);
  return saved;
}

export async function actionSaveReceptionVisitVitals(input: SaveReceptionVisitVitalsInput) {
  const user = await requireUser();
  assertCapability(user, "VISIT_CHECKIN");
  const siteId = await resolveSiteId(user, input.siteId);

  const visitId = input.visitId?.trim();
  if (!visitId) throw new Error("Visita requerida.");

  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    select: { id: true, siteId: true }
  });
  if (!visit) throw new Error("Visita no encontrada.");
  if (visit.siteId !== siteId) throw new Error("La visita no pertenece a la sede activa.");

  const { systolicBp, diastolicBp, heartRate, temperatureC, weightKg, heightCm, observations } = normalizeVitalsInput(input);

  const saved = await prisma.receptionVisitVitals.upsert({
    where: { visitId },
    update: {
      siteId,
      systolicBp,
      diastolicBp,
      heartRate,
      temperatureC,
      weightKg,
      heightCm,
      observations,
      vitalsJson: {
        pa: `${systolicBp}/${diastolicBp}`,
        fc: heartRate,
        tempC: temperatureC,
        pesoKg: weightKg,
        tallaCm: heightCm,
        observaciones: observations
      },
      createdByUserId: user.id
    },
    create: {
      visitId,
      siteId,
      systolicBp,
      diastolicBp,
      heartRate,
      temperatureC,
      weightKg,
      heightCm,
      observations,
      vitalsJson: {
        pa: `${systolicBp}/${diastolicBp}`,
        fc: heartRate,
        tempC: temperatureC,
        pesoKg: weightKg,
        tallaCm: heightCm,
        observaciones: observations
      },
      createdByUserId: user.id
    },
    select: {
      id: true,
      visitId: true,
      updatedAt: true
    }
  });

  revalidateReception(["/admin/recepcion", "/admin/recepcion/worklist", "/admin/recepcion/companies"]);
  return saved;
}

export async function actionSearchPatients(query: string): Promise<PatientSearchResult[]> {
  const user = await requireUser();
  assertCapability(user, "VISIT_CREATE");
  if (!query || query.trim().length < 2) return [];

  const q = query.trim();
  const results = await prisma.clientProfile.findMany({
    where: {
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { dpi: { contains: q } },
        { nit: { contains: q } }
      ]
    },
    orderBy: { updatedAt: "desc" },
    take: 12,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      dpi: true,
      nit: true
    }
  });

  return results;
}

export async function actionCreatePatient(input: PatientCreateInput): Promise<PatientSearchResult> {
  const user = await requireUser();
  assertCapability(user, "VISIT_CREATE");
  const firstName = input.firstName?.trim();
  if (!firstName) throw new Error("Nombre requerido.");

  const lastName = input.lastName?.trim() || null;
  const phone = input.phone?.trim();
  if (!phone) throw new Error("Teléfono requerido.");

  const sex = input.sex ?? null;
  if (sex && sex !== PatientSex.M && sex !== PatientSex.F) {
    throw new Error("Sexo inválido.");
  }

  const dpi = input.dpi?.trim() || null;
  const nit = input.nit?.trim() || null;
  const birthDate = input.birthDate ? new Date(input.birthDate) : null;
  if (birthDate && Number.isNaN(birthDate.getTime())) {
    throw new Error("Fecha de nacimiento inválida.");
  }

  const uniqueOr: Array<{ dpi?: string; nit?: string }> = [];
  if (dpi) uniqueOr.push({ dpi });
  if (nit) uniqueOr.push({ nit });
  if (uniqueOr.length) {
    const existing = await prisma.clientProfile.findFirst({
      where: { OR: uniqueOr },
      select: { id: true }
    });
    if (existing) {
      throw new Error("Ya existe un paciente con ese DPI/NIT.");
    }
  }

  const saved = await prisma.clientProfile.create({
    data: {
      type: ClientProfileType.PERSON,
      firstName,
      lastName,
      phone,
      sex,
      birthDate,
      dpi,
      nit
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      dpi: true,
      nit: true
    }
  });

  revalidateReception(["/admin/recepcion/check-in"]);
  return saved;
}

export async function actionGetReceptionSlaSettings(siteId?: string) {
  const user = await requireUser();
  assertReceptionAccess(user);
  const resolvedSiteId = await resolveSiteId(user, siteId);
  return getReceptionSlaPolicy(resolvedSiteId);
}

export async function actionSaveReceptionSlaSimple(input: ReceptionSlaSimpleInput) {
  const user = await requireUser();
  assertCapability(user, "SETTINGS_EDIT");
  const resolvedSiteId = await resolveSiteId(user, input.siteId);

  const result = await saveReceptionSlaSimpleConfig({
    branchId: resolvedSiteId,
    userId: user.id,
    draft: {
      applyToAllAreas: input.applyToAllAreas,
      waitingWarningMin: input.waitingWarningMin,
      waitingCriticalMin: input.waitingCriticalMin,
      inServiceMaxMin: input.inServiceMaxMin
    }
  });

  await auditLog({
    action: "RECEPTION_SLA_SAVE_SIMPLE",
    entityType: RECEPTION_SLA_AUDIT_ENTITY_TYPE,
    entityId: resolvedSiteId,
    user,
    before: result.before,
    after: result.after,
    metadata: {
      branchId: resolvedSiteId,
      mode: "simple"
    }
  });

  revalidateReception(["/admin/recepcion/settings", "/admin/recepcion", "/admin/recepcion/dashboard"]);
  return result.after;
}

export async function actionSaveReceptionSlaAdvanced(input: ReceptionSlaAdvancedInput) {
  const user = await requireUser();
  assertCapability(user, "SETTINGS_EDIT");
  const resolvedSiteId = await resolveSiteId(user, input.siteId);

  const result = await saveReceptionSlaAdvancedConfig({
    branchId: resolvedSiteId,
    userId: user.id,
    applyToAllAreas: input.applyToAllAreas,
    base: {
      applyToAllAreas: input.applyToAllAreas,
      waitingWarningMin: input.waitingWarningMin,
      waitingCriticalMin: input.waitingCriticalMin,
      inServiceMaxMin: input.inServiceMaxMin
    },
    areaRows: input.areaRows
  });

  await auditLog({
    action: "RECEPTION_SLA_SAVE_ADVANCED",
    entityType: RECEPTION_SLA_AUDIT_ENTITY_TYPE,
    entityId: resolvedSiteId,
    user,
    before: result.before,
    after: result.after,
    metadata: {
      branchId: resolvedSiteId,
      mode: "advanced"
    }
  });

  revalidateReception(["/admin/recepcion/settings", "/admin/recepcion", "/admin/recepcion/dashboard"]);
  return result.after;
}

export async function actionRestoreReceptionSlaRecommended(siteId?: string) {
  const user = await requireUser();
  assertCapability(user, "SETTINGS_EDIT");
  const resolvedSiteId = await resolveSiteId(user, siteId);

  const result = await restoreReceptionSlaRecommended({
    branchId: resolvedSiteId,
    userId: user.id
  });

  await auditLog({
    action: "RECEPTION_SLA_RESTORE_RECOMMENDED",
    entityType: RECEPTION_SLA_AUDIT_ENTITY_TYPE,
    entityId: resolvedSiteId,
    user,
    before: result.before,
    after: result.after,
    metadata: {
      branchId: resolvedSiteId,
      mode: "simple",
      restore: true
    }
  });

  revalidateReception(["/admin/recepcion/settings", "/admin/recepcion", "/admin/recepcion/dashboard"]);
  return result.after;
}

export async function actionListReceptionSlaAudit(siteId?: string) {
  const user = await requireUser();
  assertReceptionAccess(user);
  const resolvedSiteId = await resolveSiteId(user, siteId);

  const rows = await prisma.auditLog.findMany({
    where: {
      entityType: RECEPTION_SLA_AUDIT_ENTITY_TYPE,
      entityId: resolvedSiteId
    },
    orderBy: { timestamp: "desc" },
    take: 30,
    select: {
      id: true,
      timestamp: true,
      action: true,
      actorUserId: true,
      before: true,
      after: true,
      metadata: true,
      actorUser: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });

  return rows.map((row) => ({
    id: row.id,
    timestamp: row.timestamp.toISOString(),
    action: row.action,
    actorUserId: row.actorUserId,
    actorName: row.actorUser?.name ?? row.actorUser?.email ?? null,
    before: row.before,
    after: row.after,
    metadata: row.metadata
  }));
}

export async function actionGetReceptionContext() {
  const user = await requireUser();
  const context = buildReceptionContext(user);
  return context;
}

export async function actionListReceptionBranches() {
  const user = await requireUser();
  assertReceptionAccess(user);
  return listReceptionBranchOptions(user);
}

export async function actionSetReceptionActiveBranch(branchId: string) {
  const user = await requireUser();
  assertReceptionAccess(user);
  const clean = branchId?.trim();
  if (!clean) throw new Error("Sede requerida.");

  await assertReceptionBranchSelectable(user, clean);

  const cookieStore = await cookies();
  cookieStore.set({
    name: RECEPTION_ACTIVE_BRANCH_COOKIE_NAME,
    value: clean,
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin/recepcion",
    maxAge: 60 * 60 * 24 * 30
  });

  revalidateReception();
  return { ok: true, branchId: clean };
}

export async function actionCreateClientRegistrationInvite(input: {
  clientType: ClientProfileType;
  expiryDays?: number;
  note?: string;
}) {
  const user = await requireUser();
  assertCapability(user, "VISIT_CREATE");

  const tenantId = tenantIdFromUser(user);
  if (
    input.clientType !== ClientProfileType.PERSON &&
    input.clientType !== ClientProfileType.COMPANY &&
    input.clientType !== ClientProfileType.INSTITUTION &&
    input.clientType !== ClientProfileType.INSURER
  ) {
    throw new Error("Tipo de cliente inválido.");
  }

  const expiryDaysRaw = Number.isFinite(input.expiryDays) ? Number(input.expiryDays) : 7;
  const expiryDays = Math.min(30, Math.max(1, Math.floor(expiryDaysRaw)));
  const note = String(input.note ?? "").trim() || null;
  if (note && note.length > 300) {
    throw new Error("La nota no puede exceder 300 caracteres.");
  }

  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

  const created = await prisma.clientRegistrationInvite.create({
    data: {
      tenantId,
      clientType: input.clientType,
      tokenHash: `__pending__:${crypto.randomUUID()}`,
      note,
      expiresAt,
      createdByUserId: user.id
    },
    select: {
      id: true,
      tenantId: true,
      clientType: true,
      note: true,
      expiresAt: true
    }
  });

  const token = createClientRegistrationInviteToken({
    inviteId: created.id,
    tenantId: created.tenantId,
    clientType: created.clientType,
    expiresAt: created.expiresAt
  });
  await prisma.clientRegistrationInvite.update({
    where: { id: created.id },
    data: {
      tokenHash: hashClientRegistrationToken(token)
    }
  });

  await auditLog({
    action: "RECEPTION_CLIENT_REGISTRATION_INVITE_CREATED",
    entityType: "ClientRegistrationInvite",
    entityId: created.id,
    user,
    metadata: {
      tenantId: created.tenantId,
      clientType: created.clientType,
      expiresAt: created.expiresAt.toISOString()
    }
  });

  revalidateReception(["/admin/recepcion/registros"]);

  return {
    inviteId: created.id,
    clientType: created.clientType,
    note: created.note,
    expiresAt: created.expiresAt.toISOString(),
    token,
    urlPath: `/r/registro/${encodeURIComponent(token)}`
  };
}

export async function actionGetClientSelfRegistrationFormOptions() {
  const user = await requireUser();
  assertCapability(user, "VISIT_CREATE");
  const tenantId = tenantIdFromUser(user);
  return getClientSelfRegistrationFormOptions(tenantId);
}

export async function actionListClientSelfRegistrations(input?: {
  status?: string;
  q?: string;
  take?: number;
}) {
  const user = await requireUser();
  assertCapability(user, "VISIT_CREATE");
  const tenantId = tenantIdFromUser(user);
  const status = normalizeClientSelfRegistrationStatusFilter(input?.status);
  const q = String(input?.q ?? "").trim();
  const take = Math.min(200, Math.max(10, Math.floor(Number(input?.take ?? 80))));

  const rows = await prisma.clientSelfRegistration.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { provisionalCode: { contains: q, mode: "insensitive" } },
              { displayName: { contains: q, mode: "insensitive" } },
              { documentRef: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } }
            ]
          }
        : {})
    },
    orderBy: [{ createdAt: "desc" }],
    take,
    select: {
      id: true,
      inviteId: true,
      provisionalCode: true,
      clientType: true,
      status: true,
      displayName: true,
      documentRef: true,
      email: true,
      phone: true,
      createdAt: true,
      reviewedAt: true,
      rejectedReason: true,
      invite: { select: { expiresAt: true } },
      assignedClient: {
        select: {
          id: true,
          clientCode: true,
          type: true,
          firstName: true,
          middleName: true,
          lastName: true,
          secondLastName: true,
          companyName: true,
          tradeName: true
        }
      }
    }
  });

  return rows.map<ClientSelfRegistrationQueueRow>((row) => ({
    id: row.id,
    inviteId: row.inviteId,
    provisionalCode: row.provisionalCode,
    clientType: row.clientType,
    status: row.status,
    displayName: row.displayName,
    documentRef: row.documentRef,
    email: row.email,
    phone: row.phone,
    createdAt: row.createdAt.toISOString(),
    inviteExpiresAt: row.invite.expiresAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    rejectedReason: row.rejectedReason,
    assignedClient: row.assignedClient
      ? {
          id: row.assignedClient.id,
          clientCode: row.assignedClient.clientCode,
          label: formatClientDisplayLabel({
            type: row.assignedClient.type,
            clientCode: row.assignedClient.clientCode,
            firstName: row.assignedClient.firstName,
            middleName: row.assignedClient.middleName,
            lastName: row.assignedClient.lastName,
            secondLastName: row.assignedClient.secondLastName,
            companyName: row.assignedClient.companyName,
            tradeName: row.assignedClient.tradeName
          })
        }
      : null
  }));
}

export async function actionGetClientSelfRegistrationDetail(registrationId: string): Promise<ClientSelfRegistrationDetail> {
  const user = await requireUser();
  assertCapability(user, "VISIT_CREATE");
  const tenantId = tenantIdFromUser(user);
  const id = String(registrationId || "").trim();
  if (!id) throw new Error("Registro requerido.");

  const row = await prisma.clientSelfRegistration.findFirst({
    where: {
      id,
      tenantId
    },
    select: {
      id: true,
      inviteId: true,
      provisionalCode: true,
      clientType: true,
      status: true,
      displayName: true,
      documentRef: true,
      email: true,
      phone: true,
      payloadJson: true,
      createdAt: true,
      reviewedAt: true,
      rejectedReason: true,
      invite: { select: { expiresAt: true } },
      assignedClient: {
        select: {
          id: true,
          clientCode: true,
          type: true,
          firstName: true,
          middleName: true,
          lastName: true,
          secondLastName: true,
          companyName: true,
          tradeName: true
        }
      }
    }
  });
  if (!row) throw new Error("Registro no encontrado.");

  const parsedPayload = parseClientSelfRegistrationPayload(row.clientType, row.payloadJson);
  const hints = getSelfRegistrationIdentityHints(parsedPayload);

  const duplicateWhere: Prisma.ClientProfileWhereInput[] = [];
  if (hints.nit) duplicateWhere.push({ nit: hints.nit });
  if (hints.dpi) duplicateWhere.push({ dpi: hints.dpi });
  if (hints.email) duplicateWhere.push({ email: hints.email });
  if (hints.phone) duplicateWhere.push({ phone: hints.phone });

  const duplicates = duplicateWhere.length
    ? await prisma.clientProfile.findMany({
        where: {
          tenantId,
          deletedAt: null,
          OR: duplicateWhere
        },
        orderBy: [{ updatedAt: "desc" }],
        take: 12,
        select: {
          id: true,
          clientCode: true,
          type: true,
          firstName: true,
          middleName: true,
          lastName: true,
          secondLastName: true,
          companyName: true,
          tradeName: true,
          nit: true,
          dpi: true,
          email: true,
          phone: true
        }
      })
    : [];

  return {
    id: row.id,
    inviteId: row.inviteId,
    provisionalCode: row.provisionalCode,
    clientType: row.clientType,
    status: row.status,
    displayName: row.displayName,
    documentRef: row.documentRef,
    email: row.email,
    phone: row.phone,
    createdAt: row.createdAt.toISOString(),
    inviteExpiresAt: row.invite.expiresAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    rejectedReason: row.rejectedReason,
    payloadJson: row.payloadJson,
    assignedClient: row.assignedClient
      ? {
          id: row.assignedClient.id,
          clientCode: row.assignedClient.clientCode,
          label: formatClientDisplayLabel({
            type: row.assignedClient.type,
            clientCode: row.assignedClient.clientCode,
            firstName: row.assignedClient.firstName,
            middleName: row.assignedClient.middleName,
            lastName: row.assignedClient.lastName,
            secondLastName: row.assignedClient.secondLastName,
            companyName: row.assignedClient.companyName,
            tradeName: row.assignedClient.tradeName
          })
        }
      : null,
    duplicates: duplicates.map((item) => ({
      id: item.id,
      clientCode: item.clientCode,
      type: item.type,
      label: formatClientDisplayLabel({
        type: item.type,
        clientCode: item.clientCode,
        firstName: item.firstName,
        middleName: item.middleName,
        lastName: item.lastName,
        secondLastName: item.secondLastName,
        companyName: item.companyName,
        tradeName: item.tradeName
      }),
      nit: item.nit,
      dpi: item.dpi,
      email: item.email,
      phone: item.phone
    }))
  };
}

export async function actionApproveClientSelfRegistration(input: { registrationId: string }) {
  const user = await requireUser();
  assertRoleAtLeast(user, "RECEPTION_SUPERVISOR", "aprobar registros");
  const tenantId = tenantIdFromUser(user);
  const registrationId = String(input.registrationId || "").trim();
  if (!registrationId) throw new Error("Registro requerido.");

  const registration = await prisma.clientSelfRegistration.findFirst({
    where: {
      id: registrationId,
      tenantId
    },
    select: {
      id: true,
      tenantId: true,
      status: true,
      clientType: true,
      payloadJson: true
    }
  });
  if (!registration) throw new Error("Registro no encontrado.");
  if (registration.status !== ClientSelfRegistrationStatus.PENDING) {
    throw new Error("Solo se pueden aprobar registros pendientes.");
  }

  const payload = parseClientSelfRegistrationPayload(registration.clientType, registration.payloadJson);

  let createdClientId: string;

  if (payload.clientType === ClientProfileType.PERSON) {
    const created = await actionCreatePersonClient({
      firstName: payload.firstName,
      lastName: payload.lastName,
      dpi: payload.idValue,
      phone: payload.phone,
      email: payload.email ?? undefined,
      addressGeneral: `${payload.address}, ${payload.city}, ${payload.department}, ${payload.country}`
    });
    createdClientId = created.id;
  } else if (payload.clientType === ClientProfileType.COMPANY) {
    const created = await actionCreateCompanyClient({
      legalName: payload.legalName,
      tradeName: payload.tradeName,
      nit: payload.nit,
      address: payload.address,
      city: payload.city,
      department: payload.department,
      country: payload.country,
      phone: payload.phone,
      email: payload.email ?? undefined,
      billingEmail: payload.email ?? undefined
    });
    createdClientId = created.id;
  } else if (payload.clientType === ClientProfileType.INSTITUTION) {
    const institutionTypeId = await ensureInstitutionCatalogIdForApproval({
      id: payload.institutionTypeId,
      type: ClientCatalogType.INSTITUTION_TYPE
    });
    if (!institutionTypeId) {
      throw new Error("Tipo de institución inválido.");
    }
    const institutionRegimeId = await ensureInstitutionCatalogIdForApproval({
      id: payload.institutionRegimeId,
      type: ClientCatalogType.INSTITUTION_CATEGORY
    });

    const created = await actionCreateInstitutionClient({
      name: payload.legalName,
      tradeName: payload.publicName,
      nit: payload.nit ?? undefined,
      institutionTypeId,
      institutionCategoryId: institutionRegimeId ?? undefined,
      address: payload.address,
      city: payload.city,
      department: payload.department,
      country: payload.country,
      phone: payload.phone,
      email: payload.email ?? undefined,
      billingEmail: payload.email ?? undefined
    });
    createdClientId = created.id;
  } else {
    const created = await actionCreateInsurerClient({
      legalName: payload.legalName,
      tradeName: payload.tradeName ?? undefined,
      nit: payload.nit,
      address: payload.address,
      city: payload.city,
      department: payload.department,
      country: payload.country,
      phone: payload.phone,
      email: payload.email ?? undefined,
      billingEmail: payload.email ?? undefined,
      insurerTypeId: payload.insurerTypeId,
      insurerScope: payload.insurerScope ?? undefined,
      insurerLinePrimaryCode: payload.insurerLinePrimaryCode
    });
    createdClientId = created.id;
  }

  await prisma.clientSelfRegistration.update({
    where: { id: registration.id },
    data: {
      status: ClientSelfRegistrationStatus.APPROVED,
      reviewedAt: new Date(),
      reviewedByUserId: user.id,
      assignedClientId: createdClientId,
      rejectedReason: null
    }
  });

  await auditLog({
    action: "RECEPTION_CLIENT_SELF_REGISTRATION_APPROVED",
    entityType: "ClientSelfRegistration",
    entityId: registration.id,
    user,
    metadata: {
      tenantId,
      assignedClientId: createdClientId,
      clientType: registration.clientType
    }
  });

  revalidateReception(["/admin/recepcion/registros"]);
  revalidatePath(`/admin/clientes/${createdClientId}`);
  revalidatePath("/admin/clientes");

  return {
    registrationId: registration.id,
    assignedClientId: createdClientId
  };
}

export async function actionRejectClientSelfRegistration(input: {
  registrationId: string;
  reason: string;
}) {
  const user = await requireUser();
  assertRoleAtLeast(user, "RECEPTION_SUPERVISOR", "rechazar registros");
  const tenantId = tenantIdFromUser(user);
  const registrationId = String(input.registrationId || "").trim();
  const reason = String(input.reason || "").trim();
  if (!registrationId) throw new Error("Registro requerido.");
  if (reason.length < 5) throw new Error("Motivo de rechazo requerido (mínimo 5 caracteres).");

  const updated = await prisma.clientSelfRegistration.updateMany({
    where: {
      id: registrationId,
      tenantId,
      status: ClientSelfRegistrationStatus.PENDING
    },
    data: {
      status: ClientSelfRegistrationStatus.REJECTED,
      rejectedReason: reason,
      reviewedAt: new Date(),
      reviewedByUserId: user.id
    }
  });
  if (updated.count === 0) {
    throw new Error("No se pudo rechazar: el registro no existe o ya fue procesado.");
  }

  await auditLog({
    action: "RECEPTION_CLIENT_SELF_REGISTRATION_REJECTED",
    entityType: "ClientSelfRegistration",
    entityId: registrationId,
    user,
    metadata: {
      tenantId,
      reason
    }
  });

  revalidateReception(["/admin/recepcion/registros"]);
  return {
    registrationId,
    status: ClientSelfRegistrationStatus.REJECTED
  };
}

async function getNextQueueByArea(siteId: string) {
  const dateKey = getTicketDateKey();
  const rows = await prisma.queueItem.findMany({
    where: {
      queue: { siteId },
      status: QueueItemStatus.WAITING,
      visit: { ticketDateKey: dateKey }
    },
    orderBy: [
      { priority: "asc" },
      { sequence: "asc" },
      { enqueuedAt: "asc" }
    ],
    select: {
      id: true,
      queue: { select: { area: true } }
    }
  });

  const nextByArea: Record<string, string | null> = {};
  for (const area of RECEPTION_AREAS) {
    nextByArea[area] = null;
  }
  for (const row of rows) {
    const area = row.queue.area;
    if (!nextByArea[area]) {
      nextByArea[area] = row.id;
    }
  }
  return nextByArea;
}
