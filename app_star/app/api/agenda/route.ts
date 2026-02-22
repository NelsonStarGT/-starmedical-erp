import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { agendaEmitter } from "@/lib/agendaEvents";
import { AppointmentStatus, ClientProfileType, PaymentStatus } from "@prisma/client";
import { Cita } from "@/lib/types/agenda";
import { requireAuth } from "@/lib/auth";
import { auditLog, auditPermissionDenied } from "@/lib/audit";
import { canWriteAgenda, enforceAgendaBranchScope, type AgendaMutationSnapshot } from "@/lib/agenda/access";
import { getEffectiveScope } from "@/lib/branch/effectiveScope";

const AGENDA_PATIENT_SELECT = {
  id: true,
  type: true,
  firstName: true,
  middleName: true,
  lastName: true,
  secondLastName: true,
  companyName: true,
  tradeName: true
} as const;

type AgendaPatientSnapshot = {
  id: string;
  type: ClientProfileType;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  secondLastName: string | null;
  companyName: string | null;
  tradeName: string | null;
};

type AgendaAppointmentRow = Awaited<ReturnType<typeof prisma.appointment.findMany>>[number] & {
  patient?: AgendaPatientSnapshot | null;
};

type AppointmentFindManyDelegate = {
  findMany: (args: unknown) => Promise<AgendaAppointmentRow[]>;
};

function normalizeValue(value: unknown) {
  return String(value ?? "").trim();
}

function isUnknownAppointmentPatientRelationError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (!message.includes("appointment")) return false;
  return (
    message.includes("unknown field `patient`") ||
    message.includes("unknown field 'patient'") ||
    message.includes("unknown arg `include`") ||
    message.includes("unknown argument `include`") ||
    message.includes("unknown argument 'include'") ||
    (message.includes("unknown") && message.includes("include") && message.includes("patient"))
  );
}

async function buildAgendaPatientLookup(patientIds: string[]) {
  const normalizedIds = Array.from(new Set(patientIds.map((id) => normalizeValue(id)).filter(Boolean)));
  if (!normalizedIds.length) return new Map<string, AgendaPatientSnapshot>();

  const rows = await prisma.clientProfile.findMany({
    where: { id: { in: normalizedIds } },
    select: AGENDA_PATIENT_SELECT
  });
  return new Map(rows.map((row) => [row.id, row]));
}

function resolveAgendaPatientFromAppointment(
  app: { patientId?: string | null; patient?: AgendaPatientSnapshot | null },
  patientLookup?: Map<string, AgendaPatientSnapshot>
) {
  if (app.patient) return app.patient;
  const patientId = normalizeValue(app.patientId);
  if (!patientId || !patientLookup) return null;
  return patientLookup.get(patientId) ?? null;
}

function buildAgendaPatientIdentity(patient: AgendaPatientSnapshot | null) {
  if (!patient) {
    return {
      firstName: "",
      lastName: "",
      displayName: ""
    };
  }

  if (patient.type === "PERSON") {
    const firstName = [patient.firstName, patient.middleName].filter(Boolean).join(" ").trim();
    const lastName = [patient.lastName, patient.secondLastName].filter(Boolean).join(" ").trim();
    const displayName = [firstName, lastName].filter(Boolean).join(" ").trim();
    return {
      firstName,
      lastName,
      displayName
    };
  }

  const companyLabel = normalizeValue(patient.companyName) || normalizeValue(patient.tradeName);
  return {
    firstName: companyLabel,
    lastName: "",
    displayName: companyLabel
  };
}

async function findAgendaAppointmentsWithPatient(where: Record<string, unknown>): Promise<AgendaAppointmentRow[]> {
  const appointmentDelegate = prisma.appointment as unknown as AppointmentFindManyDelegate;
  try {
    return await appointmentDelegate.findMany({
      where,
      orderBy: { date: "asc" },
      include: {
        patient: {
          select: AGENDA_PATIENT_SELECT
        }
      }
    });
  } catch (error) {
    if (!isUnknownAppointmentPatientRelationError(error)) throw error;

    const rows = await prisma.appointment.findMany({
      where,
      orderBy: { date: "asc" }
    });
    const patientLookup = await buildAgendaPatientLookup(rows.map((row) => row.patientId));
    return rows.map((row) => ({
      ...row,
      patient: patientLookup.get(row.patientId) ?? null
    }));
  }
}

