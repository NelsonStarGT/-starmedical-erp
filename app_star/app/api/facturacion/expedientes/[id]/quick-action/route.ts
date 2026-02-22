import { NextRequest, NextResponse } from "next/server";
import {
  CreditTerm,
  DocStatus,
  FinancialAccountType,
  FinancialTransactionType,
  PartyType,
  PaymentMethod,
  PaymentType,
  Prisma
} from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { auditLog, auditPermissionDenied } from "@/lib/audit";
import { canAccessBillingActions, canRunBillingSupervisorActions } from "@/lib/billing/access";
import { getBillingQuickActionsAvailability } from "@/lib/billing/operational";
import { selectBillingProfileByPriority } from "@/lib/billing/profileSelection";
import { applyBillingQuickAction, getBillingCaseById, type BillingQuickActionType } from "@/lib/billing/service";
import { getEffectiveScope } from "@/lib/branch/effectiveScope";
import { isCentralConfigCompatError, warnDevCentralCompat } from "@/lib/config-central";
import { prisma } from "@/lib/prisma";
import { getSystemFeatureConfig, isFlagEnabledFromSnapshot } from "@/lib/system-flags/service";

type Params = {
  params: Promise<{ id: string }>;
};

const payloadSchema = z.object({
  action: z.enum(["COBRAR", "ABONO", "CREDITO", "EMITIR_DOC"]),
  amount: z.number().nonnegative().optional(),
  paymentMethod: z.enum(["EFECTIVO", "TARJETA", "TRANSFERENCIA"]).optional(),
  reference: z.string().trim().max(120).optional(),
  creditDueDate: z.string().optional(),
  confirm: z.boolean().optional()
});

function toFinancePaymentMethod(method?: "EFECTIVO" | "TARJETA" | "TRANSFERENCIA") {
  if (method === "TARJETA") return PaymentMethod.POS;
  if (method === "TRANSFERENCIA") return PaymentMethod.TRANSFER;
  return PaymentMethod.CASH;
}

function toPartyType(type: "PACIENTE" | "EMPRESA" | "ASEGURADORA") {
  if (type === "ASEGURADORA") return PartyType.INSURER;
  if (type === "EMPRESA") return PartyType.CLIENT;
  return PartyType.CLIENT;
}

function resolveCreditTermFromDueDate(dueDate?: string | null) {
  if (!dueDate) return CreditTerm.OTHER;
  const diffMs = Date.parse(dueDate) - Date.now();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 15) return CreditTerm.DAYS_15;
  if (diffDays <= 30) return CreditTerm.DAYS_30;
  if (diffDays <= 45) return CreditTerm.DAYS_45;
  if (diffDays <= 60) return CreditTerm.DAYS_60;
  if (diffDays <= 90) return CreditTerm.DAYS_90;
  return CreditTerm.OTHER;
}

function decimalToNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  return Number(value);
}

function normalizeIdentifier(value: string | null | undefined) {
  const normalized = String(value || "").trim();
  return normalized.length > 0 ? normalized : null;
}

type BillingCaseBranch = {
  id: string;
  name: string;
  code: string | null;
};

async function resolveBillingCaseBranch(params: {
  siteId: string;
  siteName: string;
}): Promise<BillingCaseBranch | null> {
  const normalizedSiteId = normalizeIdentifier(params.siteId);
  const normalizedSiteName = normalizeIdentifier(params.siteName);
  if (!normalizedSiteId && !normalizedSiteName) return null;

  return prisma.branch.findFirst({
    where: {
      OR: [
        normalizedSiteId ? { id: normalizedSiteId } : undefined,
        normalizedSiteId ? { code: normalizedSiteId } : undefined,
        normalizedSiteName ? { name: normalizedSiteName } : undefined
      ].filter(Boolean) as Prisma.BranchWhereInput[]
    },
    select: {
      id: true,
      name: true,
      code: true
    }
  });
}

