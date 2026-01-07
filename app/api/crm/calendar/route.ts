import { NextRequest, NextResponse } from "next/server";
import { CrmCalendarEventType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureCrmAccess } from "@/lib/api/crm";

export const dynamic = "force-dynamic";

const EVENT_TYPES = Object.values(CrmCalendarEventType);

function normalize(body: any, requireAll = true) {
  const type = body.type !== undefined ? String(body.type || "").toUpperCase() : undefined;
  const dealId = body.dealId !== undefined ? String(body.dealId || "") : undefined;
  const leadId = body.leadId !== undefined ? String(body.leadId || "") : undefined;
  const quoteId = body.quoteId !== undefined ? String(body.quoteId || "") : undefined;
  const startAt = body.startAt !== undefined ? (body.startAt ? new Date(body.startAt) : null) : undefined;
  const endAt = body.endAt !== undefined ? (body.endAt ? new Date(body.endAt) : null) : undefined;
  const title = body.title !== undefined ? String(body.title || "").trim() : undefined;
  const notes = body.notes !== undefined ? String(body.notes || "").trim() : undefined;
  const ownerId = body.ownerId !== undefined ? String(body.ownerId || "").trim() : undefined;
  const createdById = body.createdById !== undefined ? String(body.createdById || "") : undefined;

  if (requireAll && !type) throw new Error("type requerido");
  if (type && !EVENT_TYPES.includes(type as CrmCalendarEventType)) throw new Error("type inválido");
  if (requireAll && !startAt) throw new Error("startAt requerido");
  if (requireAll && !title) throw new Error("title requerido");

  return { type, dealId, leadId, quoteId, startAt, endAt, title, notes, ownerId, createdById };
}

export async function GET(req: NextRequest) {
  const auth = ensureCrmAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const leadId = req.nextUrl.searchParams.get("leadId") || undefined;
    const type = req.nextUrl.searchParams.get("type") || undefined;
    const where: Prisma.CrmCalendarEventWhereInput = {};
    if (leadId) where.leadId = leadId;
    if (type && EVENT_TYPES.includes(type as CrmCalendarEventType)) where.type = type as CrmCalendarEventType;

    const events = await prisma.crmCalendarEvent.findMany({
      where: Object.keys(where).length ? where : undefined,
      include: { lead: true, quote: true },
      orderBy: [{ startAt: "asc" }]
    });
    return NextResponse.json({ data: events });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudieron obtener eventos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = ensureCrmAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const { type, dealId, leadId, quoteId, startAt, endAt, title, notes, ownerId, createdById } = normalize(body, true);

    if (dealId) {
      const exists = await prisma.crmDeal.findUnique({ where: { id: dealId } });
      if (!exists) return NextResponse.json({ error: "Deal no encontrado" }, { status: 404 });
    }
    if (leadId) {
      const exists = await prisma.crmLead.findUnique({ where: { id: leadId } });
      if (!exists) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
    }
    if (quoteId) {
      const exists = await prisma.crmQuote.findUnique({ where: { id: quoteId } });
      if (!exists) return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
    }

    const saved = await prisma.crmCalendarEvent.create({
      data: {
        type: type as CrmCalendarEventType,
        dealId: dealId || null,
        leadId: leadId || null,
        quoteId: quoteId || null,
        startAt: startAt!,
        endAt: endAt || null,
        title: title!,
        notes: notes || null,
        ownerId: ownerId || auth.role || "Ventas",
        createdById: createdById || auth.role || "Ventas"
      }
    });
    return NextResponse.json({ data: saved });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo crear el evento" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = ensureCrmAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const id = body.id ? String(body.id) : "";
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const { type, dealId, leadId, quoteId, startAt, endAt, title, notes, ownerId, createdById } = normalize(body, false);
    const data: Prisma.CrmCalendarEventUpdateInput = {};
    if (type !== undefined) data.type = type as CrmCalendarEventType;
    if (dealId !== undefined) data.deal = dealId ? { connect: { id: dealId } } : { disconnect: true };
    if (leadId !== undefined) data.lead = leadId ? { connect: { id: leadId } } : { disconnect: true };
    if (quoteId !== undefined) data.quote = quoteId ? { connect: { id: quoteId } } : { disconnect: true };
    if (startAt !== undefined) data.startAt = startAt!;
    if (endAt !== undefined) data.endAt = endAt;
    if (title !== undefined) data.title = title!;
    if (notes !== undefined) data.notes = notes || null;
    if (ownerId !== undefined) data.ownerId = ownerId;
    if (createdById !== undefined) data.createdById = createdById;
    if (!Object.keys(data).length) return NextResponse.json({ error: "Sin cambios" }, { status: 400 });

    const saved = await prisma.crmCalendarEvent.update({ where: { id }, data });
    return NextResponse.json({ data: saved });
  } catch (err: any) {
    console.error(err);
    if (err.code === "P2025") return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    return NextResponse.json({ error: err?.message || "No se pudo actualizar el evento" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = ensureCrmAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const id = req.nextUrl.searchParams.get("id") || "";
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    await prisma.crmCalendarEvent.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    if (err.code === "P2025") return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    return NextResponse.json({ error: err?.message || "No se pudo eliminar el evento" }, { status: 400 });
  }
}
