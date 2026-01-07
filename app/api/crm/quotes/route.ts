import { NextRequest, NextResponse } from "next/server";
import { CrmQuoteStatus, CrmQuoteItemType, CrmRequestStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureCrmAccess, ensureCrmAdmin, isCrmAdmin } from "@/lib/api/crm";

export const dynamic = "force-dynamic";

const STATUSES = Object.values(CrmQuoteStatus);
const ALLOWED_STATUSES: CrmQuoteStatus[] = [
  CrmQuoteStatus.DRAFT,
  CrmQuoteStatus.SENT,
  CrmQuoteStatus.APPROVED,
  CrmQuoteStatus.REJECTED
];
const ITEM_TYPES = Object.values(CrmQuoteItemType);

type ItemInput = {
  itemType: CrmQuoteItemType;
  itemId?: string | null;
  manualDescription?: string | null;
  manualUnitPrice?: number | null;
  qty: number;
  unitPrice: number;
  costTotal?: number;
  discountPct?: number;
};

type QuoteTotals = { totalAmount: number; internalCost: number };

function normalizeItems(raw: any[]): ItemInput[] {
  if (!Array.isArray(raw) || !raw.length) throw new Error("items requeridos");
  return raw.map((i, idx) => {
    const itemType = String(i.itemType || "").toUpperCase();
    if (!ITEM_TYPES.includes(itemType as CrmQuoteItemType)) throw new Error(`itemType inválido en fila ${idx + 1}`);
    const isManual = itemType === CrmQuoteItemType.MANUAL;
    const itemId = String(i.itemId || "").trim();
    const manualDescription = isManual ? String(i.manualDescription || "").trim() : null;
    const manualUnitPrice = isManual ? Number(i.manualUnitPrice ?? i.unitPrice ?? 0) : null;
    if (!isManual && !itemId) throw new Error(`itemId requerido en fila ${idx + 1}`);
    if (isManual && !manualDescription) throw new Error(`manualDescription requerido en fila ${idx + 1}`);
    const qty = Number(i.qty || 0);
    if (!Number.isFinite(qty) || qty <= 0) throw new Error(`qty inválido en fila ${idx + 1}`);
    const unitPrice = isManual ? manualUnitPrice || 0 : Number(i.unitPrice || 0);
    if (!Number.isFinite(unitPrice)) throw new Error(`unitPrice inválido en fila ${idx + 1}`);
    const costTotal = i.costTotal !== undefined ? Number(i.costTotal || 0) : 0;
    const discountPct = i.discountPct !== undefined ? Number(i.discountPct || 0) : 0;
    return {
      itemType: itemType as CrmQuoteItemType,
      itemId: isManual ? null : itemId,
      manualDescription,
      manualUnitPrice,
      qty,
      unitPrice,
      costTotal,
      discountPct
    };
  });
}

function parseRequestIds(raw: any): string[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) throw new Error("requestIds debe ser arreglo");
  const ids = Array.from(new Set(raw.map((id) => String(id || "").trim()).filter(Boolean)));
  if (!ids.length) throw new Error("requestIds no puede estar vacio");
  return ids;
}

