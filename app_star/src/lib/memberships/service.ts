import { addDays, addMonths, addQuarters, addYears, differenceInCalendarDays } from "date-fns";
import { z } from "zod";
import {
  MembershipBillingFrequency,
  MembershipOwnerType,
  MembershipPaymentKind,
  MembershipPaymentMethod,
  MembershipPaymentStatus,
  MembershipStatus,
  Prisma
} from "@prisma/client";

const money = (value?: Prisma.Decimal | number | null) => {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : Number(value);
};

export const contractCreateSchema = z.object({
  ownerType: z.nativeEnum(MembershipOwnerType),
  ownerId: z.string().trim(),
  planId: z.string().trim(),
  billingFrequency: z.nativeEnum(MembershipBillingFrequency).default(MembershipBillingFrequency.MONTHLY),
  startAt: z.coerce.date(),
  channel: z.string().trim().optional(),
  assignedBranchId: z.string().trim().optional(),
  allowDependents: z.boolean().optional(),
  priceLockedMonthly: z.number().positive().optional(),
  priceLockedAnnual: z.number().positive().optional()
});

export const paymentSchema = z.object({
  amount: z.number().positive(),
  method: z.nativeEnum(MembershipPaymentMethod),
  kind: z.nativeEnum(MembershipPaymentKind).default(MembershipPaymentKind.RENEWAL),
  refNo: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  paidAt: z.coerce.date().optional()
});

export type MembershipConfigRecord = Prisma.MembershipConfigGetPayload<{}>;

function nextRenewal(from: Date, frequency: MembershipBillingFrequency) {
  if (frequency === MembershipBillingFrequency.MONTHLY) return addMonths(from, 1);
  if (frequency === MembershipBillingFrequency.ANNUAL) return addYears(from, 1);
  if (frequency === MembershipBillingFrequency.QUARTERLY) return addQuarters(from, 1);
  return addMonths(from, 6);
}

export async function getMembershipConfig(prisma: any): Promise<MembershipConfigRecord> {
  const existing = await prisma.membershipConfig.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return prisma.membershipConfig.create({
    data: {
      id: 1,
      reminderDays: 30,
      graceDays: 7,
      inactiveAfterDays: 90,
      autoRenewWithPayment: true,
      prorateOnMidmonth: true,
      blockIfBalanceDue: true,
      requireInitialPayment: true,
      cashTransferMinMonths: 2,
      priceChangeNoticeDays: 30,
      updatedAt: new Date()
    }
  });
}

type ContractForStatus = {
  id: string;
  status: MembershipStatus;
  nextRenewAt: Date | null;
  startAt: Date;
  endAt: Date | null;
  balance: Prisma.Decimal | number;
};

export function deriveContractStatus(contract: ContractForStatus, config: MembershipConfigRecord) {
  const graceDays = config?.graceDays ?? 0;
  const blockIfBalanceDue = config?.blockIfBalanceDue ?? true;
  const now = new Date();
  const nextRenew = contract.nextRenewAt ? new Date(contract.nextRenewAt) : null;
  const balance = money(contract.balance);
  const hasBalance = balance > 0.009;
  const daysPastDue = nextRenew ? differenceInCalendarDays(now, nextRenew) : 0;

  if (contract.status === MembershipStatus.CANCELADO) {
    return { status: MembershipStatus.CANCELADO, blocked: true, blockedReason: "Contrato cancelado", daysPastDue: 0 };
  }

  if (contract.status === MembershipStatus.SUSPENDIDO) {
    return { status: MembershipStatus.SUSPENDIDO, blocked: true, blockedReason: "Suspensión manual", daysPastDue };
  }

  if (nextRenew && now > addDays(nextRenew, graceDays)) {
    return { status: MembershipStatus.VENCIDO, blocked: blockIfBalanceDue, blockedReason: "Vencido por renovación", daysPastDue };
  }

  if (hasBalance) {
    return {
      status: MembershipStatus.PENDIENTE,
      blocked: blockIfBalanceDue,
      blockedReason: blockIfBalanceDue ? "Saldo pendiente" : null,
      daysPastDue
    };
  }

  return { status: MembershipStatus.ACTIVO, blocked: false, blockedReason: null, daysPastDue: Math.max(0, daysPastDue) };
}

