// @ts-nocheck
import { createHmac, timingSafeEqual } from "crypto";
import {
  MembershipBillingFrequency,
  MembershipOwnerType,
  MembershipStatus,
  PartyType,
  Prisma,
  type ClientProfile
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";
import {
  createContractSchema,
  createPlanCategorySchema,
  createPlanSchema,
  listContractsQuerySchema,
  listPlanCategoriesQuerySchema,
  listPlansQuerySchema,
  membershipConfigSchema,
  publicSubscribeSchema,
  registerPaymentSchema,
  updateContractSchema,
  updateContractStatusSchema,
  updatePlanCategorySchema,
  updatePlanSchema
} from "@/lib/memberships/schemas";
import { decimalToNumberOrZero, serializeContract, serializePayment, serializePlan } from "@/lib/memberships/serializers";
import { registerPayment as registerPaymentLegacyCompat } from "@/src/lib/memberships/service";
import { z } from "zod";

const CURRENCY_ALLOWLIST = new Set(["GTQ", "USD", "EUR"]);
type MembershipPlanSegmentType = "B2C" | "B2B";

const RENEWAL_STATUS = [MembershipStatus.ACTIVO, MembershipStatus.PENDIENTE, MembershipStatus.SUSPENDIDO, MembershipStatus.VENCIDO];

type ListPlansInput = z.infer<typeof listPlansQuerySchema>;
type CreatePlanInput = z.infer<typeof createPlanSchema>;
type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
type ListCategoriesInput = z.infer<typeof listPlanCategoriesQuerySchema>;
type CreateCategoryInput = z.infer<typeof createPlanCategorySchema>;
type UpdateCategoryInput = z.infer<typeof updatePlanCategorySchema>;
type ListContractsInput = z.infer<typeof listContractsQuerySchema>;
type CreateContractInput = z.infer<typeof createContractSchema>;
type UpdateContractInput = z.infer<typeof updateContractSchema>;
type UpdateContractStatusInput = z.infer<typeof updateContractStatusSchema>;
type RegisterPaymentInput = z.infer<typeof registerPaymentSchema>;
type MembershipConfigInput = z.infer<typeof membershipConfigSchema>;
type PublicSubscribeInput = z.infer<typeof publicSubscribeSchema>;

export class MembershipError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "MembershipError";
    this.status = status;
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function now() {
  return new Date();
}

function addMonths(base: Date, months: number) {
  const next = new Date(base);
  next.setMonth(next.getMonth() + months);
  return next;
}

function computeRenewDate(startAt: Date, billingFrequency: MembershipBillingFrequency) {
  if (billingFrequency === MembershipBillingFrequency.ANNUAL) return addMonths(startAt, 12);
  if (billingFrequency === MembershipBillingFrequency.SEMIANNUAL) return addMonths(startAt, 6);
  if (billingFrequency === MembershipBillingFrequency.QUARTERLY) return addMonths(startAt, 3);
  return addMonths(startAt, 1);
}

function defaultPlanTypeBySegment(segment: "B2C" | "B2B") {
  return segment === "B2B" ? "EMPRESARIAL" : "INDIVIDUAL";
}

function ensureCurrencyAllowed(currency: string) {
  const normalized = currency.toUpperCase();
  if (!CURRENCY_ALLOWLIST.has(normalized)) {
    throw new MembershipError(`Moneda no soportada: ${currency}`, 400);
  }
  return normalized;
}

function planBranchWhere(user: SessionUser | null) {
  if (!user?.branchId) return {};
  return {
    OR: [{ assignedBranchId: user.branchId }, { assignedBranchId: null }]
  } satisfies Prisma.MembershipContractWhereInput;
}

function ensureSameBranchOrAdmin(user: SessionUser | null, contract: { assignedBranchId: string | null }) {
  if (!user?.branchId) return;
  if (!contract.assignedBranchId) return;
  if (contract.assignedBranchId !== user.branchId) {
    throw new MembershipError("Contrato fuera del alcance de sede", 404);
  }
}

function coerceDecimal(value: number | null | undefined) {
  if (value === null || value === undefined) return null;
  return new Prisma.Decimal(value);
}

function computeContractMrr(contract: {
  billingFrequency: MembershipBillingFrequency;
  priceLockedMonthly: Prisma.Decimal | null;
  priceLockedAnnual: Prisma.Decimal | null;
  MembershipPlan?: {
    priceMonthly: Prisma.Decimal;
    priceAnnual: Prisma.Decimal;
  } | null;
}) {
  const monthly = decimalToNumberOrZero(contract.priceLockedMonthly ?? contract.MembershipPlan?.priceMonthly ?? 0);
  const annual = decimalToNumberOrZero(contract.priceLockedAnnual ?? contract.MembershipPlan?.priceAnnual ?? 0);

  if (contract.billingFrequency === MembershipBillingFrequency.ANNUAL) return annual > 0 ? annual / 12 : monthly;
  if (contract.billingFrequency === MembershipBillingFrequency.SEMIANNUAL) return monthly > 0 ? monthly : annual / 6;
  if (contract.billingFrequency === MembershipBillingFrequency.QUARTERLY) return monthly > 0 ? monthly : annual / 3;
  return monthly > 0 ? monthly : annual / 12;
}

async function assertCategoryForSegment(categoryId: string | null | undefined, segment: "B2C" | "B2B") {
  if (!categoryId) return null;
  const category = await prisma.membershipPlanCategory.findUnique({ where: { id: categoryId } });
  if (!category) throw new MembershipError("Categoría no encontrada", 404);
  if (!category.isActive) throw new MembershipError("La categoría está inactiva", 400);
  if (category.segment !== segment) {
    throw new MembershipError("La categoría no coincide con el segmento del plan", 400);
  }
  return category;
}

function mapPublicCustomerToOwnerType(type: "PERSON" | "COMPANY") {
  return type === "COMPANY" ? MembershipOwnerType.COMPANY : MembershipOwnerType.PERSON;
}

export function verifyPublicMembershipTokenOrHmac(req: Request, bodyText: string) {
  const tokenHeader = req.headers.get("x-memberships-public-token");
  const signatureHeader = req.headers.get("x-memberships-signature");
  const timestampHeader = req.headers.get("x-memberships-timestamp");

  const token = process.env.MEMBERSHIPS_PUBLIC_TOKEN;
  if (token && tokenHeader && token === tokenHeader) return true;

  const secret = process.env.MEMBERSHIPS_PUBLIC_HMAC_SECRET;
  if (!secret || !signatureHeader || !timestampHeader) return false;

  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp)) return false;
  const ageMs = Math.abs(Date.now() - timestamp);
  if (ageMs > 5 * 60 * 1000) return false;

  const expected = createHmac("sha256", secret).update(`${timestampHeader}.${bodyText}`).digest("hex");
  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(signatureHeader, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function listPlanCategories(input: ListCategoriesInput) {
  const where: Prisma.MembershipPlanCategoryWhereInput = {};
  if (input.segment) where.segment = input.segment;
  if (!input.includeInactive) where.isActive = true;

  const rows = await prisma.membershipPlanCategory.findMany({
    where,
    orderBy: [{ segment: "asc" }, { sortOrder: "asc" }, { name: "asc" }]
  });

  return rows;
}

export async function createPlanCategory(input: CreateCategoryInput) {
  try {
    return await prisma.membershipPlanCategory.create({
      data: {
        name: input.name,
        segment: input.segment,
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
        updatedAt: now()
      }
    });
  } catch (error: any) {
    if (error?.code === "P2002") throw new MembershipError("Ya existe una categoría con ese nombre y segmento", 409);
    throw error;
  }
}

export async function updatePlanCategory(id: string, input: UpdateCategoryInput) {
  try {
    return await prisma.membershipPlanCategory.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.segment !== undefined ? { segment: input.segment } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        updatedAt: now()
      }
    });
  } catch (error: any) {
    if (error?.code === "P2025") throw new MembershipError("Categoría no encontrada", 404);
    if (error?.code === "P2002") throw new MembershipError("Ya existe una categoría con ese nombre y segmento", 409);
    throw error;
  }
}