function caseBelongsToScope(params: {
  scopeBranchId: string | null;
  scopeBranchCode: string | null;
  scopeBranchName: string | null;
  caseSiteId: string;
  caseSiteName: string;
}) {
  if (!params.scopeBranchId) return true;
  const targets = new Set(
    [params.scopeBranchId, params.scopeBranchCode, params.scopeBranchName]
      .map((value) => normalizeIdentifier(value))
      .filter((value): value is string => Boolean(value))
  );
  const caseValues = [params.caseSiteId, params.caseSiteName]
    .map((value) => normalizeIdentifier(value))
    .filter((value): value is string => Boolean(value));
  return caseValues.some((value) => targets.has(value));
}

type BillingProfileSelection = {
  profile: {
    id: string;
    legalEntityId: string;
    establishmentId: string | null;
    priority: number;
  } | null;
  series: {
    id: string;
    serie: string;
    initialNumber: number;
    currentNumber: number;
  } | null;
};

async function selectActiveBillingProfileForBranch(branchId: string): Promise<BillingProfileSelection> {
  const prismaClient = prisma as unknown as {
    branchBillingProfile?: {
      findMany: (args: unknown) => Promise<Array<{
        id: string;
        legalEntityId: string;
        establishmentId: string | null;
        priority: number;
        isActive: boolean;
        legalEntity: { id: string; isActive: boolean };
        establishment: { id: string; isActive: boolean } | null;
      }>>;
    };
    branchFelSeries?: {
      findFirst: (args: unknown) => Promise<{
        id: string;
        serie: string;
        initialNumber: number;
        currentNumber: number;
      } | null>;
    };
  };

  if (!prismaClient.branchBillingProfile?.findMany || !prismaClient.branchFelSeries?.findFirst) {
    return { profile: null, series: null };
  }

  const rows = await prismaClient.branchBillingProfile.findMany({
    where: {
      branchId,
      isActive: true,
      legalEntity: { isActive: true },
      establishment: { isActive: true }
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      legalEntityId: true,
      establishmentId: true,
      priority: true,
      isActive: true,
      legalEntity: { select: { id: true, isActive: true } },
      establishment: { select: { id: true, isActive: true } }
    }
  });

  const selectedProfileRow = selectBillingProfileByPriority(rows);
  const profile = selectedProfileRow
    ? {
        id: selectedProfileRow.id,
        legalEntityId: selectedProfileRow.legalEntityId,
        establishmentId: selectedProfileRow.establishmentId,
        priority: selectedProfileRow.priority
      }
    : null;

  if (!profile) {
    return { profile: null, series: null };
  }

  if (!profile.establishmentId) {
    return { profile, series: null };
  }

  const series = await prismaClient.branchFelSeries.findFirst({
    where: {
      establishmentId: profile.establishmentId,
      isActive: true,
      documentType: "FACTURA"
    },
    orderBy: [{ updatedAt: "asc" }],
    select: {
      id: true,
      serie: true,
      initialNumber: true,
      currentNumber: true
    }
  });

  return {
    profile,
    series
  };
}

async function resolveLegalEntityId(
  user: NonNullable<ReturnType<typeof requireAuth>["user"]>,
  preferredLegalEntityId?: string | null
) {
  const preferredId = normalizeIdentifier(preferredLegalEntityId);
  if (preferredId) {
    const preferred = await prisma.legalEntity.findUnique({
      where: { id: preferredId },
      select: { id: true, isActive: true }
    });
    if (preferred?.isActive) return preferred.id;
  }

  if (user.legalEntityId) {
    const existing = await prisma.legalEntity.findUnique({ where: { id: user.legalEntityId } });
    if (existing) return existing.id;
  }

  const firstActive = await prisma.legalEntity.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
  if (firstActive) return firstActive.id;

  const created = await prisma.legalEntity.create({
    data: {
      name: "StarMedical Operación",
      comercialName: "StarMedical",
      email: user.email || null,
      isActive: true
    }
  });
  return created.id;
}