async function resolveAgendaBranchScope(params: {
  req: NextRequest;
  user: NonNullable<ReturnType<typeof requireAuth>["user"]>;
  targetBranchId?: string | null;
}) {
  try {
    const scope = await getEffectiveScope({
      user: params.user,
      cookieStore: params.req.cookies,
      requestedBranchId: params.targetBranchId ?? null
    });
    return {
      allowed: true,
      reason: null,
      effectiveBranchId: scope.branchId
    } as const;
  } catch (error) {
    if (error instanceof Error && error.message === "Sucursal no autorizada.") {
      const fallback = enforceAgendaBranchScope(params.user, null);
      return {
        allowed: false,
        reason: "No autorizado para esta sede",
        effectiveBranchId: fallback.effectiveBranchId
      } as const;
    }
    throw error;
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const fecha = searchParams.get("date");
    const specialistId = searchParams.get("specialistId");
    const branchId = searchParams.get("branchId");
    const status = searchParams.get("status");

    const branchScope = await resolveAgendaBranchScope({
      req,
      user: auth.user!,
      targetBranchId: branchId
    });
    if (!branchScope.allowed) {
      return NextResponse.json({ error: branchScope.reason || "No autorizado para esta sede" }, { status: 403 });
    }

    const where: any = {};
    if (fecha) {
      const start = startOfDay(fecha);
      const end = endOfDay(fecha);
      where.date = { gte: start, lt: end };
    } else if (from || to) {
      where.date = {
        gte: from ? new Date(from) : undefined,
        lt: to ? new Date(to) : undefined
      };
    }
    if (specialistId) where.specialistId = specialistId;
    if (branchScope.effectiveBranchId) where.branchId = branchScope.effectiveBranchId;
    if (status) where.status = toPrismaStatus(status as any);

    const apps = await findAgendaAppointmentsWithPatient(where);
    const data = await Promise.all(apps.map(async (a) => toDto(a)));
    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const missing = validate(body);
    if (missing) return NextResponse.json({ error: missing }, { status: 400 });

    const branchScope = await resolveAgendaBranchScope({
      req,
      user: auth.user!,
      targetBranchId: body?.sucursalId
    });
    if (!branchScope.allowed) {
      await auditPermissionDenied(auth.user, req, "AGENDA_APPOINTMENT", "branch_scope");
      return NextResponse.json({ error: branchScope.reason || "No autorizado para esta sede" }, { status: 403 });
    }

    const writeDecision = canWriteAgenda(auth.user, "POST", { after: toAccessSnapshot(body) });
    if (!writeDecision.allowed) {
      await auditPermissionDenied(auth.user, req, "AGENDA_APPOINTMENT", "create");
      return NextResponse.json({ error: writeDecision.reason || "No autorizado" }, { status: 403 });
    }

    const parsed = await toPrismaInput(body, auth.user!.id);
    const conflict = await hasOverlap(parsed, body.id);
    if (conflict) return NextResponse.json({ error: conflict }, { status: 409 });

    const created = await prisma.appointment.create({ data: parsed });
    const createdPatientLookup = await buildAgendaPatientLookup([created.patientId]);
    const dto = await toDto(created, createdPatientLookup);
    agendaEmitter.emit("appointment_created", dto);

    await auditLog({
      action: "AGENDA_APPOINTMENT_CREATE",
      entityType: "APPOINTMENT",
      entityId: dto.id,
      after: dto,
      user: auth.user,
      req,
      metadata: { branchId: dto.sucursalId, method: "POST" }
    });

    return NextResponse.json({ data: dto }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const missing = validate(body);
    if (missing) return NextResponse.json({ error: missing }, { status: 400 });

    const before = await prisma.appointment.findUnique({ where: { id: body.id } });
    if (!before) return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
    const beforePatientLookup = await buildAgendaPatientLookup([before.patientId]);
    const beforeDto = await toDto(before, beforePatientLookup);

    const branchScopeCurrent = await resolveAgendaBranchScope({
      req,
      user: auth.user!,
      targetBranchId: before.branchId
    });
    if (!branchScopeCurrent.allowed) {
      await auditPermissionDenied(auth.user, req, "AGENDA_APPOINTMENT", body.id);
      return NextResponse.json({ error: branchScopeCurrent.reason || "No autorizado para esta sede" }, { status: 403 });
    }

    const parsed = await toPrismaInput(body, auth.user!.id);
    const branchScopeTarget = await resolveAgendaBranchScope({
      req,
      user: auth.user!,
      targetBranchId: parsed.branchId
    });
    if (!branchScopeTarget.allowed) {
      await auditPermissionDenied(auth.user, req, "AGENDA_APPOINTMENT", body.id);
      return NextResponse.json({ error: branchScopeTarget.reason || "No autorizado para esta sede" }, { status: 403 });
    }

    const writeDecision = canWriteAgenda(auth.user, "PUT", {
      before: toAccessSnapshot(beforeDto),
      after: toAccessSnapshot(body)
    });
    if (!writeDecision.allowed) {
      await auditPermissionDenied(auth.user, req, "AGENDA_APPOINTMENT", body.id);
      return NextResponse.json({ error: writeDecision.reason || "No autorizado" }, { status: 403 });
    }

    const conflict = await hasOverlap(parsed, body.id);
    if (conflict) return NextResponse.json({ error: conflict }, { status: 409 });

    const { id: _ignoredId, ...parsedWithoutId } = parsed;

    const updated = await prisma.appointment.update({
      where: { id: body.id },
      data: {
        ...parsedWithoutId,
        createdById: before.createdById,
        updatedById: auth.user!.id
      }
    });
    const updatedPatientLookup = await buildAgendaPatientLookup([updated.patientId]);
    const dto = await toDto(updated, updatedPatientLookup);
    agendaEmitter.emit("appointment_updated", dto);

    await auditLog({
      action: "AGENDA_APPOINTMENT_UPDATE",
      entityType: "APPOINTMENT",
      entityId: dto.id,
      before: beforeDto,
      after: dto,
      user: auth.user,
      req,
      metadata: { branchId: dto.sucursalId, method: "PUT" }
    });

    return NextResponse.json({ data: dto }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  return PUT(req);
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json().catch(() => ({}));
    const id = body.id || new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const before = await prisma.appointment.findUnique({ where: { id } });
    if (!before) return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
    const beforePatientLookup = await buildAgendaPatientLookup([before.patientId]);
    const beforeDto = await toDto(before, beforePatientLookup);

    const branchScope = await resolveAgendaBranchScope({
      req,
      user: auth.user!,
      targetBranchId: before.branchId
    });
    if (!branchScope.allowed) {
      await auditPermissionDenied(auth.user, req, "AGENDA_APPOINTMENT", id);
      return NextResponse.json({ error: branchScope.reason || "No autorizado para esta sede" }, { status: 403 });
    }

    const writeDecision = canWriteAgenda(auth.user, "DELETE", { before: toAccessSnapshot(beforeDto) });
    if (!writeDecision.allowed) {
      await auditPermissionDenied(auth.user, req, "AGENDA_APPOINTMENT", id);
      return NextResponse.json({ error: writeDecision.reason || "No autorizado" }, { status: 403 });
    }

    await prisma.appointment.delete({ where: { id } });
    agendaEmitter.emit("appointment_deleted", { id, sucursalId: before.branchId });

    await auditLog({
      action: "AGENDA_APPOINTMENT_DELETE",
      entityType: "APPOINTMENT",
      entityId: id,
      before: beforeDto,
      user: auth.user,
      req,
      metadata: { branchId: before.branchId, method: "DELETE" }
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}

// Helpers

async function toPrismaInput(dto: any, actorUserId?: string) {
  const { fecha, horaInicio, horaFin, tipoCitaId } = dto;
  const start = mergeFechaHora(fecha, horaInicio);
  const end = horaFin ? mergeFechaHora(fecha, horaFin) : new Date(start.getTime() + 30 * 60000);
  const durationMin = dto.durationMin || Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000));
  const actor = actorUserId || dto.creadoPor || "system";
  return {
    id: dto.id,
    date: start,
    durationMin,
    patientId: dto.pacienteId,
    specialistId: dto.medicoId,
    branchId: dto.sucursalId,
    roomId: dto.salaId || null,
    typeId: tipoCitaId,
    status: toPrismaStatus(dto.estado),
    paymentStatus: toPrismaPayment(dto.estadoPago),
    companyId: dto.empresaId || null,
    notes: dto.notas,
    createdById: actor,
    updatedById: actor
  };
}

function toAccessSnapshot(dto: any): AgendaMutationSnapshot {
  return {
    fecha: String(dto?.fecha || ""),
    horaInicio: String(dto?.horaInicio || ""),
    horaFin: String(dto?.horaFin || ""),
    pacienteId: String(dto?.pacienteId || ""),
    medicoId: String(dto?.medicoId || ""),
    sucursalId: String(dto?.sucursalId || ""),
    salaId: dto?.salaId ?? null,
    tipoCitaId: String(dto?.tipoCitaId || ""),
    estado: (dto?.estado as Cita["estado"]) || "Programada",
    estadoPago: (dto?.estadoPago as Cita["estadoPago"]) || "Pendiente",
    empresaId: dto?.empresaId ?? null,
    notas: typeof dto?.notas === "string" ? dto.notas : dto?.notas == null ? null : String(dto.notas)
  };
}

async function toDto(app: AgendaAppointmentRow, patientLookup?: Map<string, AgendaPatientSnapshot>): Promise<Cita> {
  const fecha = toDateInput(app.date);
  const horaInicio = toTimeInput(app.date);
  const horaFin = toTimeInput(new Date(new Date(app.date).getTime() + app.durationMin * 60000));
  const patient = resolveAgendaPatientFromAppointment(app, patientLookup);
  const patientIdentity = buildAgendaPatientIdentity(patient);
  const appointmentLegacy = app as AgendaAppointmentRow & {
    origen?: Cita["origen"];
    pacienteRecurrente?: boolean;
  };
  return {
    id: app.id,
    fecha,
    horaInicio,
    horaFin,
    pacienteId: app.patientId,
    pacienteNombre: patientIdentity.firstName || undefined,
    pacienteApellidos: patientIdentity.lastName || undefined,
    pacienteDisplayName: patientIdentity.displayName || undefined,
    medicoId: app.specialistId,
    sucursalId: app.branchId,
    salaId: app.roomId || undefined,
    tipoCitaId: app.typeId,
    estado: toDtoStatus(app.status),
    estadoPago: toDtoPayment(app.paymentStatus),
    empresaId: app.companyId || undefined,
    notas: app.notes || undefined,
    origen: appointmentLegacy.origen,
    creadoPor: app.createdById,
    fechaCreacion: app.createdAt.toISOString(),
    ultimaActualizacion: app.updatedAt.toISOString(),
    pacienteRecurrente: appointmentLegacy.pacienteRecurrente ?? true
  };
}

async function hasOverlap(input: Awaited<ReturnType<typeof toPrismaInput>>, ignoreId?: string) {
  const start = input.date;
  const end = new Date(start.getTime() + input.durationMin * 60000);
  const dayStart = startOfDay(start.toISOString().slice(0, 10));
  const dayEnd = endOfDay(start.toISOString().slice(0, 10));

  const candidates = await prisma.appointment.findMany({
    where: {
      id: ignoreId ? { not: ignoreId } : undefined,
      date: { gte: dayStart, lt: dayEnd },
      OR: [
        { specialistId: input.specialistId },
        input.roomId ? { roomId: input.roomId } : undefined
      ].filter(Boolean) as any
    }
  });

  const conflict = candidates.find((c) => {
    const cStart = c.date;
    const cEnd = new Date(c.date.getTime() + c.durationMin * 60000);
    const overlap = start < cEnd && cStart < end;
    const sameSpecialist = c.specialistId === input.specialistId;
    const sameRoom = input.roomId && c.roomId && c.roomId === input.roomId;
    return overlap && (sameSpecialist || sameRoom);
  });

  if (!conflict) return "";
  if (conflict.specialistId === input.specialistId) return "Conflicto: el especialista ya tiene una cita en ese horario.";
  if (input.roomId && conflict.roomId === input.roomId) return "Conflicto: la sala/recurso ya está ocupada.";
  return "Conflicto de horario";
}

function mergeFechaHora(fecha: string, hora: string) {
  return new Date(`${fecha}T${hora}:00`);
}

function startOfDay(fecha: string) {
  return new Date(`${fecha}T00:00:00`);
}

function endOfDay(fecha: string) {
  return new Date(`${fecha}T23:59:59.999`);
}

function toTimeInput(date: Date) {
  const d = new Date(date);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function toDateInput(date: Date) {
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}

function validate(body: any) {
  const required = ["fecha", "horaInicio", "pacienteId", "medicoId", "sucursalId", "tipoCitaId"];
  const missing = required.filter((r) => !body[r]);
  if (missing.length) return `Faltan campos: ${missing.join(", ")}`;
  return "";
}

function toPrismaStatus(estado: Cita["estado"]) {
  switch (estado) {
    case "Confirmada":
      return AppointmentStatus.CONFIRMADA;
    case "En sala":
      return AppointmentStatus.EN_SALA;
    case "Atendida":
      return AppointmentStatus.ATENDIDA;
    case "No se presentó":
      return AppointmentStatus.NO_SHOW;
    case "Cancelada":
      return AppointmentStatus.CANCELADA;
    default:
      return AppointmentStatus.PROGRAMADA;
  }
}

function toDtoStatus(status: AppointmentStatus): Cita["estado"] {
  switch (status) {
    case "CONFIRMADA":
      return "Confirmada";
    case "EN_SALA":
      return "En sala";
    case "ATENDIDA":
      return "Atendida";
    case "NO_SHOW":
      return "No se presentó";
    case "CANCELADA":
      return "Cancelada";
    default:
      return "Programada";
  }
}

function toPrismaPayment(estado?: Cita["estadoPago"]) {
  switch (estado) {
    case "Pagado":
      return PaymentStatus.PAGADO;
    case "Facturado":
      return PaymentStatus.FACTURADO;
    default:
      return PaymentStatus.PENDIENTE;
  }
}

function toDtoPayment(status: PaymentStatus): Cita["estadoPago"] {
  switch (status) {
    case "PAGADO":
      return "Pagado";
    case "FACTURADO":
      return "Facturado";
    default:
      return "Pendiente";
  }
}