function mrrForContract(contract: any, plan: any) {
  const freq = contract.billingFrequency as MembershipBillingFrequency;
  const priceM = money(contract.priceLockedMonthly ?? plan?.priceMonthly);
  const priceA = money(contract.priceLockedAnnual ?? plan?.priceAnnual);
  if (freq === MembershipBillingFrequency.ANNUAL) return priceA / 12;
  if (freq === MembershipBillingFrequency.QUARTERLY) return (priceA || priceM * 3) / 3;
  if (freq === MembershipBillingFrequency.SEMIANNUAL) return (priceA || priceM * 6) / 6;
  return priceM;
}

export function serializeContract(contract: any, config: MembershipConfigRecord) {
  const status = deriveContractStatus(contract, config);
  const plan = contract.MembershipPlan || contract.plan;
  const owner = contract.ClientProfile || contract.owner;
  const ownerName =
    owner?.companyName ||
    [owner?.firstName, owner?.lastName].filter(Boolean).join(" ").trim() ||
    "Sin nombre";
  const ownerEmail = owner?.email || null;
  const ownerPhone = owner?.phone || null;
  const ownerNit = owner?.nit || null;

  return {
    id: contract.id,
    code: contract.code,
    ownerType: contract.ownerType,
    ownerId: contract.ownerId,
    ownerName,
    ownerEmail,
    ownerPhone,
    ownerNit,
    planId: contract.planId,
    planName: plan?.name || "",
    planType: plan?.type,
    assignedBranchId: contract.assignedBranchId,
    branchName: contract.Branch?.name || null,
    status: status.status,
    blocked: status.blocked,
    blockedReason: status.blockedReason,
    nextRenewAt: contract.nextRenewAt,
    startAt: contract.startAt,
    balance: money(contract.balance),
    billingFrequency: contract.billingFrequency,
    allowDependents: contract.allowDependents,
    dependents: contract.MembershipDependent?.length || 0,
    mrr: mrrForContract(contract, plan)
  };
}

export async function listContracts(prisma: any, filters: { status?: string; ownerType?: string; planId?: string; q?: string }) {
  const config = await getMembershipConfig(prisma);
  const where: any = {};

  if (filters.status) where.status = filters.status as MembershipStatus;
  if (filters.ownerType) where.ownerType = filters.ownerType as MembershipOwnerType;
  if (filters.planId) where.planId = filters.planId;
  if (filters.q) {
    where.OR = [
      { ClientProfile: { email: { contains: filters.q, mode: "insensitive" } } },
      { ClientProfile: { phone: { contains: filters.q, mode: "insensitive" } } },
      { ClientProfile: { nit: { contains: filters.q, mode: "insensitive" } } },
      { ClientProfile: { dpi: { contains: filters.q, mode: "insensitive" } } },
      { ClientProfile: { firstName: { contains: filters.q, mode: "insensitive" } } },
      { ClientProfile: { lastName: { contains: filters.q, mode: "insensitive" } } },
      { ClientProfile: { companyName: { contains: filters.q, mode: "insensitive" } } },
      { code: { contains: filters.q, mode: "insensitive" } }
    ];
  }

  const contracts = await prisma.membershipContract.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    include: {
      MembershipPlan: true,
      MembershipDependent: true,
      Branch: true,
      ClientProfile: true
    }
  });

  const serialized: any[] = contracts.map((c: any) => serializeContract(c, config));

  const updates: Promise<any>[] = [];
  contracts.forEach((c: any, idx: number) => {
    const derived = serialized[idx].status;
    if (c.status !== derived) {
      updates.push(
        prisma.membershipContract.update({
          where: { id: c.id },
          data: { status: derived as MembershipStatus }
        })
      );
    }
  });
  if (updates.length) {
    await Promise.allSettled(updates);
  }

  return { items: serialized, config };
}