async function resolvePartyId(params: {
  legalEntityId: string;
  name: string;
  type: "PACIENTE" | "EMPRESA" | "ASEGURADORA";
}) {
  const partyType = toPartyType(params.type);
  const existing = await prisma.party.findFirst({
    where: {
      type: partyType,
      name: params.name
    },
    orderBy: { createdAt: "asc" }
  });

  if (existing) return existing.id;

  const created = await prisma.party.create({
    data: {
      type: partyType,
      name: params.name,
      isActive: true
    }
  });
  return created.id;
}

async function resolveFinancialAccountId(params: {
  legalEntityId: string;
  paymentMethod?: "EFECTIVO" | "TARJETA" | "TRANSFERENCIA";
}) {
  const preferredType = params.paymentMethod === "TARJETA"
    ? FinancialAccountType.POS
    : params.paymentMethod === "TRANSFERENCIA"
      ? FinancialAccountType.BANK
      : FinancialAccountType.CASH;

  const preferred = await prisma.financialAccount.findFirst({
    where: {
      legalEntityId: params.legalEntityId,
      isActive: true,
      type: preferredType
    },
    orderBy: { createdAt: "asc" }
  });
  if (preferred) return preferred.id;

  const fallback = await prisma.financialAccount.findFirst({
    where: {
      legalEntityId: params.legalEntityId,
      isActive: true
    },
    orderBy: { createdAt: "asc" }
  });
  if (fallback) return fallback.id;

  const created = await prisma.financialAccount.create({
    data: {
      legalEntityId: params.legalEntityId,
      name: preferredType === FinancialAccountType.BANK ? "Banco principal" : "Caja principal",
      type: preferredType,
      currency: "GTQ",
      isActive: true
    }
  });
  return created.id;
}

async function assertActiveSatSeriesForCase(params: {
  siteId: string;
  siteName: string;
  shouldEnforce: boolean;
}) {
  if (!params.shouldEnforce) return;

  try {
    const activeSeriesCount = await prisma.branchFelSeries.count({
      where: {
        isActive: true,
        documentType: "FACTURA",
        establishment: {
          isActive: true,
          branch: {
            OR: [{ id: params.siteId }, { code: params.siteId }, { name: params.siteName }]
          }
        }
      }
    });

    if (activeSeriesCount <= 0) {
      throw new Error("No hay serie FEL activa para esta sucursal. Configura SAT antes de emitir documentos.");
    }
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("facturacion.quickAction.satSeries", error);
      throw new Error("Configuración SAT no disponible. Ejecuta migraciones y prisma generate.");
    }
    throw error;
  }
}

async function resolveOrCreateReceivable(params: {
  legalEntityId: string;
  partyId: string;
  reference: string;
  totalAmount: number;
  paidAmount: number;
  dueDate?: string;
  creditTerm?: CreditTerm;
}) {
  const existing = await prisma.receivable.findFirst({
    where: {
      legalEntityId: params.legalEntityId,
      partyId: params.partyId,
      reference: params.reference
    },
    orderBy: { createdAt: "desc" }
  });

  if (existing) {
    const nextAmount = Math.max(decimalToNumber(existing.amount), params.totalAmount);
    const nextPaid = Math.max(decimalToNumber(existing.paidAmount), Math.min(params.paidAmount, nextAmount));
    const nextStatus = nextPaid >= nextAmount ? DocStatus.PAID : nextPaid > 0 ? DocStatus.PARTIAL : DocStatus.OPEN;

    return prisma.receivable.update({
      where: { id: existing.id },
      data: {
        amount: new Prisma.Decimal(nextAmount),
        paidAmount: new Prisma.Decimal(nextPaid),
        status: nextStatus,
        dueDate: params.dueDate ? new Date(params.dueDate) : existing.dueDate,
        creditTerm: params.creditTerm ?? existing.creditTerm
      }
    });
  }

  const status = params.paidAmount >= params.totalAmount
    ? DocStatus.PAID
    : params.paidAmount > 0
      ? DocStatus.PARTIAL
      : DocStatus.OPEN;

  return prisma.receivable.create({
    data: {
      legalEntityId: params.legalEntityId,
      partyId: params.partyId,
      date: new Date(),
      dueDate: params.dueDate ? new Date(params.dueDate) : null,
      amount: new Prisma.Decimal(Math.max(0, params.totalAmount)),
      paidAmount: new Prisma.Decimal(Math.max(0, Math.min(params.paidAmount, params.totalAmount))),
      reference: params.reference,
      creditTerm: params.creditTerm ?? CreditTerm.CASH,
      status
    }
  });
}

