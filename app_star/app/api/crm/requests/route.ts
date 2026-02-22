import { NextRequest, NextResponse } from "next/server";
import { CrmRequestStatus, CrmServiceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureCrmAccess } from "@/lib/api/crm";

export const dynamic = "force-dynamic";

const STATUSES = Object.values(CrmRequestStatus);
const SERVICE_TYPES = Object.values(CrmServiceType);

function parseServices(raw: any): CrmServiceType[] {
  if (!Array.isArray(raw) || !raw.length) throw new Error("services requeridos");
  const mapped = raw.map((s) => String(s || "").toUpperCase());
  mapped.forEach((s) => {
    if (!SERVICE_TYPES.includes(s as CrmServiceType)) throw new Error(`serviceType invalido: ${s}`);
  });
  return mapped as CrmServiceType[];
}

export async function GET(req: NextRequest) {
  const auth = ensureCrmAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const dealId = req.nextUrl.searchParams.get("dealId") || undefined;
    const status = req.nextUrl.searchParams.get("status") || undefined;
    const where: any = {};
    if (dealId) where.dealId = dealId;
    if (status && STATUSES.includes(status as CrmRequestStatus)) where.status = status as CrmRequestStatus;
    const requests = await prisma.crmRequest.findMany({
      where,
      include: { quotes: { select: { quoteId: true } } },
      orderBy: [{ requestedAt: "desc" }]
    });
    return NextResponse.json({ data: requests });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudieron obtener solicitudes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = ensureCrmAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const dealId = body.dealId ? String(body.dealId) : "";
    if (!dealId) return NextResponse.json({ error: "dealId requerido" }, { status: 400 });
    const description = body.description ? String(body.description).trim() : "";
    if (!description) return NextResponse.json({ error: "description requerida" }, { status: 400 });
    const services = parseServices(body.services || []);
    const requestedAt = body.requestedAt ? new Date(body.requestedAt) : new Date();

    const saved = await prisma.crmRequest.create({
      data: {
        dealId,
        services,
        description,
        requestedAt,
        status: CrmRequestStatus.PENDIENTE,
        createdById: auth.role || "Ventas"
      }
    });
    return NextResponse.json({ data: saved });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo crear la solicitud" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = ensureCrmAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const id = body.id ? String(body.id) : "";
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const statusRaw = body.status ? String(body.status).toUpperCase() : undefined;
    const status = statusRaw && STATUSES.includes(statusRaw as CrmRequestStatus) ? (statusRaw as CrmRequestStatus) : undefined;
    const quoteId = body.quoteId ? String(body.quoteId) : undefined;
    const data: any = {};
    if (status) data.status = status;
    if (!status && !quoteId) return NextResponse.json({ error: "Sin cambios" }, { status: 400 });

    const saved = await prisma.$transaction(async (tx) => {
      const request = await tx.crmRequest.update({ where: { id }, data });
      if (quoteId) {
        const quote = await tx.crmQuote.findUnique({ where: { id: quoteId } });
        if (!quote) throw new Error("Cotizacion no encontrada");
        if (quote.dealId !== request.dealId) throw new Error("La cotizacion debe pertenecer al mismo deal");
        await tx.crmQuoteRequest.upsert({
          where: { quoteId_requestId: { quoteId, requestId: id } },
          update: {},
          create: { quoteId, requestId: id }
        });
        await tx.crmRequest.update({ where: { id }, data: { status: CrmRequestStatus.COTIZADA } });
      }
      return request;
    });

    return NextResponse.json({ data: saved });
  } catch (err: any) {
    console.error(err);
    if (err.code === "P2025") return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    return NextResponse.json({ error: err?.message || "No se pudo actualizar la solicitud" }, { status: 400 });
  }
}
