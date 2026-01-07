import { NextRequest, NextResponse } from "next/server";
import {
  CrmDealStage,
  CrmPipelineType,
  CrmSlaStatus,
  CrmServiceType,
  Prisma,
  CrmPreferredChannel,
  QuoteStatus,
  QuoteType
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureCrmAccess, isCrmAdmin } from "@/lib/api/crm";
import { CRM_COMMUNICATION_VALUES, computeSlaStatus } from "@/lib/crmConfig";
import { auditLog, auditPermissionDenied } from "@/lib/audit";
import { PERMISSIONS, dealScopeWhere, enforceDealOwnership, isAdmin as isAdminRole } from "@/lib/rbac";
import { evaluateTransition } from "@/lib/rules/engine";

export const dynamic = "force-dynamic";

const PIPELINES = Object.values(CrmPipelineType);
const STAGES = Object.values(CrmDealStage);
const SERVICE_TYPES = Object.values(CrmServiceType);
const DAY_MS = 1000 * 60 * 60 * 24;
const B2C_DISALLOWED_STAGES = new Set<CrmDealStage>([CrmDealStage.DIAGNOSTICO, CrmDealStage.NEGOCIACION]);
const NEXT_ACTION_EXEMPT_STAGES = new Set<CrmDealStage>([
  CrmDealStage.GANADO,
  CrmDealStage.PERDIDO,
  CrmDealStage.NUEVO
]);

function computeSlaStatusFromStage(stage: CrmDealStage, stageEnteredAt: Date): CrmSlaStatus {
  const status = computeSlaStatus(stage, stageEnteredAt);
  return status as CrmSlaStatus;
}

function parseServiceTypes(raw: any): CrmServiceType[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw) || !raw.length) throw new Error("serviceTypes requeridos");
  const mapped = raw.map((s) => String(s || "").toUpperCase());
  mapped.forEach((s) => {
    if (!SERVICE_TYPES.includes(s as CrmServiceType)) throw new Error(`serviceType inválido: ${s}`);
  });
  return mapped as CrmServiceType[];
}

function normalize(body: any, requireAll = true) {
  const pipelineType = body.pipelineType !== undefined ? String(body.pipelineType || "").toUpperCase() : undefined;
  const stage = body.stage !== undefined ? String(body.stage || "").toUpperCase() : undefined;
  const probabilityPct = body.probabilityPct !== undefined ? Number(body.probabilityPct || 0) : undefined;
  const expectedCloseDate =
    body.expectedCloseDate !== undefined ? (body.expectedCloseDate ? new Date(body.expectedCloseDate) : null) : undefined;
  const ownerId = body.ownerId !== undefined ? String(body.ownerId || "") : undefined;
  const capturedById = body.capturedById !== undefined ? String(body.capturedById || "") : undefined;
  const accountId = body.accountId !== undefined ? String(body.accountId || "") : undefined;
  const contactId = body.contactId !== undefined ? String(body.contactId || "") : undefined;
  const status = body.status !== undefined ? String(body.status || "") : undefined;
  const source = body.source !== undefined ? String(body.source || "") : undefined;
  const lostReason = body.lostReason !== undefined ? String(body.lostReason || "") : undefined;
  const notes = body.notes !== undefined ? String(body.notes || "") : undefined;
  const createdById = body.createdById !== undefined ? String(body.createdById || "") : undefined;
  const nextAction = body.nextAction !== undefined ? String(body.nextAction || "") : undefined;
  const nextActionAt = body.nextActionAt !== undefined ? (body.nextActionAt ? new Date(body.nextActionAt) : null) : undefined;
  const competitor = body.competitor !== undefined ? String(body.competitor || "") : undefined;
  const pipelineId = body.pipelineId !== undefined ? String(body.pipelineId || "") : undefined;
  const stageComment = body.stageComment !== undefined ? String(body.stageComment || "") : undefined;
  const serviceTypes = parseServiceTypes(body.serviceTypes);
  const preferredChannel = body.preferredChannel !== undefined ? String(body.preferredChannel || "").toUpperCase() : undefined;
  const preferredAt = body.preferredAt !== undefined ? (body.preferredAt ? new Date(body.preferredAt) : null) : undefined;
  const servicesOtherNote = body.servicesOtherNote !== undefined ? String(body.servicesOtherNote || "") : undefined;

  if (requireAll) {
    if (!pipelineType || !PIPELINES.includes(pipelineType as CrmPipelineType)) throw new Error("pipelineType inválido");
    if (!stage || !STAGES.includes(stage as CrmDealStage)) throw new Error("stage inválido");
    if (!ownerId) throw new Error("ownerId requerido");
    if (!serviceTypes || !serviceTypes.length) throw new Error("serviceTypes requeridos");
  } else if (pipelineType && !PIPELINES.includes(pipelineType as CrmPipelineType)) {
    throw new Error("pipelineType inválido");
  } else if (stage && !STAGES.includes(stage as CrmDealStage)) {
    throw new Error("stage inválido");
  }

  if (preferredChannel && !CRM_COMMUNICATION_VALUES.includes(preferredChannel as any)) throw new Error("preferredChannel inválido");
  if (preferredAt && Number.isNaN(preferredAt.getTime())) throw new Error("preferredAt inválido");

  return {
    pipelineType,
    stage,
    probabilityPct,
    expectedCloseDate,
    ownerId,
    capturedById,
    accountId,
    contactId,
    status,
    source,
    lostReason,
    notes,
    createdById,
    nextAction,
    nextActionAt,
    competitor,
    pipelineId,
    stageComment,
    serviceTypes,
    preferredChannel,
    preferredAt,
    servicesOtherNote
  };
}