export async function setPlanCategoryStatus(id: string, isActive: boolean) {
  try {
    return await prisma.membershipPlanCategory.update({
      where: { id },
      data: {
        isActive,
        updatedAt: now()
      }
    });
  } catch (error: any) {
    if (error?.code === "P2025") throw new MembershipError("Categoría no encontrada", 404);
    throw error;
  }
}

export async function listPlans(input: ListPlansInput = {}) {
  const where: Prisma.MembershipPlanWhereInput = {};
  if (input.active !== undefined) where.active = input.active;
  if (input.type) where.type = input.type;
  if (input.segment) where.segment = input.segment;

  const plans = await prisma.membershipPlan.findMany({
    where,
    include: {
      MembershipPlanCategory: true,
      _count: {
        select: {
          MembershipContract: {
            where: {
              status: MembershipStatus.ACTIVO
            }
          }
        }
      }
    },
    orderBy: [{ active: "desc" }, { segment: "asc" }, { name: "asc" }]
  });

  return plans.map((plan) => ({ ...serializePlan(plan), activeContracts: plan._count.MembershipContract }));
}

export async function getPlanById(id: string) {
  const plan = await prisma.membershipPlan.findUnique({
    where: { id },
    include: {
      MembershipPlanCategory: true,
      _count: {
        select: {
          MembershipContract: {
            where: { status: MembershipStatus.ACTIVO }
          }
        }
      }
    }
  });

  if (!plan) throw new MembershipError("Plan no encontrado", 404);
  return { ...serializePlan(plan), activeContracts: plan._count.MembershipContract };
}