async function persistFinancialAction(params: {
  action: BillingQuickActionType;
  amount?: number;
  paymentMethod?: "EFECTIVO" | "TARJETA" | "TRANSFERENCIA";
  reference?: string;
  creditDueDate?: string;
  caseId: string;
  caseNumber: string;
  totalAmount: number;
  paidAmount: number;
  responsibleName: string;
  responsibleType: "PACIENTE" | "EMPRESA" | "ASEGURADORA";
  actorUserId: string;
  actorName: string;
  legalEntityId: string;
}) {
  const partyId = await resolvePartyId({
    legalEntityId: params.legalEntityId,
    name: params.responsibleName,
    type: params.responsibleType
  });

  const receivable = await resolveOrCreateReceivable({
    legalEntityId: params.legalEntityId,
    partyId,
    reference: params.caseNumber,
    totalAmount: params.totalAmount,
    paidAmount: params.paidAmount,
    dueDate: params.creditDueDate,
    creditTerm: params.action === "CREDITO" ? resolveCreditTermFromDueDate(params.creditDueDate) : undefined
  });

  if (params.action === "COBRAR" || params.action === "ABONO") {
    const amount = Number(params.amount || 0);
    const accountId = await resolveFinancialAccountId({
      legalEntityId: params.legalEntityId,
      paymentMethod: params.paymentMethod
    });
    const paymentMethod = toFinancePaymentMethod(params.paymentMethod);

    const newPaid = decimalToNumber(receivable.paidAmount) + amount;
    const nextStatus = newPaid >= decimalToNumber(receivable.amount) ? DocStatus.PAID : DocStatus.PARTIAL;

    const [updatedReceivable, payment] = await prisma.$transaction([
      prisma.receivable.update({
        where: { id: receivable.id },
        data: {
          paidAmount: new Prisma.Decimal(newPaid),
          status: nextStatus
        }
      }),
      prisma.payment.create({
        data: {
          legalEntityId: params.legalEntityId,
          type: PaymentType.AR,
          receivableId: receivable.id,
          financialAccountId: accountId,
          method: paymentMethod,
          date: new Date(),
          amount: new Prisma.Decimal(amount),
          reference: params.reference || `BILL-${params.caseNumber}`,
          createdById: params.actorUserId
        }
      }),
      prisma.financialTransaction.create({
        data: {
          financialAccountId: accountId,
          type: FinancialTransactionType.IN,
          amount: new Prisma.Decimal(amount),
          date: new Date(),
          description: `Facturación ${params.caseNumber} · ${params.action}`,
          reference: params.reference || null,
          createdById: params.actorUserId
        }
      })
    ]);

    return {
      receivableId: updatedReceivable.id,
      paymentId: payment.id,
      receivableStatus: updatedReceivable.status
    };
  }

  if (params.action === "CREDITO") {
    const updated = await prisma.receivable.update({
      where: { id: receivable.id },
      data: {
        dueDate: params.creditDueDate ? new Date(params.creditDueDate) : receivable.dueDate,
        creditTerm: resolveCreditTermFromDueDate(params.creditDueDate),
        status: decimalToNumber(receivable.paidAmount) > 0 ? DocStatus.PARTIAL : DocStatus.OPEN
      }
    });

    return {
      receivableId: updated.id,
      receivableStatus: updated.status
    };
  }

  return {
    receivableId: receivable.id,
    receivableStatus: receivable.status
  };
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: Params) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  const user = auth.user!;

  if (!canAccessBillingActions(user)) {
    await auditPermissionDenied(user, req, "BILLING_CASE", "access");
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  const caseRecord = getBillingCaseById(id);
  if (!caseRecord) return NextResponse.json({ error: "Expediente no encontrado" }, { status: 404 });

  const scope = await getEffectiveScope({
    user,
    cookieStore: req.cookies
  });
  if (!scope.branchId || !scope.activeBranch) {
    return NextResponse.json({ error: "No hay sede activa autorizada para facturación." }, { status: 403 });
  }

  if (
    !caseBelongsToScope({
      scopeBranchId: scope.activeBranch.id,
      scopeBranchCode: scope.activeBranch.code ?? null,
      scopeBranchName: scope.activeBranch.name,
      caseSiteId: caseRecord.siteId,
      caseSiteName: caseRecord.siteName
    })
  ) {
    return NextResponse.json({ error: "No autorizado para operar expedientes de otra sucursal." }, { status: 403 });
  }

  const caseBranch = await resolveBillingCaseBranch({
    siteId: caseRecord.siteId,
    siteName: caseRecord.siteName
  });
  const selectedBilling = caseBranch
    ? await selectActiveBillingProfileForBranch(caseBranch.id).catch((error) => {
        if (isCentralConfigCompatError(error)) {
          warnDevCentralCompat("facturacion.quickAction.billingProfile", error);
          return { profile: null, series: null };
        }
        throw error;
      })
    : { profile: null, series: null };

  const payload = await req.json().catch(() => ({}));
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message || "Payload inválido" }, { status: 400 });
  }

  const data = parsed.data;
  const action = data.action as BillingQuickActionType;

  if (!data.confirm) {
    return NextResponse.json({ error: "Confirma la operación antes de continuar" }, { status: 400 });
  }

  if ((action === "COBRAR" || action === "ABONO") && (!data.amount || data.amount <= 0)) {
    return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
  }

  if (action === "CREDITO" && !data.creditDueDate) {
    return NextResponse.json({ error: "Fecha de vencimiento requerida para crédito" }, { status: 400 });
  }

  const actionAvailability = getBillingQuickActionsAvailability(caseRecord);
  if (action === "COBRAR" && !actionAvailability.canCollect) {
    return NextResponse.json({ error: "El expediente no permite cobro directo" }, { status: 409 });
  }
  if (action === "ABONO" && !actionAvailability.canPartial) {
    return NextResponse.json({ error: "El expediente no permite abonos" }, { status: 409 });
  }
  if (action === "CREDITO" && !actionAvailability.canCredit) {
    return NextResponse.json({ error: "El expediente no puede enviarse a crédito" }, { status: 409 });
  }
  if (action === "EMITIR_DOC" && !actionAvailability.canEmitDocument) {
    return NextResponse.json({ error: "No se puede emitir documento en este estado" }, { status: 409 });
  }

  const systemConfig = await getSystemFeatureConfig();
  const shouldRequireActiveSatSeries =
    systemConfig.strictMode || isFlagEnabledFromSnapshot(systemConfig, "sat.requireActiveSeries");

  if (action === "EMITIR_DOC") {
    if (caseBranch && shouldRequireActiveSatSeries && !selectedBilling.profile) {
      return NextResponse.json(
        { error: "No hay perfil fiscal activo para esta sucursal. Configura SAT/FEL antes de emitir." },
        { status: 422 }
      );
    }
    if (caseBranch && shouldRequireActiveSatSeries && !selectedBilling.series) {
      return NextResponse.json(
        { error: "No hay serie FEL activa para el perfil fiscal seleccionado." },
        { status: 422 }
      );
    }

    try {
      if (!selectedBilling.series) {
        await assertActiveSatSeriesForCase({
          siteId: caseRecord.siteId,
          siteName: caseRecord.siteName,
          shouldEnforce: shouldRequireActiveSatSeries
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo validar serie SAT.";
      const status = message.toLowerCase().includes("no disponible") ? 503 : 409;
      return NextResponse.json({ error: message }, { status });
    }
  }

  const supervisorRequired = actionAvailability.requiresSupervisor && action === "EMITIR_DOC";
  if (supervisorRequired && !canRunBillingSupervisorActions(user)) {
    await auditPermissionDenied(user, req, "BILLING_CASE", id);
    return NextResponse.json({ error: "Se requiere rol supervisor para esta acción" }, { status: 403 });
  }

  try {
    const legalEntityId = await resolveLegalEntityId(user, selectedBilling.profile?.legalEntityId ?? null);

    const beforeSnapshot = {
      status: caseRecord.status,
      balanceAmount: caseRecord.balanceAmount,
      paidAmount: caseRecord.paidAmount,
      documents: caseRecord.documents.length,
      payments: caseRecord.payments.length
    };

    const updated = applyBillingQuickAction({
      caseId: id,
      action,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      reference: data.reference,
      creditDueDate: data.creditDueDate,
      actorName: user.name || user.email || "Operador"
    });

    const persistence = await persistFinancialAction({
      action,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      reference: data.reference,
      creditDueDate: data.creditDueDate,
      caseId: id,
      caseNumber: caseRecord.caseNumber,
      totalAmount: updated.after.totalAmount,
      paidAmount: updated.after.paidAmount,
      responsibleName: caseRecord.responsibleEntity.name,
      responsibleType: caseRecord.responsibleEntity.type,
      actorUserId: user.id,
      actorName: user.name || user.email || "Operador",
      legalEntityId
    });

    if (selectedBilling.profile) {
      await auditLog({
        action: "BILLING_PROFILE_SELECTED",
        entityType: "BILLING_CASE",
        entityId: id,
        user,
        req,
        metadata: {
          caseNumber: caseRecord.caseNumber,
          profileId: selectedBilling.profile.id,
          branchId: caseBranch?.id ?? null,
          legalEntityId: selectedBilling.profile.legalEntityId,
          establishmentId: selectedBilling.profile.establishmentId,
          priority: selectedBilling.profile.priority
        }
      });
    }

    if (action === "EMITIR_DOC" && selectedBilling.series) {
      await auditLog({
        action: "FEL_SERIES_USED",
        entityType: "BILLING_CASE",
        entityId: id,
        user,
        req,
        metadata: {
          caseNumber: caseRecord.caseNumber,
          seriesId: selectedBilling.series.id,
          serie: selectedBilling.series.serie,
          initialNumber: selectedBilling.series.initialNumber,
          currentNumber: selectedBilling.series.currentNumber
        }
      });
    }

    await auditLog({
      action: `BILLING_CASE_${action}`,
      entityType: "BILLING_CASE",
      entityId: id,
      user,
      req,
      before: beforeSnapshot,
      after: {
        status: updated.after.status,
        balanceAmount: updated.after.balanceAmount,
        paidAmount: updated.after.paidAmount,
        documents: updated.after.documents.length,
        payments: updated.after.payments.length
      },
      metadata: {
        caseNumber: caseRecord.caseNumber,
        paymentMethod: data.paymentMethod || null,
        reference: data.reference || null,
        amount: data.amount || null,
        tenantId: scope.tenantId,
        branchId: scope.branchId,
        billingProfileId: selectedBilling.profile?.id ?? null,
        felSeriesId: selectedBilling.series?.id ?? null,
        persistence
      }
    });

    return NextResponse.json({
      data: {
        caseId: updated.after.id,
        caseNumber: updated.after.caseNumber,
        status: updated.after.status,
        totalAmount: updated.after.totalAmount,
        paidAmount: updated.after.paidAmount,
        balanceAmount: updated.after.balanceAmount,
        persistence
      }
    });
  } catch (err: any) {
    console.error("billing quick-action error", err);
    return NextResponse.json({ error: err?.message || "No se pudo aplicar la acción" }, { status: 400 });
  }
}