export async function buildDashboard(prisma: any) {
  const config = await getMembershipConfig(prisma);
  const [plans, contracts, companies] = await Promise.all([
    prisma.membershipPlan.findMany({}),
    prisma.membershipContract.findMany({
      orderBy: [{ nextRenewAt: "asc" }],
      include: {
        MembershipPlan: true,
        MembershipDependent: true,
        Branch: true,
        ClientProfile: true
      }
    }),
    prisma.clientProfile.findMany({ where: { type: "COMPANY" }, select: { id: true, companyName: true } })
  ]);

  const serialized: any[] = contracts.map((c: any) => serializeContract(c, config));
  const planById = plans.reduce((acc: any, p: any) => {
    acc[p.id] = p;
    return acc;
  }, {});

  let mrr = 0;
  let balanceDue = 0;
  let empresasActivas = 0;
  let personasActivas = 0;
  const planSummary: Record<
    string,
    { id: string; name: string; actives: number; mrr: number; renewals30: number; type: string }
  > = {};

  serialized.forEach((c: any) => {
    mrr += mrrForContract(c, planById[c.planId]);
    if (c.balance > 0) balanceDue += c.balance;
    if (c.ownerType === "COMPANY" && c.status === "ACTIVO") empresasActivas += 1;
    if (c.ownerType === "PERSON" && c.status === "ACTIVO") personasActivas += 1;

    const plan = planById[c.planId];
    if (plan) {
      const key = plan.id;
      if (!planSummary[key]) {
        planSummary[key] = {
          id: plan.id,
          name: plan.name,
          type: plan.type,
          actives: 0,
          mrr: 0,
          renewals30: 0
        };
      }
      if (c.status === "ACTIVO") {
        planSummary[key].actives += 1;
        planSummary[key].mrr += mrrForContract(c, plan);
      }
      if (c.nextRenewAt) {
        const diff = differenceInCalendarDays(new Date(c.nextRenewAt), new Date());
        if (diff >= 0 && diff <= 30) {
          planSummary[key].renewals30 += 1;
        }
      }
    }
  });

  const now = new Date();
  const renewCount = (days: number) =>
    serialized.filter((c: any) => {
      if (!c.nextRenewAt || c.status === "CANCELADO") return false;
      const diff = differenceInCalendarDays(new Date(c.nextRenewAt), now);
      return diff >= 0 && diff <= days;
    }).length;

  const alerts = {
    vencidos: serialized.filter((c: any) => c.status === "VENCIDO").length,
    suspendidos: serialized.filter((c: any) => c.status === "SUSPENDIDO").length,
    pendientesPago: serialized.filter((c: any) => c.status === "PENDIENTE").length,
    proximos: renewCount(15)
  };

  const sorted = [...serialized].sort((a: any, b: any) => {
    if (!a.nextRenewAt) return 1;
    if (!b.nextRenewAt) return -1;
    return new Date(a.nextRenewAt).getTime() - new Date(b.nextRenewAt).getTime();
  });

  const renewals = sorted
    .filter((c) => c.nextRenewAt)
    .slice(0, 20)
    .map((c) => ({
      id: c.id,
      code: c.code,
      ownerName: c.ownerName,
      planName: c.planName,
      status: c.status,
      nextRenewAt: c.nextRenewAt,
      branchName: c.branchName,
      balance: c.balance
    }));

  return {
    summary: {
      planesActivos: plans.filter((p: any) => p.active).length,
      contratosActivos: serialized.filter((c: any) => c.status === "ACTIVO").length,
      empresasActivas,
      personasActivas,
      renovaciones7: renewCount(7),
      renovaciones15: renewCount(15),
      renovaciones30: renewCount(30),
      ingresoMensual: Math.round(mrr),
      saldoPendiente: Math.round(balanceDue)
    },
    alerts,
    renewals,
    contracts: sorted.slice(0, 25),
    plans: plans.map((p: any) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      active: p.active,
      priceMonthly: money(p.priceMonthly),
      priceAnnual: money(p.priceAnnual),
      maxDependents: p.maxDependents
    })),
    planSummary: Object.values(planSummary).sort((a, b) => b.actives - a.actives),
    config
  };
}