export async function GET(req: NextRequest) {
  const auth = ensureCrmAccess(req, PERMISSIONS.DEAL_READ);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const pipelineTypeRaw = req.nextUrl.searchParams.get("pipelineType") || undefined;
    const pipelineType = pipelineTypeRaw ? pipelineTypeRaw.toUpperCase() : undefined;
    const stage = req.nextUrl.searchParams.get("stage") || undefined;
    const status = req.nextUrl.searchParams.get("status") || undefined;
    const where: Prisma.CrmDealWhereInput = {};
    if (pipelineType && PIPELINES.includes(pipelineType as CrmPipelineType)) {
      where.pipelineType = pipelineType as CrmPipelineType;
    }
    if (stage && STAGES.includes(stage as CrmDealStage)) where.stage = stage as CrmDealStage;
    if (status) where.status = status;
    const scope = dealScopeWhere(auth.user!);
    if (Object.keys(scope).length) {
      (where.AND = where.AND || []).push(scope);
    }
    const deals = await prisma.crmDeal.findMany({
      where,
      include: {
        account: true,
        contact: true,
        activities: { orderBy: { dateTime: "desc" }, take: 1 },
        services: true,
        quotesV2: { select: { id: true, status: true, isActive: true, approvedAt: true, createdAt: true }, orderBy: { createdAt: "desc" } },
        _count: { select: { quotesV2: true } }
      },
      orderBy: [{ createdAt: "desc" }]
    });
    const now = Date.now();
    return NextResponse.json({
      data: deals.map((d) => {
        const missingAction = !d.nextAction || !d.nextActionAt;
        const slaFromStage = computeSlaStatusFromStage(d.stage, d.stageEnteredAt);
        const slaStatus = missingAction ? CrmSlaStatus.RED : slaFromStage;
        const v2Quotes = d.quotesV2 || [];
        const quoteCount = d._count?.quotesV2 ?? v2Quotes.length ?? 0;
        const approvedActive = v2Quotes.find((q) => q.status === QuoteStatus.APPROVED && q.isActive);
        const approvalPending = v2Quotes.find((q) => q.status === QuoteStatus.APPROVAL_PENDING);
        const sent = v2Quotes.find((q) => q.status === QuoteStatus.SENT);
        const draft = v2Quotes.find((q) => q.status === QuoteStatus.DRAFT);
        const rejected = v2Quotes.find((q) => q.status === QuoteStatus.REJECTED);

        let quoteStatus: string = "SIN_COTIZAR";
        let latestQuoteId: string | null = null;
        if (approvedActive) {
          quoteStatus = QuoteStatus.APPROVED;
          latestQuoteId = approvedActive.id;
        } else if (approvalPending) {
          quoteStatus = QuoteStatus.APPROVAL_PENDING;
          latestQuoteId = approvalPending.id;
        } else if (sent) {
          quoteStatus = QuoteStatus.SENT;
          latestQuoteId = sent.id;
        } else if (draft) {
          quoteStatus = QuoteStatus.DRAFT;
          latestQuoteId = draft.id;
        } else if (rejected) {
          quoteStatus = QuoteStatus.REJECTED;
          latestQuoteId = rejected.id;
        } else if (v2Quotes[0]) {
          quoteStatus = v2Quotes[0].status;
          latestQuoteId = v2Quotes[0].id;
        } else if (quoteCount > 0) {
          quoteStatus = "SIN_COTIZAR";
        }
        return {
          ...d,
          amount: Number(d.amount),
          amountEstimated: Number(d.amountEstimated),
          quoteCount,
          quoteStatus,
          latestQuoteId,
          missingAction,
          slaStatus,
          daysInStage: Math.floor((now - d.stageEnteredAt.getTime()) / DAY_MS),
          daysSinceActivity: d.activities?.[0]?.dateTime ? Math.floor((now - new Date(d.activities[0].dateTime).getTime()) / DAY_MS) : null
        };
      })
    });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "No se pudieron obtener oportunidades";
    return NextResponse.json(
      { error: "No se pudieron obtener oportunidades", detail: message.slice(0, 200) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = ensureCrmAccess(req, PERMISSIONS.DEAL_WRITE);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const {
      pipelineType,
      stage,
      probabilityPct,
      expectedCloseDate,
      ownerId,
      capturedById,
      accountId,
      contactId,
      status,
      source,
      lostReason,
      notes,
      createdById,
      nextAction,
      nextActionAt,
      competitor,
      pipelineId,
      stageComment,
      serviceTypes,
      preferredChannel,
      preferredAt,
      servicesOtherNote
    } = normalize(body, true);
    const now = new Date();
    const pipelineStage =
      pipelineId && stage
        ? await prisma.crmPipelineStage.findFirst({ where: { pipelineId, stage: stage as CrmDealStage } })
        : null;
    const probability = probabilityPct ?? pipelineStage?.probabilityPct ?? 0;
    const slaStatus = computeSlaStatusFromStage(stage as CrmDealStage, now);

    if (!nextAction) return NextResponse.json({ error: "nextAction requerido" }, { status: 400 });
    if (!nextActionAt) return NextResponse.json({ error: "nextActionAt requerido" }, { status: 400 });
    if (serviceTypes && serviceTypes.includes("OTROS" as any) && !servicesOtherNote)
      return NextResponse.json({ error: "servicesOtherNote requerido para OTROS" }, { status: 400 });
    if (preferredChannel && ["CALL", "VISIT", "VIDEO"].includes(preferredChannel) && !preferredAt)
      return NextResponse.json({ error: "preferredAt requerido para este canal" }, { status: 400 });

    const ownerFinal = ownerId || auth.user?.id || "Ventas";
    const capturedByFinal = auth.user?.id || capturedById || "Ventas";
    const createdByFinal = auth.user?.id || createdById || "Ventas";

    const saved = await prisma.crmDeal.create({
      data: {
        pipelineType: pipelineType as CrmPipelineType,
        pipelineId: pipelineId || null,
        stage: stage as CrmDealStage,
        stageEnteredAt: now,
        slaStatus,
        amountEstimated: new Prisma.Decimal(0),
        amount: new Prisma.Decimal(0),
        probabilityPct: probability,
        expectedCloseDate: expectedCloseDate || null,
        ownerId: ownerFinal,
        ownerUserId: auth.user?.id || null,
        branchId: auth.user?.branchId || null,
        capturedById: capturedByFinal,
        capturedAt: now,
        accountId: accountId || null,
        contactId: contactId || null,
        status: status || "OPEN",
        source: source || null,
        lostReason: lostReason || null,
        notes: notes || null,
        competitor: competitor || null,
        nextAction: nextAction || null,
        nextActionAt: nextActionAt || null,
        preferredChannel: preferredChannel as CrmPreferredChannel | undefined,
        preferredAt: preferredAt || null,
        servicesOtherNote: servicesOtherNote || null,
        createdById: createdByFinal,
        services: serviceTypes?.length
          ? { createMany: { data: serviceTypes.map((serviceType) => ({ serviceType })) } }
          : undefined,
        stageHistory: {
          create: {
            fromStage: null,
            toStage: stage as CrmDealStage,
            changedAt: now,
            changedById: createdByFinal,
            comment: stageComment || "Creación de oportunidad"
          }
        }
      },
      include: { account: true, contact: true, services: true }
    });
    await auditLog({
      action: "DEAL_CREATED",
      entityType: "DEAL",
      entityId: saved.id,
      after: { stage: saved.stage, amount: Number(saved.amount), ownerUserId: saved.ownerUserId, ownerId: saved.ownerId },
      user: auth.user,
      req
    });
    return NextResponse.json({
      data: { ...saved, amount: Number(saved.amount), amountEstimated: Number(saved.amountEstimated) }
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo crear la oportunidad" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = ensureCrmAccess(req, PERMISSIONS.DEAL_WRITE);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const id = body.id ? String(body.id) : "";
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const {
      pipelineType,
      stage,
      probabilityPct,
      expectedCloseDate,
      ownerId,
      capturedById,
      accountId,
      contactId,
      status,
      source,
      lostReason,
      notes,
      createdById,
      nextAction,
      nextActionAt,
      competitor,
      pipelineId,
      stageComment,
      serviceTypes,
      preferredChannel,
      preferredAt,
      servicesOtherNote
    } = normalize(body, false);

    const current = await prisma.crmDeal.findUnique({ where: { id }, include: { services: true } });
    if (!current) return NextResponse.json({ error: "Oportunidad no encontrada" }, { status: 404 });
    if (!isAdminRole(auth.user) && !enforceDealOwnership(auth.user!, current)) {
      auditPermissionDenied(auth.user, req, "DEAL", id);
      return NextResponse.json({ error: "Solo puedes editar tus oportunidades" }, { status: 403 });
    }
    if (capturedById !== undefined && capturedById !== current.capturedById) {
      if (!isCrmAdmin(auth.role)) {
        return NextResponse.json({ error: "Solo ADMIN puede modificar 'quien lo atenderá' / capturedById" }, { status: 403 });
      }
    }
    const targetStage = stage ?? current.stage;
    const targetStageValue = targetStage as CrmDealStage;
    const isStageChange = stage !== undefined && stage !== current.stage;
    const targetPipelineId = pipelineId !== undefined ? (pipelineId || null) : current.pipelineId;
    const targetPipelineType = pipelineType !== undefined ? (pipelineType as CrmPipelineType) : current.pipelineType;
    const targetPreferredChannel = preferredChannel ?? (current.preferredChannel as any) ?? null;
    const targetPreferredAt = preferredAt !== undefined ? preferredAt : current.preferredAt;
    const currentServices = current.services?.map((s) => s.serviceType as CrmServiceType) || [];
    const nextServices = serviceTypes ?? currentServices;
    const requiresOtrosNote = nextServices.includes("OTROS" as CrmServiceType);
    const finalOtrosNote = servicesOtherNote !== undefined ? servicesOtherNote : current.servicesOtherNote;

    const pipelineStage = targetPipelineId
      ? await prisma.crmPipelineStage.findFirst({ where: { pipelineId: targetPipelineId, stage: targetStage as CrmDealStage } })
      : null;

    if (isStageChange) {
      if (targetStageValue === CrmDealStage.GANADO && current.pipelineType === CrmPipelineType.B2B) {
        const hasQuote = await prisma.quote.count({
          where: {
            dealId: id,
            type: QuoteType.B2B,
            status: { in: [QuoteStatus.SENT, QuoteStatus.APPROVED] }
          }
        });
        if (!hasQuote) {
          return NextResponse.json(
            { error: "Requiere al menos una cotización B2B enviada o aprobada para marcar como GANADO" },
            { status: 400 }
          );
        }
      }
      const evalResult = await evaluateTransition({
        dealId: id,
        fromStageKey: current.stage,
        toStageKey: targetStageValue,
        actorUserId: auth.user?.id || null,
        user: auth.user || undefined
      });
      if (!evalResult.allowed) {
        return NextResponse.json({ error: "Transición no permitida", errors: evalResult.errors }, { status: 400 });
      }
    }

    if (requiresOtrosNote && !String(finalOtrosNote || "").trim()) {
      return NextResponse.json({ error: "servicesOtherNote requerido para OTROS" }, { status: 400 });
    }

    if (targetPreferredChannel && ["CALL", "VISIT", "VIDEO"].includes(targetPreferredChannel) && !targetPreferredAt) {
      return NextResponse.json({ error: "preferredAt requerido para este canal" }, { status: 400 });
    }

    const data: Prisma.CrmDealUpdateInput = {};
    if (pipelineType !== undefined) data.pipelineType = pipelineType as CrmPipelineType;
    if (pipelineId !== undefined) data.pipeline = pipelineId ? { connect: { id: pipelineId } } : { disconnect: true };
    if (probabilityPct !== undefined) data.probabilityPct = probabilityPct;
    if (expectedCloseDate !== undefined) data.expectedCloseDate = expectedCloseDate;
    if (ownerId !== undefined) {
      data.ownerId = ownerId;
      if (ownerId) {
        const ownerUser = await prisma.user.findUnique({ where: { id: ownerId } });
        data.ownerUser = ownerUser ? { connect: { id: ownerId } } : { disconnect: true };
      } else {
        data.ownerUser = { disconnect: true };
      }
    }
    if (accountId !== undefined) data.account = accountId ? { connect: { id: accountId } } : { disconnect: true };
    if (contactId !== undefined) data.contact = contactId ? { connect: { id: contactId } } : { disconnect: true };
    if (status !== undefined) data.status = status;
    if (source !== undefined) data.source = source;
    if (lostReason !== undefined) data.lostReason = lostReason;
    if (notes !== undefined) data.notes = notes;
    if (createdById !== undefined) data.createdById = createdById;
    if (nextAction !== undefined) data.nextAction = nextAction;
    if (nextActionAt !== undefined) data.nextActionAt = nextActionAt;
    if (competitor !== undefined) data.competitor = competitor;
    if (preferredChannel !== undefined) data.preferredChannel = preferredChannel as CrmPreferredChannel;
    if (preferredAt !== undefined) data.preferredAt = preferredAt;
    if (servicesOtherNote !== undefined) data.servicesOtherNote = servicesOtherNote;

    const now = new Date();
    const historyComment = stageComment || (isStageChange ? "Actualización de etapa" : undefined);
    const slaStatus = isStageChange ? computeSlaStatusFromStage(targetStageValue, now) : undefined;
    if (isStageChange) {
      data.stage = targetStageValue;
      data.stageEnteredAt = now;
      data.slaStatus = slaStatus;
      if (pipelineStage?.probabilityPct !== undefined && probabilityPct === undefined) {
        data.probabilityPct = pipelineStage.probabilityPct;
      }
      if (targetStageValue === CrmDealStage.GANADO) data.status = "WON";
      else if (targetStageValue === CrmDealStage.PERDIDO) data.status = "LOST";
      else data.status = "OPEN";
    }

    if (!Object.keys(data).length && !serviceTypes && !isStageChange)
      return NextResponse.json({ error: "Sin cambios" }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      if (serviceTypes) {
        await tx.crmDealServiceInterest.deleteMany({ where: { dealId: id } });
        await tx.crmDealServiceInterest.createMany({
          data: serviceTypes.map((serviceType) => ({ dealId: id, serviceType }))
        });
      }

      const saved = await tx.crmDeal.update({
        where: { id },
        data,
        include: { account: true, contact: true }
      });

      if (isStageChange) {
        await tx.crmDealStageHistory.create({
            data: {
              dealId: id,
              fromStage: current.stage,
              toStage: targetStageValue,
              changedAt: now,
              changedById: createdById || auth.role || "Ventas",
              comment: historyComment || null
            }
        });
      }

      return saved;
    });

    const after = {
      stage: result.stage,
      amount: Number(result.amount),
      ownerUserId: result.ownerUserId,
      ownerId: result.ownerId,
      status: result.status
    };
    const before = {
      stage: current.stage,
      amount: Number(current.amount),
      ownerUserId: current.ownerUserId,
      ownerId: current.ownerId,
      status: current.status
    };
    const actions = [];
    if (isStageChange) {
      actions.push("DEAL_STAGE_CHANGED");
      if (result.stage === CrmDealStage.GANADO) actions.push("DEAL_WON");
      if (result.stage === CrmDealStage.PERDIDO) actions.push("DEAL_LOST");
    }
    if (current.ownerUserId !== result.ownerUserId || current.ownerId !== result.ownerId) {
      actions.push("DEAL_ASSIGNED");
    }
    if (Number(current.amount) !== Number(result.amount)) {
      actions.push("DEAL_AMOUNT_CHANGED");
    }
    if (!actions.length) actions.push("DEAL_UPDATED");
    await Promise.all(
      actions.map((action) =>
        auditLog({
          action,
          entityType: "DEAL",
          entityId: id,
          before,
          after,
          user: auth.user,
          req
        })
      )
    );

    return NextResponse.json({
      data: { ...result, amount: Number(result.amount), amountEstimated: Number(result.amountEstimated) }
    });
  } catch (err: any) {
    console.error(err);
    if (err.code === "P2025") return NextResponse.json({ error: "Oportunidad no encontrada" }, { status: 404 });
    return NextResponse.json({ error: err?.message || "No se pudo actualizar la oportunidad" }, { status: 400 });
  }
}
