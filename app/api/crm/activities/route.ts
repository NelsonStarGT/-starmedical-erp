import { NextRequest, NextResponse } from "next/server";
import { CrmActivityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureCrmAccess } from "@/lib/api/crm";

export const dynamic = "force-dynamic";

const TYPES = Object.values(CrmActivityType);

function normalize(body: any, requireAll = true) {
  const dealId = body.dealId !== undefined ? String(body.dealId || "") : undefined;
  const accountId = body.accountId !== undefined ? String(body.accountId || "") : undefined;
  const contactId = body.contactId !== undefined ? String(body.contactId || "") : undefined;
  const type = body.type !== undefined ? String(body.type || "").toUpperCase() : undefined;
  const dateTime = body.dateTime !== undefined ? (body.dateTime ? new Date(body.dateTime) : null) : undefined;
  const summary = body.summary !== undefined ? String(body.summary || "").trim() : undefined;
  const nextStepDateTime = body.nextStepDateTime ? new Date(body.nextStepDateTime) : undefined;
  const notes = body.notes !== undefined ? String(body.notes || "").trim() : undefined;
  const createdById = body.createdById !== undefined ? String(body.createdById || "") : undefined;

  if (requireAll) {
    if (!type || !TYPES.includes(type as CrmActivityType)) throw new Error("type inválido");
    if (!dateTime) throw new Error("dateTime requerido");
  } else if (type && !TYPES.includes(type as CrmActivityType)) {
    throw new Error("type inválido");
  }

  return { dealId, accountId, contactId, type, dateTime, summary, nextStepDateTime, notes, createdById };
}

export async function GET(req: NextRequest) {
  const auth = ensureCrmAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const dealId = req.nextUrl.searchParams.get("dealId") || undefined;
    const accountId = req.nextUrl.searchParams.get("accountId") || undefined;
    const contactId = req.nextUrl.searchParams.get("contactId") || undefined;
    const where: any = {};
    if (dealId) where.dealId = dealId;
    if (accountId) where.accountId = accountId;
    if (contactId) where.contactId = contactId;
    const activities = await prisma.crmActivity.findMany({
      where: Object.keys(where).length ? where : undefined,
      include: { deal: true, account: true, contact: true },
      orderBy: [{ dateTime: "desc" }]
    });
    return NextResponse.json({ data: activities });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudieron obtener actividades" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = ensureCrmAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const { dealId, accountId, contactId, type, dateTime, summary, nextStepDateTime, notes, createdById } = normalize(body, true);
    const saved = await prisma.crmActivity.create({
      data: {
        dealId: dealId || null,
        accountId: accountId || null,
        contactId: contactId || null,
        type: type as CrmActivityType,
        dateTime: dateTime!,
        summary: summary || null,
        nextStepDateTime: nextStepDateTime || null,
        notes: notes || null,
        createdById: createdById || auth.role || "Ventas"
      }
    });
    return NextResponse.json({ data: saved });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo crear la actividad" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = ensureCrmAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const id = body.id ? String(body.id) : "";
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const { dealId, accountId, contactId, type, dateTime, summary, nextStepDateTime, notes, createdById } = normalize(body, false);

    const data: any = {};
    if (dealId !== undefined) data.dealId = dealId || null;
    if (accountId !== undefined) data.accountId = accountId || null;
    if (contactId !== undefined) data.contactId = contactId || null;
    if (type !== undefined) data.type = type as CrmActivityType;
    if (dateTime !== undefined) data.dateTime = dateTime;
    if (summary !== undefined) data.summary = summary;
    if (nextStepDateTime !== undefined) data.nextStepDateTime = nextStepDateTime;
    if (notes !== undefined) data.notes = notes;
    if (createdById !== undefined) data.createdById = createdById;
    if (!Object.keys(data).length) return NextResponse.json({ error: "Sin cambios" }, { status: 400 });

    const saved = await prisma.crmActivity.update({ where: { id }, data });
    return NextResponse.json({ data: saved });
  } catch (err: any) {
    console.error(err);
    if (err.code === "P2025") return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 });
    return NextResponse.json({ error: err?.message || "No se pudo actualizar la actividad" }, { status: 400 });
  }
}