export async function createPlan(input: CreatePlanInput) {
  const segment = input.segment;
  const type = input.type ?? defaultPlanTypeBySegment(segment);
  const slug = input.slug || slugify(input.name);
  if (!slug) throw new MembershipError("No se pudo generar slug para el plan", 400);

  const currency = ensureCurrencyAllowed(input.currency);
  await assertCategoryForSegment(input.categoryId, segment);

  try {
    const plan = await prisma.membershipPlan.create({
      data: {
        slug,
        name: input.name,
        description: input.description ?? null,
        type,
        segment,
        categoryId: input.categoryId ?? null,
        imageUrl: input.imageUrl ?? null,
        active: input.active ?? true,
        priceMonthly: new Prisma.Decimal(input.priceMonthly),
        priceAnnual: new Prisma.Decimal(input.priceAnnual),
        currency,
        maxDependents: input.maxDependents ?? null,
        updatedAt: now()
      },
      include: {
        MembershipPlanCategory: true
      }
    });

    return serializePlan(plan);
  } catch (error: any) {
    if (error?.code === "P2002") throw new MembershipError("Slug o nombre ya existente", 409);
    throw error;
  }
}

export async function updatePlan(id: string, input: UpdatePlanInput) {
  const current = await prisma.membershipPlan.findUnique({ where: { id } });
  if (!current) throw new MembershipError("Plan no encontrado", 404);

  const nextSegment = input.segment ?? current.segment;
  const nextCurrency = input.currency ? ensureCurrencyAllowed(input.currency) : current.currency;
  if (input.categoryId !== undefined) {
    await assertCategoryForSegment(input.categoryId, nextSegment);
  }

  const activeContracts = await prisma.membershipContract.count({
    where: {
      planId: id,
      status: MembershipStatus.ACTIVO
    }
  });

  const criticalChange = input.priceMonthly !== undefined || input.priceAnnual !== undefined;
  if (activeContracts > 0 && criticalChange) {
    throw new MembershipError(
      "No se puede modificar precio de un plan con contratos activos. Cree un nuevo plan o desactive este plan.",
      409
    );
  }

  const payload: Prisma.MembershipPlanUpdateInput = {
    ...(input.slug !== undefined ? { slug: input.slug } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.segment !== undefined ? { segment: input.segment } : {}),
    ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
    ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
    ...(input.active !== undefined ? { active: input.active } : {}),
    ...(input.priceMonthly !== undefined ? { priceMonthly: new Prisma.Decimal(input.priceMonthly) } : {}),
    ...(input.priceAnnual !== undefined ? { priceAnnual: new Prisma.Decimal(input.priceAnnual) } : {}),
    ...(input.maxDependents !== undefined ? { maxDependents: input.maxDependents } : {}),
    currency: nextCurrency,
    updatedAt: now()
  };

  try {
    const updated = await prisma.membershipPlan.update({
      where: { id },
      data: payload,
      include: {
        MembershipPlanCategory: true
      }
    });
    return serializePlan(updated);
  } catch (error: any) {
    if (error?.code === "P2002") throw new MembershipError("Slug o nombre ya existente", 409);
    throw error;
  }
}

export async function setPlanStatus(id: string, active: boolean) {
  try {
    const plan = await prisma.membershipPlan.update({
      where: { id },
      data: {
        active,
        updatedAt: now()
      },
      include: {
        MembershipPlanCategory: true
      }
    });
    return serializePlan(plan);
  } catch (error: any) {
    if (error?.code === "P2025") throw new MembershipError("Plan no encontrado", 404);
    throw error;
  }
}