export async function createContract(prisma: any, rawInput: unknown) {
  const parsed = contractCreateSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw { status: 400, body: { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors } };
  }
  const data = parsed.data;
  const [plan, client, config] = await Promise.all([
    prisma.membershipPlan.findUnique({ where: { id: data.planId } }),
    prisma.clientProfile.findUnique({ where: { id: data.ownerId } }),
    getMembershipConfig(prisma)
  ]);

  if (!plan) throw { status: 404, body: { error: "Plan no encontrado" } };
  if (!client) throw { status: 404, body: { error: "Cliente no encontrado" } };
  if (client.type !== data.ownerType) {
    throw { status: 400, body: { error: "El tipo de cliente no coincide con el contrato" } };
  }

  const priceMonthly = data.priceLockedMonthly ?? money(plan.priceMonthly);
  const priceAnnual = data.priceLockedAnnual ?? money(plan.priceAnnual);
  const initialBalance = config.requireInitialPayment ? priceMonthly : 0;
  const nextRenewAt = nextRenewal(data.startAt, data.billingFrequency);

  const created = await prisma.membershipContract.create({
    data: {
      ownerType: data.ownerType,
      ownerId: data.ownerId,
      planId: data.planId,
      status: initialBalance > 0 ? MembershipStatus.PENDIENTE : MembershipStatus.ACTIVO,
      startAt: data.startAt,
      nextRenewAt,
      billingFrequency: data.billingFrequency,
      priceLockedMonthly: new Prisma.Decimal(priceMonthly),
      priceLockedAnnual: new Prisma.Decimal(priceAnnual),
      balance: new Prisma.Decimal(initialBalance),
      channel: data.channel || null,
      assignedBranchId: data.assignedBranchId || null,
      allowDependents: data.allowDependents ?? plan.type !== "INDIVIDUAL"
    },
    include: {
      MembershipPlan: true,
      MembershipDependent: true,
      Branch: true,
      ClientProfile: true
    }
  });

  return serializeContract(created, config);
}

export async function registerPayment(prisma: any, contractId: string, rawInput: unknown) {
  const parsed = paymentSchema.safeParse(rawInput);
  if (!parsed.success) throw { status: 400, body: { error: "Pago inválido", details: parsed.error.flatten().fieldErrors } };
  const data = parsed.data;

  return prisma.$transaction(async (tx: any) => {
    const contract = await tx.membershipContract.findUnique({
      where: { id: contractId },
      include: { MembershipPlan: true, MembershipDependent: true, Branch: true, ClientProfile: true }
    });
    if (!contract) throw { status: 404, body: { error: "Contrato no encontrado" } };

    const config = await getMembershipConfig(tx);
    const newBalance = Math.max(0, money(contract.balance) - data.amount);
    let nextRenewAt = contract.nextRenewAt;

    if (data.kind === MembershipPaymentKind.RENEWAL && contract.nextRenewAt) {
      const now = new Date();
      const renewDate = new Date(contract.nextRenewAt);
      if (renewDate <= now && newBalance <= 0) {
        nextRenewAt = nextRenewal(renewDate, contract.billingFrequency);
      }
    }

    const payment = await tx.membershipPayment.create({
      data: {
        contractId,
        amount: new Prisma.Decimal(data.amount),
        method: data.method,
        kind: data.kind,
        status: MembershipPaymentStatus.PAID,
        paidAt: data.paidAt || new Date(),
        refNo: data.refNo || null,
        notes: data.notes || null
      }
    });

    const updated = await tx.membershipContract.update({
      where: { id: contractId },
      data: {
        balance: new Prisma.Decimal(newBalance),
        status: newBalance > 0 ? MembershipStatus.PENDIENTE : MembershipStatus.ACTIVO,
        nextRenewAt
      },
      include: {
        MembershipPlan: true,
        MembershipDependent: true,
        Branch: true,
        ClientProfile: true
      }
    });

    return { contract: serializeContract(updated, config), payment };
  });
}
