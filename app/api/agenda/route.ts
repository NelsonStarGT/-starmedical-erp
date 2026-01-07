import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { agendaEmitter } from "@/lib/agendaEvents";
import { AppointmentStatus, PaymentStatus } from "@prisma/client";
import { Cita } from "@/lib/types/agenda";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const fecha = searchParams.get("date");
    const specialistId = searchParams.get("specialistId");
    const branchId = searchParams.get("branchId");
    const status = searchParams.get("status");

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
    if (branchId) where.branchId = branchId;
    if (status) where.status = toPrismaStatus(status as any);

    const apps = await prisma.appointment.findMany({ where, orderBy: { date: "asc" } });
    const data = await Promise.all(apps.map(async (a) => toDto(a)));
    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const missing = validate(body);
    if (missing) return NextResponse.json({ error: missing }, { status: 400 });
    const parsed = await toPrismaInput(body);
    const conflict = await hasOverlap(parsed, body.id);
    if (conflict) return NextResponse.json({ error: conflict }, { status: 409 });

    const created = await prisma.appointment.create({ data: parsed });
    const dto = await toDto(created);
    agendaEmitter.emit("appointment_created", dto);
    return NextResponse.json({ data: dto }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const missing = validate(body);
    if (missing) return NextResponse.json({ error: missing }, { status: 400 });
    const parsed = await toPrismaInput(body);
    const conflict = await hasOverlap(parsed, body.id);
    if (conflict) return NextResponse.json({ error: conflict }, { status: 409 });

    const updated = await prisma.appointment.update({
      where: { id: body.id },
      data: { ...parsed, updatedById: parsed.updatedById || parsed.createdById }
    });
    const dto = await toDto(updated);
    agendaEmitter.emit("appointment_updated", dto);
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
    const body = await req.json().catch(() => ({}));
    const id = body.id || new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    await prisma.appointment.delete({ where: { id } });
    agendaEmitter.emit("appointment_deleted", { id });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}

// Helpers

async function toPrismaInput(dto: any) {
  const { fecha, horaInicio, horaFin, tipoCitaId } = dto;
  const start = mergeFechaHora(fecha, horaInicio);
  const end = horaFin ? mergeFechaHora(fecha, horaFin) : new Date(start.getTime() + 30 * 60000);
  const durationMin = dto.durationMin || Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000));
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
    createdById: dto.creadoPor || "system",
    updatedById: dto.creadoPor || "system"
  };
}

async function toDto(app: any): Promise<Cita> {
  const fecha = toDateInput(app.date);
  const horaInicio = toTimeInput(app.date);
  const horaFin = toTimeInput(new Date(new Date(app.date).getTime() + app.durationMin * 60000));
  return {
    id: app.id,
    fecha,
    horaInicio,
    horaFin,
    pacienteId: app.patientId,
    medicoId: app.specialistId,
    sucursalId: app.branchId,
    salaId: app.roomId || undefined,
    tipoCitaId: app.typeId,
    estado: toDtoStatus(app.status),
    estadoPago: toDtoPayment(app.paymentStatus),
    empresaId: app.companyId || undefined,
    notas: app.notes || undefined,
    origen: app.origen,
    creadoPor: app.createdById,
    fechaCreacion: app.createdAt.toISOString(),
    ultimaActualizacion: app.updatedAt.toISOString(),
    pacienteRecurrente: app.pacienteRecurrente ?? true
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