export async function listContracts(input: ListContractsInput, user: SessionUser | null) {
  const nowDate = now();
  const where: Prisma.MembershipContractWhereInput = {
    ...planBranchWhere(user)
  };

  if (input.ownerType) where.ownerType = input.ownerType;
  if (input.status) where.status = input.status;
  if (input.ownerId) where.ownerId = input.ownerId;
  if (input.planId) where.planId = input.planId;
  if (input.segment) {
    where.MembershipPlan = {
      is: {
        segment: input.segment
      }
    };
  }

  if (input.renewWindowDays) {
    where.nextRenewAt = {
      gte: nowDate,
      lte: addMonths(nowDate, 1 + Math.floor(input.renewWindowDays / 30))
    };
  }

  if (input.renewFrom || input.renewTo) {
    where.nextRenewAt = {
      ...(input.renewFrom ? { gte: input.renewFrom } : {}),
      ...(input.renewTo ? { lte: input.renewTo } : {})
    };
  }

  if (input.q) {
    const term = input.q;
    where.OR = [
      { code: { contains: term, mode: "insensitive" } },
      { MembershipPlan: { is: { name: { contains: term, mode: "insensitive" } } } },
      { ClientProfile: { is: { firstName: { contains: term, mode: "insensitive" } } } },
      { ClientProfile: { is: { lastName: { contains: term, mode: "insensitive" } } } },
      { ClientProfile: { is: { companyName: { contains: term, mode: "insensitive" } } } },
      { ClientProfile: { is: { email: { contains: term, mode: "insensitive" } } } },
      { ClientProfile: { is: { phone: { contains: term, mode: "insensitive" } } } },
      { ClientProfile: { is: { nit: { contains: term, mode: "insensitive" } } } }
    ];
  }

  const contracts = await prisma.membershipContract.findMany({
    where,
    include: {
      ClientProfile: {
        select: {
          id: true,
          type: true,
          firstName: true,
          lastName: true,
          companyName: true,
          email: true,
          phone: true,
          nit: true
        }
      },
      MembershipPlan: {
        include: {
          MembershipPlanCategory: true
        }
      },
      MembershipPayment: {
        take: 5,
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: [{ nextRenewAt: "asc" }, { createdAt: "desc" }],
    take: input.take
  });

  return contracts.map((contract) => serializeContract(contract));
}

export async function getContractById(id: string, user: SessionUser | null) {
  const contract = await prisma.membershipContract.findUnique({
    where: { id },
    include: {
      ClientProfile: true,
      MembershipPlan: {
        include: {
          MembershipPlanCategory: true
        }
      },
      MembershipDependent: true,
      MembershipPayment: {
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!contract) throw new MembershipError("Contrato no encontrado", 404);
  ensureSameBranchOrAdmin(user, contract);

  return serializeContract(contract);
}

export async function createContract(input: CreateContractInput, user: SessionUser | null) {
  const [plan, owner] = await Promise.all([
    prisma.membershipPlan.findUnique({ where: { id: input.planId } }),
    prisma.clientProfile.findUnique({ where: { id: input.ownerId } })
  ]);

  if (!plan) throw new MembershipError("Plan no encontrado", 404);
  if (!owner) throw new MembershipError("Titular no encontrado", 404);

  if (input.ownerType === MembershipOwnerType.PERSON && plan.segment === "B2B") {
    throw new MembershipError("El plan seleccionado es B2B y requiere titular empresa", 400);
  }
  if (input.ownerType === MembershipOwnerType.COMPANY && plan.segment === "B2C") {
    throw new MembershipError("El plan seleccionado es B2C y requiere titular persona", 400);
  }

  const startAt = input.startAt;
  const billingFrequency = input.billingFrequency;
  const created = await prisma.membershipContract.create({
    data: {
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      planId: input.planId,
      status: input.status ?? MembershipStatus.PENDIENTE,
      startAt,
      endAt: input.endAt ?? null,
      nextRenewAt: input.nextRenewAt ?? computeRenewDate(startAt, billingFrequency),
      billingFrequency,
      priceLockedMonthly: coerceDecimal(input.priceLockedMonthly ?? decimalToNumberOrZero(plan.priceMonthly)),
      priceLockedAnnual: coerceDecimal(input.priceLockedAnnual ?? decimalToNumberOrZero(plan.priceAnnual)),
      balance: new Prisma.Decimal(0),
      channel: input.channel ?? null,
      assignedBranchId: input.assignedBranchId ?? user?.branchId ?? null,
      allowDependents: input.allowDependents ?? true,
      lastInvoiceId: input.lastInvoiceId ?? null,
      updatedAt: now()
    },
    include: {
      ClientProfile: true,
      MembershipPlan: {
        include: {
          MembershipPlanCategory: true
        }
      }
    }
  });

  return serializeContract(created);
}

export async function updateContract(id: string, input: UpdateContractInput, user: SessionUser | null) {
  const contract = await prisma.membershipContract.findUnique({ where: { id } });
  if (!contract) throw new MembershipError("Contrato no encontrado", 404);
  ensureSameBranchOrAdmin(user, contract);

  if (input.planId) {
    const plan = await prisma.membershipPlan.findUnique({ where: { id: input.planId } });
    if (!plan) throw new MembershipError("Plan no encontrado", 404);
  }

  try {
    const updated = await prisma.membershipContract.update({
      where: { id },
      data: {
        ...(input.planId !== undefined ? { planId: input.planId } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.startAt !== undefined ? { startAt: input.startAt } : {}),
        ...(input.endAt !== undefined ? { endAt: input.endAt } : {}),
        ...(input.nextRenewAt !== undefined ? { nextRenewAt: input.nextRenewAt } : {}),
        ...(input.billingFrequency !== undefined ? { billingFrequency: input.billingFrequency } : {}),
        ...(input.priceLockedMonthly !== undefined ? { priceLockedMonthly: coerceDecimal(input.priceLockedMonthly) } : {}),
        ...(input.priceLockedAnnual !== undefined ? { priceLockedAnnual: coerceDecimal(input.priceLockedAnnual) } : {}),
        ...(input.channel !== undefined ? { channel: input.channel } : {}),
        ...(input.assignedBranchId !== undefined ? { assignedBranchId: input.assignedBranchId } : {}),
        ...(input.allowDependents !== undefined ? { allowDependents: input.allowDependents } : {}),
        ...(input.lastInvoiceId !== undefined ? { lastInvoiceId: input.lastInvoiceId } : {}),
        updatedAt: now()
      },
      include: {
        ClientProfile: true,
        MembershipPlan: {
          include: {
            MembershipPlanCategory: true
          }
        }
      }
    });

    return serializeContract(updated);
  } catch (error: any) {
    if (error?.code === "P2025") throw new MembershipError("Contrato no encontrado", 404);
    throw error;
  }
}

export async function updateContractStatus(id: string, input: UpdateContractStatusInput, user: SessionUser | null) {
  const contract = await prisma.membershipContract.findUnique({ where: { id } });
  if (!contract) throw new MembershipError("Contrato no encontrado", 404);
  ensureSameBranchOrAdmin(user, contract);

  const updated = await prisma.membershipContract.update({
    where: { id },
    data: {
      status: input.status,
      updatedAt: now()
    }
  });

  return serializeContract(updated);
}

export async function registerContractPayment(contractId: string, input: RegisterPaymentInput, user: SessionUser | null) {
  const contract = await prisma.membershipContract.findUnique({ where: { id: contractId } });
  if (!contract) throw new MembershipError("Contrato no encontrado", 404);
  ensureSameBranchOrAdmin(user, contract);

  const payment = await prisma.membershipPayment.create({
    data: {
      contractId,
      amount: new Prisma.Decimal(input.amount),
      method: input.method,
      kind: input.kind,
      status: input.status,
      paidAt: input.paidAt ?? (input.status === "PAID" ? now() : null),
      refNo: input.refNo ?? null,
      invoiceId: input.invoiceId ?? null,
      notes: input.notes ?? null,
      createdAt: now()
    }
  });

  // No reactivación automática desde pagos.
  if (input.status === "PAID") {
    const currentBalance = decimalToNumberOrZero(contract.balance);
    const nextBalance = Math.max(0, currentBalance - input.amount);
    await prisma.membershipContract.update({
      where: { id: contractId },
      data: {
        balance: new Prisma.Decimal(nextBalance),
        updatedAt: now()
      }
    });
  }

  return serializePayment(payment);
}

// Compat API for legacy route: /api/membresias/contratos/[id]/pago
export async function registerPayment(prismaLike: any, contractId: string, rawInput: unknown) {
  return registerPaymentLegacyCompat(prismaLike, contractId, rawInput);
}

export async function listRenewalQueue(user: SessionUser | null) {
  const today = now();
  const in30Days = addMonths(today, 1);

  const rows = await prisma.membershipContract.findMany({
    where: {
      status: { in: RENEWAL_STATUS },
      nextRenewAt: {
        gte: today,
        lte: in30Days
      },
      ...planBranchWhere(user)
    },
    include: {
      MembershipPlan: {
        include: {
          MembershipPlanCategory: true
        }
      },
      ClientProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyName: true,
          type: true,
          email: true,
          phone: true
        }
      }
    },
    orderBy: [{ nextRenewAt: "asc" }, { createdAt: "desc" }]
  });

  const queue = rows.map((row) => {
    const renewAt = row.nextRenewAt ? new Date(row.nextRenewAt) : null;
    const days = renewAt ? Math.ceil((renewAt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
    return {
      id: row.id,
      code: row.code,
      status: row.status,
      nextRenewAt: row.nextRenewAt,
      balance: decimalToNumberOrZero(row.balance),
      daysToRenew: days,
      owner: row.ClientProfile,
      plan: serializePlan(row.MembershipPlan),
      actions: {
        invoiceUrl: `/admin/facturacion?source=membership&contractId=${row.id}`,
        contractUrl: `/admin/membresias/contratos/${row.id}`
      }
    };
  });

  return {
    dueIn7: queue.filter((item) => item.daysToRenew !== null && item.daysToRenew <= 7),
    dueIn15: queue.filter((item) => item.daysToRenew !== null && item.daysToRenew > 7 && item.daysToRenew <= 15),
    dueIn30: queue.filter((item) => item.daysToRenew !== null && item.daysToRenew > 15 && item.daysToRenew <= 30),
    all: queue
  };
}

export async function getMembershipConfig() {
  const config = await prisma.membershipConfig.upsert({
    where: { id: 1 },
    create: {
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
      createdAt: now(),
      updatedAt: now()
    },
    update: {}
  });

  return config;
}

export async function updateMembershipConfig(input: MembershipConfigInput) {
  return prisma.membershipConfig.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      ...input,
      createdAt: now(),
      updatedAt: now()
    },
    update: {
      ...input,
      updatedAt: now()
    }
  });
}

export async function getMembershipDashboard(user: SessionUser | null) {
  const today = now();
  const in7 = new Date(today);
  in7.setDate(in7.getDate() + 7);
  const in15 = new Date(today);
  in15.setDate(in15.getDate() + 15);
  const in30 = new Date(today);
  in30.setDate(in30.getDate() + 30);

  const contractScope: Prisma.MembershipContractWhereInput = {
    ...planBranchWhere(user)
  };

  const [plansActive, contractsActive, renewals7, renewals15, renewals30, contractsAtRisk, activeContracts] = await Promise.all([
    prisma.membershipPlan.count({ where: { active: true } }),
    prisma.membershipContract.count({ where: { ...contractScope, status: MembershipStatus.ACTIVO } }),
    prisma.membershipContract.count({
      where: {
        ...contractScope,
        status: { in: [MembershipStatus.ACTIVO, MembershipStatus.PENDIENTE] },
        nextRenewAt: { gte: today, lte: in7 }
      }
    }),
    prisma.membershipContract.count({
      where: {
        ...contractScope,
        status: { in: [MembershipStatus.ACTIVO, MembershipStatus.PENDIENTE] },
        nextRenewAt: { gte: today, lte: in15 }
      }
    }),
    prisma.membershipContract.count({
      where: {
        ...contractScope,
        status: { in: [MembershipStatus.ACTIVO, MembershipStatus.PENDIENTE] },
        nextRenewAt: { gte: today, lte: in30 }
      }
    }),
    prisma.membershipContract.count({
      where: {
        ...contractScope,
        status: {
          in: [MembershipStatus.PENDIENTE, MembershipStatus.SUSPENDIDO, MembershipStatus.VENCIDO]
        }
      }
    }),
    prisma.membershipContract.findMany({
      where: {
        ...contractScope,
        status: MembershipStatus.ACTIVO
      },
      include: {
        MembershipPlan: {
          include: {
            MembershipPlanCategory: true
          }
        }
      }
    })
  ]);

  let totalMrr = 0;
  let b2cActive = 0;
  let b2bActive = 0;
  let b2cMrr = 0;
  let b2bMrr = 0;

  const categoryMap = new Map<
    string,
    {
      categoryId: string | null;
      categoryName: string;
      segment: MembershipPlanSegmentType;
      activeContracts: number;
      renewals30d: number;
      mrr: number;
    }
  >();

  for (const contract of activeContracts) {
    const mrr = computeContractMrr(contract);
    totalMrr += mrr;

    const segment = contract.MembershipPlan.segment;
    if (segment === "B2C") {
      b2cActive += 1;
      b2cMrr += mrr;
    } else {
      b2bActive += 1;
      b2bMrr += mrr;
    }

    const categoryId = contract.MembershipPlan.categoryId ?? null;
    const categoryName = contract.MembershipPlan.MembershipPlanCategory?.name ?? "Sin categoría";
    const key = `${segment}:${categoryId ?? "none"}`;
    const existing = categoryMap.get(key) ?? {
      categoryId,
      categoryName,
      segment,
      activeContracts: 0,
      renewals30d: 0,
      mrr: 0
    };

    existing.activeContracts += 1;
    existing.mrr += mrr;
    if (contract.nextRenewAt && contract.nextRenewAt <= in30) existing.renewals30d += 1;
    categoryMap.set(key, existing);
  }

  const categories = Array.from(categoryMap.values())
    .sort((left, right) => right.activeContracts - left.activeContracts)
    .slice(0, 10)
    .map((entry) => ({
      ...entry,
      mrr: Number(entry.mrr.toFixed(2))
    }));

  return {
    cards: {
      plansActive,
      contractsActive,
      renewals7,
      renewals15,
      renewals30,
      contractsAtRisk,
      estimatedMrr: Number(totalMrr.toFixed(2)),
      b2cActive,
      b2bActive,
      b2cMrr: Number(b2cMrr.toFixed(2)),
      b2bMrr: Number(b2bMrr.toFixed(2))
    },
    categories
  };
}

async function resolveClientForPublicSubscription(customer: PublicSubscribeInput["customer"]) {
  if (customer.type === "PERSON") {
    if (!customer.firstName || !customer.lastName) {
      throw new MembershipError("Nombre y apellido son requeridos para persona", 400);
    }

    const whereClauses: Prisma.ClientProfileWhereInput[] = [];
    if (customer.dpi) whereClauses.push({ dpi: customer.dpi });
    if (customer.email) whereClauses.push({ email: customer.email, type: "PERSON" });
    if (customer.phone) whereClauses.push({ phone: customer.phone, type: "PERSON" });

    const existing = whereClauses.length
      ? await prisma.clientProfile.findFirst({
          where: {
            OR: whereClauses
          }
        })
      : null;
    if (existing) return existing;

    return prisma.clientProfile.create({
      data: {
        type: "PERSON",
        firstName: customer.firstName,
        lastName: customer.lastName,
        dpi: customer.dpi ?? null,
        email: customer.email ?? null,
        phone: customer.phone ?? null,
        address: customer.address ?? null
      }
    });
  }

  if (!customer.companyName) {
    throw new MembershipError("companyName es requerido para empresa", 400);
  }

  const whereClauses: Prisma.ClientProfileWhereInput[] = [];
  if (customer.nit) whereClauses.push({ nit: customer.nit });
  if (customer.email) whereClauses.push({ email: customer.email, type: "COMPANY" });

  const existing = whereClauses.length
    ? await prisma.clientProfile.findFirst({
        where: {
          OR: whereClauses
        }
      })
    : null;
  if (existing) return existing;

  return prisma.clientProfile.create({
    data: {
      type: "COMPANY",
      companyName: customer.companyName,
      nit: customer.nit ?? null,
      email: customer.email ?? null,
      phone: customer.phone ?? null,
      address: customer.address ?? null
    }
  });
}

async function ensurePartyForClient(client: ClientProfile, customer: PublicSubscribeInput["customer"]) {
  if (client.partyId) {
    const existing = await prisma.party.findUnique({ where: { id: client.partyId } });
    if (existing) return existing;
  }

  const lookup: Prisma.PartyWhereInput[] = [];
  if (customer.nit) lookup.push({ nit: customer.nit });
  if (customer.email) lookup.push({ email: customer.email });
  if (customer.phone) lookup.push({ phone: customer.phone });

  const partyName =
    customer.type === "PERSON"
      ? `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "Cliente"
      : customer.companyName || "Empresa";

  const existingParty = lookup.length ? await prisma.party.findFirst({ where: { OR: lookup } }) : null;
  const party =
    existingParty ||
    (await prisma.party.create({
      data: {
        type: PartyType.CLIENT,
        name: partyName,
        nit: customer.nit ?? null,
        email: customer.email ?? null,
        phone: customer.phone ?? null,
        address: customer.address ?? null,
        isActive: true
      }
    }));

  if (client.partyId !== party.id) {
    await prisma.clientProfile.update({
      where: { id: client.id },
      data: {
        partyId: party.id
      }
    });
  }

  return party;
}

async function createReceivableDraftForMembership(params: {
  contractId: string;
  contractCode: string;
  partyId: string;
  amount: Prisma.Decimal;
  legalEntityId?: string | null;
}) {
  const legalEntity = params.legalEntityId
    ? await prisma.legalEntity.findUnique({ where: { id: params.legalEntityId } })
    : await prisma.legalEntity.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } });

  if (!legalEntity) {
    return null;
  }

  const today = now();
  const dueDate = new Date(today);
  dueDate.setDate(dueDate.getDate() + 7);

  return prisma.receivable.create({
    data: {
      legalEntityId: legalEntity.id,
      partyId: params.partyId,
      date: today,
      dueDate,
      creditTerm: "DAYS_15",
      amount: params.amount,
      paidAmount: new Prisma.Decimal(0),
      status: "OPEN",
      reference: `MEMBERSHIP:${params.contractCode}`
    }
  });
}

export async function subscribePublicMembership(input: PublicSubscribeInput) {
  const existing = await prisma.membershipPublicSubscriptionRequest.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing?.responsePayload) {
    return existing.responsePayload as {
      contractId: string;
      invoiceId: string | null;
      nextStepUrl: string;
      source: "idempotent-cache";
    };
  }

  const plan = await prisma.membershipPlan.findUnique({
    where: { id: input.planId },
    include: {
      MembershipPlanCategory: true
    }
  });

  if (!plan || !plan.active) throw new MembershipError("Plan no disponible", 404);
  if (plan.segment !== input.segment) throw new MembershipError("El segmento no coincide con el plan", 400);

  if (input.categoryId) {
    await assertCategoryForSegment(input.categoryId, input.segment);
  }

  const client = await resolveClientForPublicSubscription(input.customer);
  const party = await ensurePartyForClient(client, input.customer);

  const startAt = now();
  const nextRenewAt = computeRenewDate(startAt, MembershipBillingFrequency.MONTHLY);
  const ownerType = mapPublicCustomerToOwnerType(input.customer.type);

  const contract = await prisma.membershipContract.create({
    data: {
      ownerType,
      ownerId: client.id,
      planId: plan.id,
      status: MembershipStatus.PENDIENTE,
      startAt,
      endAt: null,
      nextRenewAt,
      billingFrequency: MembershipBillingFrequency.MONTHLY,
      priceLockedMonthly: plan.priceMonthly,
      priceLockedAnnual: plan.priceAnnual,
      balance: plan.priceMonthly,
      channel: "WEB",
      allowDependents: ownerType === MembershipOwnerType.PERSON,
      updatedAt: now()
    }
  });

  const receivable = await createReceivableDraftForMembership({
    contractId: contract.id,
    contractCode: contract.code,
    partyId: party.id,
    amount: plan.priceMonthly
  });

  if (receivable?.id) {
    await prisma.membershipContract.update({
      where: { id: contract.id },
      data: {
        lastInvoiceId: receivable.id,
        updatedAt: now()
      }
    });
  }

  const payload = {
    contractId: contract.id,
    invoiceId: receivable?.id ?? null,
    nextStepUrl: receivable?.id
      ? `/admin/finanzas?tab=operacion&source=membership&contractId=${contract.id}&receivableId=${receivable.id}`
      : `/admin/facturacion?source=membership&contractId=${contract.id}`,
    source: "fresh-create" as const
  };

  try {
    await prisma.membershipPublicSubscriptionRequest.create({
      data: {
        idempotencyKey: input.idempotencyKey,
        channel: "WEB",
        planId: input.planId,
        segment: input.segment,
        categoryId: input.categoryId ?? null,
        clientProfileId: client.id,
        contractId: contract.id,
        invoiceId: receivable?.id ?? null,
        status: "CREATED",
        requestPayload: input as Prisma.InputJsonValue,
        responsePayload: payload as Prisma.InputJsonValue
      }
    });
  } catch (error: any) {
    if (error?.code !== "P2002") throw error;

    const duplicated = await prisma.membershipPublicSubscriptionRequest.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (duplicated?.responsePayload) {
      return duplicated.responsePayload as {
        contractId: string;
        invoiceId: string | null;
        nextStepUrl: string;
        source: "idempotent-cache";
      };
    }
  }

  return payload;
}
