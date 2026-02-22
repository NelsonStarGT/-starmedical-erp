import { NextRequest, NextResponse } from "next/server";
import { CrmTaskPriority, CrmTaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureCrmAccess } from "@/lib/api/crm";

export const dynamic = "force-dynamic";

const STATUS = Object.values(CrmTaskStatus);
const PRIORITY = Object.values(CrmTaskPriority);

function normalize(body: any, requireAll = true) {
  const ownerId = body.ownerId !== undefined ? String(body.ownerId || "") : undefined;
  const dealId = body.dealId !== undefined ? String(body.dealId || "") : undefined;
  const dueDate = body.dueDate !== undefined ? (body.dueDate ? new Date(body.dueDate) : null) : undefined;
  const title = body.title !== undefined ? String(body.title || "").trim() : undefined;
  const status = body.status !== undefined ? String(body.status || "").toUpperCase() : undefined;
  const priority = body.priority !== undefined ? String(body.priority || "").toUpperCase() : undefined;
  const notes = body.notes !== undefined ? String(body.notes || "").trim() : undefined;
  const createdById = body.createdById !== undefined ? String(body.createdById || "") : undefined;

  if (requireAll) {
    if (!title) throw new Error("title requerido");
    if (!dueDate) throw new Error("dueDate requerido");
  }
  if (status && !STATUS.includes(status as CrmTaskStatus)) throw new Error("status inválido");
  if (priority && !PRIORITY.includes(priority as CrmTaskPriority)) throw new Error("priority inválido");

  return { ownerId, dealId, dueDate, title, status, priority, notes, createdById };
}

export async function GET(req: NextRequest) {
  const auth = ensureCrmAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const ownerId = req.nextUrl.searchParams.get("ownerId") || undefined;
    const dealId = req.nextUrl.searchParams.get("dealId") || undefined;
    const where: any = {};
    if (ownerId) where.ownerId = ownerId;
    if (dealId) where.dealId = dealId;
    const tasks = await prisma.crmTask.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: [{ dueDate: "asc" }]
    });
    return NextResponse.json({ data: tasks });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudieron obtener tareas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = ensureCrmAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const { ownerId, dealId, dueDate, title, status, priority, notes, createdById } = normalize(body, true);
    const saved = await prisma.crmTask.create({
      data: {
        ownerId: ownerId || auth.role || "Ventas",
        dealId: dealId || null,
        dueDate: dueDate!,
        title: title!,
        status: (status as CrmTaskStatus) || CrmTaskStatus.OPEN,
        priority: (priority as CrmTaskPriority) || CrmTaskPriority.MEDIUM,
        notes: notes || null,
        createdById: createdById || auth.role || "Ventas"
      }
    });
    return NextResponse.json({ data: saved });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo crear la tarea" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = ensureCrmAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const id = body.id ? String(body.id) : "";
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const { ownerId, dealId, dueDate, title, status, priority, notes, createdById } = normalize(body, false);

    const data: any = {};
    if (ownerId !== undefined) data.ownerId = ownerId;
    if (dealId !== undefined) data.dealId = dealId || null;
    if (dueDate !== undefined) data.dueDate = dueDate;
    if (title !== undefined) data.title = title;
    if (status !== undefined) data.status = status as CrmTaskStatus;
    if (priority !== undefined) data.priority = priority as CrmTaskPriority;
    if (notes !== undefined) data.notes = notes;
    if (createdById !== undefined) data.createdById = createdById;
    if (!Object.keys(data).length) return NextResponse.json({ error: "Sin cambios" }, { status: 400 });

    const saved = await prisma.crmTask.update({ where: { id }, data });
    return NextResponse.json({ data: saved });
  } catch (err: any) {
    console.error(err);
    if (err.code === "P2025") return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
    return NextResponse.json({ error: err?.message || "No se pudo actualizar la tarea" }, { status: 400 });
  }
}