async function recalcDealAmount(tx: Prisma.TransactionClient, dealId: string) {
  const activeApproved = await tx.crmQuote.findFirst({
    where: { dealId, status: CrmQuoteStatus.APPROVED, isActive: true, approvedById: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { totalAmount: true }
  });
  const amount = activeApproved?.totalAmount ?? new Prisma.Decimal(0);
  await tx.crmDeal.update({ where: { id: dealId }, data: { amount, amountEstimated: amount } });
  return amount;
}

export async function GET(req: NextRequest) {
  const auth = ensureCrmAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      const quote = await prisma.crmQuote.findUnique({
        where: { id },
        include: { items: true, requests: { include: { request: true } }, deal: true, lead: true }
      });
      if (!quote) return NextResponse.json({ error: "Cotizacion no encontrada" }, { status: 404 });
      return NextResponse.json({
        data: {
          ...quote,
          totalAmount: Number(quote.totalAmount),
          internalCost: Number(quote.internalCost),
          internalMargin: Number(quote.internalMargin),
          items: quote.items.map((i) => ({
            ...i,
            unitPrice: Number(i.unitPrice),
            lineTotal: Number(i.lineTotal),
            costTotal: Number(i.costTotal),
            marginTotal: Number(i.marginTotal)
          }))
        }
      });
    }
    const status = req.nextUrl.searchParams.get("status");
    const ownerId = req.nextUrl.searchParams.get("ownerId") || undefined;
    const dealId = req.nextUrl.searchParams.get("dealId") || undefined;
    const where: Prisma.CrmQuoteWhereInput = {};
    if (status && STATUSES.includes(status as CrmQuoteStatus)) where.status = status as CrmQuoteStatus;
    if (dealId) where.dealId = dealId;
    if (ownerId) {
      where.OR = [{ deal: { ownerId } }, { lead: { ownerId } }];
    }
    const quotes = await prisma.crmQuote.findMany({
      where,
      include: { deal: true, lead: true, requests: { include: { request: true } } },
      orderBy: [{ createdAt: "desc" }],
      take: 200
    });
    return NextResponse.json({
      data: quotes.map((q) => ({
        ...q,
        totalAmount: Number(q.totalAmount),
        internalCost: Number(q.internalCost),
        internalMargin: Number(q.internalMargin),
        requests: q.requests?.map((qr) => ({
          requestId: qr.requestId,
          status: qr.request?.status,
          description: qr.request?.description,
          services: qr.request?.services
        }))
      }))
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudieron obtener cotizaciones" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = ensureCrmAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const dealIdInput = body.dealId ? String(body.dealId) : null;
    const leadId = body.leadId ? String(body.leadId) : null;
    const requestIds = parseRequestIds(body.requestIds);
    const sourceQuoteId = body.cloneFromId ? String(body.cloneFromId) : null;
    let targetDealId = dealIdInput;
    let sourceQuote: any = null;
    if (!targetDealId && !leadId && !sourceQuoteId)
      return NextResponse.json({ error: "leadId o dealId requerido" }, { status: 400 });
    const statusRaw = body.status ? String(body.status).toUpperCase() : "";
    const status = ALLOWED_STATUSES.includes(statusRaw as CrmQuoteStatus)
      ? (statusRaw as CrmQuoteStatus)
      : CrmQuoteStatus.DRAFT;
    const requestingApproval = status === CrmQuoteStatus.APPROVED;
    if (requestingApproval) {
      const admin = ensureCrmAdmin(req);
      if (admin.errorResponse) return NextResponse.json({ error: "Solo ADMIN puede aprobar cotizaciones" }, { status: 403 });
      if (!targetDealId) return NextResponse.json({ error: "Solo se puede aprobar una cotizacion ligada a un deal" }, { status: 400 });
    }

    if (sourceQuoteId) {
      sourceQuote = await prisma.crmQuote.findUnique({
        where: { id: sourceQuoteId },
        include: { items: true, requests: true }
      });
      if (!sourceQuote) return NextResponse.json({ error: "Cotizacion origen no encontrada" }, { status: 404 });
      if (targetDealId && sourceQuote.dealId && sourceQuote.dealId !== targetDealId) {
        return NextResponse.json({ error: "La cotizacion origen pertenece a otro deal" }, { status: 400 });
      }
      targetDealId = targetDealId || sourceQuote.dealId;
    }
    const validUntil = body.validUntil ? new Date(body.validUntil) : null;
    const notes = body.notes ? String(body.notes) : null;
    const rejectedReason = body.rejectedReason
      ? String(body.rejectedReason)
      : status === CrmQuoteStatus.REJECTED
        ? String(body.notes || "")
        : null;
    if (status === CrmQuoteStatus.REJECTED && !rejectedReason) {
      return NextResponse.json({ error: "Motivo obligatorio para rechazo" }, { status: 400 });
    }
    const createdById = body.createdById ? String(body.createdById) : auth.role || "Ventas";
    const items: ItemInput[] = sourceQuote
      ? sourceQuote.items.map((it: any) => ({
          itemType: it.itemType,
          itemId: it.itemId,
          manualDescription: it.manualDescription,
          manualUnitPrice: it.manualUnitPrice ? Number(it.manualUnitPrice) : null,
          qty: it.qty,
          unitPrice: Number(it.unitPrice),
          costTotal: Number(it.costTotal),
          discountPct: it.discountPct
        }))
      : normalizeItems(body.items || []);
    const requestIdsToLink =
      requestIds ?? (sourceQuote?.requests?.map((r: any) => r.requestId).filter(Boolean) as string[] | undefined);

    if (targetDealId) {
      const deal = await prisma.crmDeal.findUnique({ where: { id: targetDealId } });
      if (!deal) return NextResponse.json({ error: "Oportunidad no encontrada" }, { status: 404 });
    }
    if (requestIdsToLink && requestIdsToLink.length) {
      if (!targetDealId) return NextResponse.json({ error: "requestIds requiere un dealId" }, { status: 400 });
      const count = await prisma.crmRequest.count({
        where: { id: { in: requestIdsToLink }, dealId: targetDealId }
      });
      if (count !== requestIdsToLink.length) {
        return NextResponse.json({ error: "Las solicitudes no pertenecen al deal" }, { status: 400 });
      }
    }
    if (leadId) {
      const lead = await prisma.crmLead.findUnique({ where: { id: leadId } });
      if (!lead) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
    }

    const totals = items.reduce(
      (acc: QuoteTotals, item: ItemInput) => {
        const lineUnit = item.unitPrice * (1 - (item.discountPct || 0) / 100);
        const lineTotal = lineUnit * item.qty;
        acc.totalAmount += lineTotal;
        acc.internalCost += item.costTotal || 0;
        return acc;
      },
      { totalAmount: 0, internalCost: 0 } as QuoteTotals
    );
    const internalMargin = totals.totalAmount - totals.internalCost;

    const activate = requestingApproval && !!targetDealId;
    if (body.isActive && !activate) {
      return NextResponse.json({ error: "Solo una cotizacion aprobada puede quedar activa" }, { status: 400 });
    }
    const versionLabelInput = body.versionLabel ? String(body.versionLabel) : null;
    const now = new Date();

    const saved = await prisma.$transaction(async (tx) => {
      const nextNumber = (await tx.crmQuote.count()) + 1;
      const lastSequence = targetDealId
        ? await tx.crmQuote.aggregate({ _max: { sequence: true }, where: { dealId: targetDealId } })
        : { _max: { sequence: 0 } };
      const sequence = (lastSequence._max.sequence || 0) + 1;
      if (targetDealId && activate) {
        await tx.crmQuote.updateMany({ where: { dealId: targetDealId }, data: { isActive: false } });
      }

      const created = await tx.crmQuote.create({
        data: {
          dealId: targetDealId,
          leadId,
          quoteNumber: nextNumber,
          sequence,
          isActive: activate,
          versionLabel: versionLabelInput || `Cotización ${String(sequence).padStart(2, "0")}`,
          status,
          validUntil,
          totalAmount: new Prisma.Decimal(totals.totalAmount),
          internalCost: new Prisma.Decimal(totals.internalCost),
          internalMargin: new Prisma.Decimal(internalMargin),
          currency: body.currency || "GTQ",
          notes,
          rejectedReason: status === CrmQuoteStatus.REJECTED ? rejectedReason : null,
          approvedById: requestingApproval ? auth.role || createdById : null,
          approvedAt: requestingApproval ? now : null,
          createdById,
          items: {
            create: items.map((it: ItemInput) => {
              const lineUnit = it.unitPrice * (1 - (it.discountPct || 0) / 100);
              const lineTotal = lineUnit * it.qty;
              const marginTotal = lineTotal - (it.costTotal || 0);
              return {
                itemType: it.itemType,
                itemId: it.itemId,
                manualDescription: it.manualDescription,
                manualUnitPrice: it.manualUnitPrice ? new Prisma.Decimal(it.manualUnitPrice) : undefined,
                qty: it.qty,
                unitPrice: new Prisma.Decimal(it.unitPrice),
                discountPct: it.discountPct || 0,
                lineTotal: new Prisma.Decimal(lineTotal),
                costTotal: new Prisma.Decimal(it.costTotal || 0),
                marginTotal: new Prisma.Decimal(marginTotal)
              };
            })
          },
          requests: requestIdsToLink?.length
            ? { createMany: { data: requestIdsToLink.map((requestId) => ({ requestId })) } }
            : undefined
        },
        include: { items: true }
      });

      if (requestIdsToLink?.length) {
        await tx.crmRequest.updateMany({
          where: { id: { in: requestIdsToLink } },
          data: { status: CrmRequestStatus.COTIZADA }
        });
      }

      if (targetDealId) await recalcDealAmount(tx, targetDealId);

      return created;
    });

    return NextResponse.json({
      data: {
        ...saved,
        totalAmount: Number(saved.totalAmount),
        internalCost: Number(saved.internalCost),
        internalMargin: Number(saved.internalMargin),
        items: saved.items.map((i) => ({
          ...i,
          unitPrice: Number(i.unitPrice),
          lineTotal: Number(i.lineTotal),
          costTotal: Number(i.costTotal),
          marginTotal: Number(i.marginTotal)
        }))
      }
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo crear la cotización" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = ensureCrmAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const id = body.id ? String(body.id) : "";
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const current = await prisma.crmQuote.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
    const requestIds = parseRequestIds(body.requestIds);

    const statusRaw = body.status ? String(body.status).toUpperCase() : undefined;
    const nextStatus =
      statusRaw && ALLOWED_STATUSES.includes(statusRaw as CrmQuoteStatus) ? (statusRaw as CrmQuoteStatus) : undefined;
    if (statusRaw && !nextStatus) return NextResponse.json({ error: "status inválido" }, { status: 400 });
    const effectiveStatus = nextStatus ?? current.status;
    const canRefreshApprovalMeta =
      current.status === CrmQuoteStatus.APPROVED && nextStatus === CrmQuoteStatus.APPROVED && !current.approvedById;
    const requestingApproval =
      effectiveStatus === CrmQuoteStatus.APPROVED && (current.status !== CrmQuoteStatus.APPROVED || canRefreshApprovalMeta);
    if (requestingApproval) {
      const admin = ensureCrmAdmin(req);
      if (admin.errorResponse) return NextResponse.json({ error: "Solo ADMIN puede aprobar cotizaciones" }, { status: 403 });
      if (!current.dealId) return NextResponse.json({ error: "Solo se pueden aprobar cotizaciones asociadas a un deal" }, { status: 400 });
    }

    if (current.status === CrmQuoteStatus.APPROVED && body.isActive !== undefined && !isCrmAdmin(auth.role)) {
      return NextResponse.json(
        { error: "Solo ADMIN puede ajustar la activacion de una cotizacion aprobada" },
        { status: 403 }
      );
    }

    if (
      current.status === CrmQuoteStatus.APPROVED &&
      !canRefreshApprovalMeta &&
      (nextStatus || body.validUntil !== undefined || body.notes !== undefined || body.versionLabel !== undefined || body.leadId !== undefined)
    ) {
      return NextResponse.json({ error: "Una cotizacion aprobada no se puede modificar; clona una nueva version" }, { status: 400 });
    }
    if (
      canRefreshApprovalMeta &&
      (body.validUntil !== undefined || body.notes !== undefined || body.versionLabel !== undefined || body.leadId !== undefined)
    ) {
      return NextResponse.json({ error: "Una cotizacion aprobada no se puede modificar; clona una nueva version" }, { status: 400 });
    }

    const rejectedReason = body.rejectedReason
      ? String(body.rejectedReason)
      : nextStatus === CrmQuoteStatus.REJECTED
        ? String(body.notes || "")
        : undefined;
    if (nextStatus === CrmQuoteStatus.REJECTED && !rejectedReason && !current.rejectedReason) {
      return NextResponse.json({ error: "Motivo obligatorio para rechazo" }, { status: 400 });
    }
    if (requestIds && !current.dealId) {
      return NextResponse.json({ error: "requestIds requiere una cotizacion ligada a deal" }, { status: 400 });
    }
    if (requestIds && current.dealId) {
      const count = await prisma.crmRequest.count({ where: { id: { in: requestIds }, dealId: current.dealId } });
      if (count !== requestIds.length) return NextResponse.json({ error: "Las solicitudes no pertenecen al deal" }, { status: 400 });
    }

    const data: Prisma.CrmQuoteUpdateInput = {};
    if (nextStatus) data.status = nextStatus;
    if (body.validUntil !== undefined) data.validUntil = body.validUntil ? new Date(body.validUntil) : null;
    if (body.notes !== undefined) data.notes = body.notes || null;
    if (body.versionLabel !== undefined) data.versionLabel = body.versionLabel || null;
    if (body.leadId !== undefined) data.lead = body.leadId ? { connect: { id: String(body.leadId) } } : { disconnect: true };

    if (body.isActive !== undefined) {
      if (body.isActive && effectiveStatus !== CrmQuoteStatus.APPROVED) {
        return NextResponse.json({ error: "Solo una cotizacion aprobada puede quedar activa" }, { status: 400 });
      }
      data.isActive = Boolean(body.isActive);
    }

    if (nextStatus === CrmQuoteStatus.REJECTED) {
      data.isActive = false;
      data.rejectedReason = rejectedReason || current.rejectedReason || null;
    } else if (body.rejectedReason !== undefined) {
      data.rejectedReason = body.rejectedReason || null;
    }

    if (requestingApproval) {
      data.approvedById = auth.role || current.approvedById || null;
      data.approvedAt = new Date();
      data.isActive = true;
    }

    if (!Object.keys(data).length && !requestIds?.length) return NextResponse.json({ error: "Sin cambios" }, { status: 400 });
    const saved = await prisma.$transaction(async (tx) => {
      const updated = await tx.crmQuote.update({ where: { id }, data });

      if (requestIds?.length) {
        for (const requestId of requestIds) {
          await tx.crmQuoteRequest.upsert({
            where: { quoteId_requestId: { quoteId: id, requestId } },
            update: {},
            create: { quoteId: id, requestId }
          });
        }
        await tx.crmRequest.updateMany({
          where: { id: { in: requestIds } },
          data: { status: CrmRequestStatus.COTIZADA }
        });
      }

      if (updated.dealId) {
        if (updated.isActive) {
          await tx.crmQuote.updateMany({ where: { dealId: updated.dealId, id: { not: id } }, data: { isActive: false } });
        }
        await recalcDealAmount(tx, updated.dealId);
      }

      return updated;
    });
    return NextResponse.json({
      data: {
        ...saved,
        totalAmount: Number(saved.totalAmount),
        internalCost: Number(saved.internalCost),
        internalMargin: Number(saved.internalMargin),
        approvedAt: saved.approvedAt,
        approvedById: saved.approvedById,
        rejectedReason: saved.rejectedReason
      }
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo actualizar la cotización" }, { status: 400 });
  }
}
