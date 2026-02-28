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
  contractCheckoutInitSchema,
  createBenefitCatalogSchema,
  createContractSchema,
  createDurationPresetSchema,
  createPlanCategorySchema,
  createPlanSchema,
  listBenefitsQuerySchema,
  listContractsQuerySchema,
  listDurationPresetsQuerySchema,
  listPlanCategoriesQuerySchema,
  listPlansQuerySchema,
  membershipGatewayConfigSchema,
  membershipConfigSchema,
  publicSubscribeSchema,
  registerPaymentSchema,
  recurrenteWebhookSchema,
  renewContractSchema,
  updateContractSchema,
  updateContractStatusSchema,
  updatePlanCategorySchema,
  updatePlanSchema
} from "@/lib/memberships/schemas";
import { decimalToNumberOrZero, serializeContract, serializePayment, serializePlan } from "@/lib/memberships/serializers";
import { buildMembershipInvoiceLink } from "@/lib/memberships/links";
import { z } from "zod";

const CURRENCY_ALLOWLIST = new Set(["GTQ", "USD", "EUR"]);
type MembershipPlanSegmentType = "B2C" | "B2B";

const RENEWAL_STATUS = [
  MembershipStatus.ACTIVO,
  MembershipStatus.PENDIENTE,
  MembershipStatus.PENDIENTE_PAGO,
  MembershipStatus.SUSPENDIDO,
  MembershipStatus.VENCIDO
];
const PLAN_INCLUDE = {
  MembershipPlanCategory: true,
  MembershipDurationPreset: true,
  MembershipPlanBenefit: {
    include: {
      MembershipBenefitCatalog: true
    }
  }
} as const;

type ListPlansInput = z.infer<typeof listPlansQuerySchema>;
type CreatePlanInput = z.infer<typeof createPlanSchema>;
type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
type ListDurationPresetsInput = z.infer<typeof listDurationPresetsQuerySchema>;
type CreateDurationPresetInput = z.infer<typeof createDurationPresetSchema>;
type ListBenefitsInput = z.infer<typeof listBenefitsQuerySchema>;
type CreateBenefitCatalogInput = z.infer<typeof createBenefitCatalogSchema>;
type ListCategoriesInput = z.infer<typeof listPlanCategoriesQuerySchema>;
type CreateCategoryInput = z.infer<typeof createPlanCategorySchema>;
type UpdateCategoryInput = z.infer<typeof updatePlanCategorySchema>;
type ListContractsInput = z.infer<typeof listContractsQuerySchema>;
type CreateContractInput = z.infer<typeof createContractSchema>;
type UpdateContractInput = z.infer<typeof updateContractSchema>;
type UpdateContractStatusInput = z.infer<typeof updateContractStatusSchema>;
type RegisterPaymentInput = z.infer<typeof registerPaymentSchema>;
type RenewContractInput = z.infer<typeof renewContractSchema>;
type MembershipConfigInput = z.infer<typeof membershipConfigSchema>;
type MembershipGatewayConfigInput = z.infer<typeof membershipGatewayConfigSchema>;
type ContractCheckoutInitInput = z.infer<typeof contractCheckoutInitSchema>;
type PublicSubscribeInput = z.infer<typeof publicSubscribeSchema>;
type RecurrenteWebhookInput = z.infer<typeof recurrenteWebhookSchema>;

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

function inferPaymentMethod(channel?: string | null) {
  return String(channel || "").toUpperCase().includes("RECURRENT") ? "RECURRENT" : "MANUAL";
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

function computeRenewalAmount(contract: {
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

  if (contract.billingFrequency === MembershipBillingFrequency.ANNUAL) return annual > 0 ? annual : monthly * 12;
  if (contract.billingFrequency === MembershipBillingFrequency.SEMIANNUAL) return annual > 0 ? annual / 2 : monthly * 6;
  if (contract.billingFrequency === MembershipBillingFrequency.QUARTERLY) return annual > 0 ? annual / 4 : monthly * 3;
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

function catalogBranchScope(user: SessionUser | null) {
  if (!user?.branchId) return {};
  return {
    OR: [{ branchId: user.branchId }, { branchId: null }]
  };
}

function resolveCatalogBranchId(inputBranchId: string | null | undefined, user: SessionUser | null) {
  if (inputBranchId !== undefined && inputBranchId !== null) {
    if (user?.branchId && inputBranchId !== user.branchId) {
      throw new MembershipError("No autorizado para configurar catálogos en otra sucursal", 403);
    }
    return inputBranchId;
  }
  return user?.branchId ?? null;
}

async function assertDurationPreset(durationPresetId: string | null | undefined) {
  if (!durationPresetId) return null;
  const preset = await prisma.membershipDurationPreset.findUnique({ where: { id: durationPresetId } });
  if (!preset) throw new MembershipError("Preset de duración no encontrado", 404);
  if (!preset.isActive) throw new MembershipError("El preset de duración está inactivo", 400);
  return preset;
}

async function resolvePlanBenefits(benefits: Array<{ benefitId: string; quantity?: number | null; isUnlimited?: boolean; notes?: string | null }> | undefined) {
  if (!benefits?.length) return [];
  const uniqueBenefitIds = Array.from(new Set(benefits.map((item) => item.benefitId)));

  const catalogRows = await prisma.membershipBenefitCatalog.findMany({
    where: { id: { in: uniqueBenefitIds } }
  });
  const catalogById = new Map(catalogRows.map((row) => [row.id, row]));

  for (const benefitId of uniqueBenefitIds) {
    const catalog = catalogById.get(benefitId);
    if (!catalog) throw new MembershipError(`Beneficio no encontrado: ${benefitId}`, 404);
    if (!catalog.isActive) throw new MembershipError(`El beneficio está inactivo: ${catalog.title}`, 400);
  }

  return benefits.map((benefit) => ({
    benefitId: benefit.benefitId,
    quantity: benefit.quantity ?? null,
    isUnlimited: benefit.isUnlimited ?? false,
    notes: benefit.notes ?? null
  }));
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

export async function listDurationPresets(input: ListDurationPresetsInput, user: SessionUser | null) {
  const where: Prisma.MembershipDurationPresetWhereInput = {
    ...catalogBranchScope(user)
  };
  if (!input.includeInactive) where.isActive = true;

  return prisma.membershipDurationPreset.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { days: "asc" }, { name: "asc" }]
  });
}

export async function createDurationPreset(input: CreateDurationPresetInput, user: SessionUser | null) {
  const branchId = resolveCatalogBranchId(input.branchId, user);
  try {
    return await prisma.membershipDurationPreset.create({
      data: {
        name: input.name,
        days: input.days,
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
        branchId,
        updatedAt: now()
      }
    });
  } catch (error: any) {
    if (error?.code === "P2002") throw new MembershipError("Ya existe un preset con ese nombre en esta sucursal", 409);
    throw error;
  }
}

export async function setDurationPresetStatus(id: string, isActive: boolean, user: SessionUser | null) {
  const current = await prisma.membershipDurationPreset.findUnique({ where: { id } });
  if (!current) throw new MembershipError("Preset no encontrado", 404);
  if (user?.branchId && current.branchId && current.branchId !== user.branchId) {
    throw new MembershipError("Preset fuera del alcance de sucursal", 404);
  }

  return prisma.membershipDurationPreset.update({
    where: { id },
    data: {
      isActive,
      updatedAt: now()
    }
  });
}

export async function listBenefitCatalog(input: ListBenefitsInput, user: SessionUser | null) {
  const where: Prisma.MembershipBenefitCatalogWhereInput = {
    ...catalogBranchScope(user)
  };
  if (!input.includeInactive) where.isActive = true;
  if (input.serviceType) where.serviceType = input.serviceType;

  return prisma.membershipBenefitCatalog.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }]
  });
}

export async function createBenefitCatalog(input: CreateBenefitCatalogInput, user: SessionUser | null) {
  const branchId = resolveCatalogBranchId(input.branchId, user);
  try {
    return await prisma.membershipBenefitCatalog.create({
      data: {
        title: input.title,
        serviceType: input.serviceType,
        imageUrl: input.imageUrl ?? null,
        iconKey: input.iconKey ?? null,
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
        branchId,
        updatedAt: now()
      }
    });
  } catch (error: any) {
    if (error?.code === "P2002") throw new MembershipError("Ya existe un beneficio con ese nombre/tipo en esta sucursal", 409);
    throw error;
  }
}

export async function setBenefitCatalogStatus(id: string, isActive: boolean, user: SessionUser | null) {
  const current = await prisma.membershipBenefitCatalog.findUnique({ where: { id } });
  if (!current) throw new MembershipError("Beneficio no encontrado", 404);
  if (user?.branchId && current.branchId && current.branchId !== user.branchId) {
    throw new MembershipError("Beneficio fuera del alcance de sucursal", 404);
  }

  return prisma.membershipBenefitCatalog.update({
    where: { id },
    data: {
      isActive,
      updatedAt: now()
    }
  });
}

export async function listPlans(input: ListPlansInput = {}) {
  const where: Prisma.MembershipPlanWhereInput = {};
  if (input.active !== undefined) where.active = input.active;
  if (input.type) where.type = input.type;
  if (input.segment) where.segment = input.segment;

  const plans = await prisma.membershipPlan.findMany({
    where,
    include: {
      ...PLAN_INCLUDE,
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

  return plans.map((plan) => ({
    ...serializePlan(plan),
    activeContracts: plan._count.MembershipContract,
    benefitsCount: plan.MembershipPlanBenefit?.length || 0
  }));
}

export async function getPlanById(id: string) {
  const plan = await prisma.membershipPlan.findUnique({
    where: { id },
    include: {
      ...PLAN_INCLUDE,
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
  return {
    ...serializePlan(plan),
    activeContracts: plan._count.MembershipContract,
    benefitsCount: plan.MembershipPlanBenefit?.length || 0
  };
}

export async function createPlan(input: CreatePlanInput) {
  const segment = input.segment;
  const type = input.type ?? defaultPlanTypeBySegment(segment);
  const slug = input.slug || slugify(input.name);
  if (!slug) throw new MembershipError("No se pudo generar slug para el plan", 400);

  const currency = ensureCurrencyAllowed(input.currency);
  await assertCategoryForSegment(input.categoryId, segment);
  await assertDurationPreset(input.durationPresetId);
  const normalizedBenefits = await resolvePlanBenefits(input.benefits);

  let durationPresetId = input.durationPresetId ?? null;
  let customDurationDays = input.customDurationDays ?? null;
  if (durationPresetId) customDurationDays = null;
  if (customDurationDays) durationPresetId = null;

  try {
    const plan = await prisma.$transaction(async (tx) => {
      const created = await tx.membershipPlan.create({
        data: {
          slug,
          name: input.name,
          description: input.description ?? null,
          type,
          segment,
          categoryId: input.categoryId ?? null,
          durationPresetId,
          customDurationDays,
          imageUrl: input.imageUrl ?? null,
          active: input.active ?? true,
          priceMonthly: new Prisma.Decimal(input.priceMonthly),
          priceAnnual: new Prisma.Decimal(input.priceAnnual),
          currency,
          maxDependents: input.maxDependents ?? null,
          updatedAt: now()
        }
      });

      if (normalizedBenefits.length) {
        await tx.membershipPlanBenefit.createMany({
          data: normalizedBenefits.map((benefit) => ({
            planId: created.id,
            benefitId: benefit.benefitId,
            quantity: benefit.quantity,
            isUnlimited: benefit.isUnlimited,
            notes: benefit.notes,
            createdAt: now(),
            updatedAt: now()
          }))
        });
      }

      return tx.membershipPlan.findUnique({
        where: { id: created.id },
        include: PLAN_INCLUDE
      });
    });

    if (!plan) throw new MembershipError("No se pudo crear el plan", 500);
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
  if (input.durationPresetId !== undefined) {
    await assertDurationPreset(input.durationPresetId);
  }

  const normalizedBenefits = input.benefits ? await resolvePlanBenefits(input.benefits) : null;

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

  let nextDurationPresetId = input.durationPresetId !== undefined ? input.durationPresetId : current.durationPresetId;
  let nextCustomDurationDays = input.customDurationDays !== undefined ? input.customDurationDays : current.customDurationDays;
  if (nextDurationPresetId) nextCustomDurationDays = null;
  if (nextCustomDurationDays) nextDurationPresetId = null;

  const payload: Prisma.MembershipPlanUpdateInput = {
    ...(input.slug !== undefined ? { slug: input.slug } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.segment !== undefined ? { segment: input.segment } : {}),
    ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
    ...(input.durationPresetId !== undefined || input.customDurationDays !== undefined
      ? {
          durationPresetId: nextDurationPresetId,
          customDurationDays: nextCustomDurationDays
        }
      : {}),
    ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
    ...(input.active !== undefined ? { active: input.active } : {}),
    ...(input.priceMonthly !== undefined ? { priceMonthly: new Prisma.Decimal(input.priceMonthly) } : {}),
    ...(input.priceAnnual !== undefined ? { priceAnnual: new Prisma.Decimal(input.priceAnnual) } : {}),
    ...(input.maxDependents !== undefined ? { maxDependents: input.maxDependents } : {}),
    currency: nextCurrency,
    updatedAt: now()
  };

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.membershipPlan.update({
        where: { id },
        data: payload
      });

      if (normalizedBenefits) {
        await tx.membershipPlanBenefit.deleteMany({ where: { planId: id } });
        if (normalizedBenefits.length) {
          await tx.membershipPlanBenefit.createMany({
            data: normalizedBenefits.map((benefit) => ({
              planId: id,
              benefitId: benefit.benefitId,
              quantity: benefit.quantity,
              isUnlimited: benefit.isUnlimited,
              notes: benefit.notes,
              createdAt: now(),
              updatedAt: now()
            }))
          });
        }
      }

      return tx.membershipPlan.findUnique({
        where: { id },
        include: PLAN_INCLUDE
      });
    });
    if (!updated) throw new MembershipError("No se pudo actualizar el plan", 500);
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
      include: PLAN_INCLUDE
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
  if (input.branchId) where.assignedBranchId = input.branchId;
  if (input.paymentMethod === "RECURRENT") {
    where.MembershipContractBillingProfile = {
      is: {
        provider: "RECURRENT"
      }
    };
  }
  if (input.paymentMethod === "MANUAL") {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      {
        OR: [
          { MembershipContractBillingProfile: { is: null } },
          { MembershipContractBillingProfile: { is: { provider: "MANUAL" } } }
        ]
      }
    ];
  }
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
      },
      MembershipContractBillingProfile: {
        select: {
          provider: true,
          status: true
        }
      }
    },
    orderBy: [{ nextRenewAt: "asc" }, { createdAt: "desc" }],
    take: input.take
  });

  return contracts.map((contract) => ({
    ...serializeContract(contract),
    paymentMethod: contract.MembershipContractBillingProfile?.provider || inferPaymentMethod(contract.channel),
    billingStatus: contract.MembershipContractBillingProfile?.status || null,
    branchId: contract.assignedBranchId ?? null
  }));
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
      MembershipContractBillingProfile: true,
      MembershipDependent: true,
      MembershipPayment: {
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!contract) throw new MembershipError("Contrato no encontrado", 404);
  ensureSameBranchOrAdmin(user, contract);

  return {
    ...serializeContract(contract),
    paymentMethod: contract.MembershipContractBillingProfile?.provider || inferPaymentMethod(contract.channel),
    billingStatus: contract.MembershipContractBillingProfile?.status || null,
    branchId: contract.assignedBranchId ?? null
  };
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

  await prisma.membershipContractBillingProfile
    .upsert({
      where: { contractId: created.id },
      update: {
        provider: inferPaymentMethod(input.channel) === "RECURRENT" ? "RECURRENT" : "MANUAL",
        status: "ACTIVE",
        updatedAt: now()
      },
      create: {
        contractId: created.id,
        provider: inferPaymentMethod(input.channel) === "RECURRENT" ? "RECURRENT" : "MANUAL",
        status: "ACTIVE",
        createdAt: now(),
        updatedAt: now()
      }
    })
    .catch(() => null);

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

export async function renewContract(id: string, input: RenewContractInput, user: SessionUser | null) {
  const contract = await prisma.membershipContract.findUnique({
    where: { id },
    include: {
      MembershipPlan: true,
      MembershipContractBillingProfile: true
    }
  });
  if (!contract) throw new MembershipError("Contrato no encontrado", 404);
  ensureSameBranchOrAdmin(user, contract);

  const provider = contract.MembershipContractBillingProfile?.provider || inferPaymentMethod(contract.channel);
  const renewalAmount = computeRenewalAmount(contract);
  const currentBalance = decimalToNumberOrZero(contract.balance);
  const baseDate = contract.nextRenewAt && contract.nextRenewAt > now() ? contract.nextRenewAt : now();
  const nextRenewAt = computeRenewDate(baseDate, contract.billingFrequency);

  return prisma.$transaction(async (tx) => {
    await tx.membershipPayment.create({
      data: {
        contractId: id,
        amount: new Prisma.Decimal(renewalAmount),
        method: provider === "RECURRENT" ? "CARD" : "TRANSFER",
        kind: "RENEWAL",
        status: input.markAsPaid ? "PAID" : "PENDING",
        paidAt: input.markAsPaid ? now() : null,
        notes:
          input.notes ??
          (input.markAsPaid
            ? "Renovación registrada con pago manual confirmado"
            : "Renovación registrada con pago pendiente"),
        createdAt: now()
      }
    });

    const nextBalance = input.markAsPaid ? Math.max(0, currentBalance - renewalAmount) : currentBalance + renewalAmount;
    const nextStatus = input.markAsPaid ? MembershipStatus.ACTIVO : MembershipStatus.PENDIENTE_PAGO;

    await tx.membershipContractBillingProfile.upsert({
      where: { contractId: id },
      update: {
        provider: provider === "RECURRENT" ? "RECURRENT" : "MANUAL",
        status: input.markAsPaid ? "ACTIVE" : "PAST_DUE",
        updatedAt: now()
      },
      create: {
        contractId: id,
        provider: provider === "RECURRENT" ? "RECURRENT" : "MANUAL",
        status: input.markAsPaid ? "ACTIVE" : "PAST_DUE",
        createdAt: now(),
        updatedAt: now()
      }
    });

    const updated = await tx.membershipContract.update({
      where: { id },
      data: {
        nextRenewAt,
        balance: new Prisma.Decimal(nextBalance),
        status: nextStatus,
        updatedAt: now()
      },
      include: {
        ClientProfile: true,
        MembershipPlan: {
          include: {
            MembershipPlanCategory: true
          }
        },
        MembershipPayment: {
          orderBy: { createdAt: "desc" },
          take: 5
        }
      }
    });

    return serializeContract(updated);
  });
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
    const nextStatus =
      contract.status === MembershipStatus.PENDIENTE_PAGO && nextBalance <= 0
        ? MembershipStatus.ACTIVO
        : contract.status;
    await prisma.membershipContract.update({
      where: { id: contractId },
      data: {
        balance: new Prisma.Decimal(nextBalance),
        status: nextStatus,
        updatedAt: now()
      }
    });
    await prisma.membershipContractBillingProfile
      .upsert({
        where: { contractId },
        update: {
          status: "ACTIVE",
          updatedAt: now()
        },
        create: {
          contractId,
          provider: inferPaymentMethod(contract.channel) === "RECURRENT" ? "RECURRENT" : "MANUAL",
          status: "ACTIVE",
          createdAt: now(),
          updatedAt: now()
        }
      })
      .catch(() => null);
  }

  return serializePayment(payment);
}

// Compat API for legacy route: /api/membresias/contratos/[id]/pago
export async function registerPayment(_prismaLike: any, contractId: string, rawInput: unknown) {
  const payload = registerPaymentSchema.parse(rawInput);
  return registerContractPayment(contractId, payload, null);
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
        invoiceUrl: buildMembershipInvoiceLink({ contractId: row.id }),
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
      hidePricesForOperators: true,
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
        status: { in: [MembershipStatus.ACTIVO, MembershipStatus.PENDIENTE, MembershipStatus.PENDIENTE_PAGO] },
        nextRenewAt: { gte: today, lte: in7 }
      }
    }),
    prisma.membershipContract.count({
      where: {
        ...contractScope,
        status: { in: [MembershipStatus.ACTIVO, MembershipStatus.PENDIENTE, MembershipStatus.PENDIENTE_PAGO] },
        nextRenewAt: { gte: today, lte: in15 }
      }
    }),
    prisma.membershipContract.count({
      where: {
        ...contractScope,
        status: { in: [MembershipStatus.ACTIVO, MembershipStatus.PENDIENTE, MembershipStatus.PENDIENTE_PAGO] },
        nextRenewAt: { gte: today, lte: in30 }
      }
    }),
    prisma.membershipContract.count({
      where: {
        ...contractScope,
        status: {
          in: [MembershipStatus.PENDIENTE, MembershipStatus.PENDIENTE_PAGO, MembershipStatus.SUSPENDIDO, MembershipStatus.VENCIDO]
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

function maskSecret(value: string | null | undefined) {
  if (!value) return null;
  if (value.length <= 6) return "***";
  return `${value.slice(0, 4)}***${value.slice(-2)}`;
}

async function ensureMembershipGatewayConfigRecord() {
  return prisma.membershipGatewayConfig.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      provider: "RECURRENT",
      mode: "test",
      isEnabled: false,
      createdAt: now(),
      updatedAt: now()
    },
    update: {}
  });
}

export async function getMembershipGatewayConfig() {
  const config = await ensureMembershipGatewayConfigRecord();
  return {
    id: config.id,
    provider: config.provider,
    mode: config.mode,
    isEnabled: config.isEnabled,
    lastWebhookAt: config.lastWebhookAt,
    hasApiKey: Boolean(config.apiKey),
    hasWebhookSecret: Boolean(config.webhookSecret),
    apiKeyMasked: maskSecret(config.apiKey),
    webhookSecretMasked: maskSecret(config.webhookSecret)
  };
}

export async function updateMembershipGatewayConfig(input: MembershipGatewayConfigInput) {
  const current = await ensureMembershipGatewayConfigRecord();
  const updated = await prisma.membershipGatewayConfig.update({
    where: { id: current.id },
    data: {
      provider: input.provider,
      mode: input.mode,
      isEnabled: input.isEnabled,
      ...(input.apiKey !== undefined ? { apiKey: input.apiKey } : {}),
      ...(input.webhookSecret !== undefined ? { webhookSecret: input.webhookSecret } : {}),
      updatedAt: now()
    }
  });

  return {
    id: updated.id,
    provider: updated.provider,
    mode: updated.mode,
    isEnabled: updated.isEnabled,
    lastWebhookAt: updated.lastWebhookAt,
    hasApiKey: Boolean(updated.apiKey),
    hasWebhookSecret: Boolean(updated.webhookSecret),
    apiKeyMasked: maskSecret(updated.apiKey),
    webhookSecretMasked: maskSecret(updated.webhookSecret)
  };
}

export async function initContractRecurrentCheckout(contractId: string, input: ContractCheckoutInitInput, user: SessionUser | null) {
  const [contract, gatewayConfig] = await Promise.all([
    prisma.membershipContract.findUnique({
      where: { id: contractId },
      include: {
        MembershipPlan: true
      }
    }),
    ensureMembershipGatewayConfigRecord()
  ]);

  if (!contract) throw new MembershipError("Contrato no encontrado", 404);
  ensureSameBranchOrAdmin(user, contract);

  if (!gatewayConfig.isEnabled) throw new MembershipError("Pasarela recurrente deshabilitada", 409);
  if (!gatewayConfig.apiKey) throw new MembershipError("Configura API key de pasarela antes de iniciar checkout", 400);

  const customerRef = `mbr-cus-${contract.ownerId || contract.id}`;
  const subscriptionRef = `mbr-sub-${contract.id}`;
  const checkoutToken = `chk_${contract.id}_${Date.now()}`;
  const checkoutBase = process.env.RECURRENTE_CHECKOUT_BASE_URL || "https://checkout.recurrente.example/subscribe";
  const checkoutUrl = new URL(checkoutBase);
  checkoutUrl.searchParams.set("contractId", contract.id);
  checkoutUrl.searchParams.set("customerRef", customerRef);
  checkoutUrl.searchParams.set("subscriptionRef", subscriptionRef);
  checkoutUrl.searchParams.set("sessionToken", checkoutToken);
  if (input.returnUrl) checkoutUrl.searchParams.set("returnUrl", input.returnUrl);
  if (input.cancelUrl) checkoutUrl.searchParams.set("cancelUrl", input.cancelUrl);

  const profile = await prisma.membershipContractBillingProfile.upsert({
    where: { contractId },
    update: {
      provider: "RECURRENT",
      recurrenteCustomerId: customerRef,
      recurrenteSubscriptionId: subscriptionRef,
      lastPaymentIntentId: checkoutToken,
      status: "PENDING_CHECKOUT",
      updatedAt: now()
    },
    create: {
      contractId,
      provider: "RECURRENT",
      recurrenteCustomerId: customerRef,
      recurrenteSubscriptionId: subscriptionRef,
      lastPaymentIntentId: checkoutToken,
      status: "PENDING_CHECKOUT",
      createdAt: now(),
      updatedAt: now()
    }
  });

  await prisma.membershipContract.update({
    where: { id: contractId },
    data: {
      channel: "RECURRENT_CHECKOUT",
      updatedAt: now()
    }
  });

  return {
    contractId,
    provider: gatewayConfig.provider,
    checkoutUrl: checkoutUrl.toString(),
    billingProfileId: profile.id
  };
}

export function verifyRecurrenteWebhookTokenOrHmac(req: Request, bodyText: string, secret?: string | null) {
  const tokenHeader = req.headers.get("x-webhook-token");
  const staticToken = process.env.RECURRENTE_WEBHOOK_TOKEN;
  if (staticToken && tokenHeader && tokenHeader === staticToken) return true;

  const signatureHeader = req.headers.get("x-recurrente-signature");
  const hmacSecret = secret || process.env.RECURRENTE_WEBHOOK_SECRET;
  if (!hmacSecret || !signatureHeader) return false;

  const expected = createHmac("sha256", hmacSecret).update(bodyText).digest("hex");
  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(signatureHeader, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function extractRecurrenteContractId(payload: RecurrenteWebhookInput) {
  const object = (payload as any)?.data?.object || {};
  return object.contractId || object?.metadata?.contractId || object?.referenceContractId || null;
}

function extractRecurrenteAmount(
  payload: RecurrenteWebhookInput,
  contract: {
    billingFrequency: MembershipBillingFrequency;
    priceLockedMonthly: Prisma.Decimal | null;
    priceLockedAnnual: Prisma.Decimal | null;
    MembershipPlan?: { priceMonthly: Prisma.Decimal; priceAnnual: Prisma.Decimal } | null;
  }
) {
  const object = (payload as any)?.data?.object || {};
  const direct = Number(object.amount ?? object.amount_total ?? object.total ?? object.amountPaid ?? 0);
  if (Number.isFinite(direct) && direct > 0) return direct;
  return computeRenewalAmount(contract);
}

export async function processRecurrenteWebhook(payload: RecurrenteWebhookInput, signature?: string | null) {
  const existing = await prisma.membershipWebhookEvent.findUnique({ where: { eventId: payload.id } });
  if (existing) {
    return { idempotent: true, eventId: payload.id, status: existing.status };
  }

  const contractId = extractRecurrenteContractId(payload);
  const eventType = String(payload.type || "unknown");

  await prisma.membershipWebhookEvent.create({
    data: {
      provider: "RECURRENT",
      eventId: payload.id,
      eventType,
      signature: signature || null,
      contractId: contractId || null,
      payload: payload as Prisma.InputJsonValue,
      status: "RECEIVED",
      createdAt: now(),
      updatedAt: now()
    }
  });

  const normalizedType = eventType.toLowerCase();
  const contract = contractId
    ? await prisma.membershipContract.findUnique({
        where: { id: contractId },
        include: {
          MembershipPlan: true,
          MembershipContractBillingProfile: true,
          ClientProfile: true
        }
      })
    : null;

  if (!contract) {
    await prisma.membershipWebhookEvent.update({
      where: { eventId: payload.id },
      data: {
        status: "IGNORED",
        processedAt: now(),
        updatedAt: now()
      }
    });
    await prisma.membershipGatewayConfig
      .update({
        where: { id: 1 },
        data: {
          lastWebhookAt: now(),
          updatedAt: now()
        }
      })
      .catch(() => null);
    return { idempotent: false, eventId: payload.id, status: "IGNORED" };
  }

  if (normalizedType === "payment_intent.succeeded") {
    const amount = extractRecurrenteAmount(payload, contract);
    const currentBalance = decimalToNumberOrZero(contract.balance);
    const nextBalance = Math.max(0, currentBalance - amount);
    const baseRenewDate = contract.nextRenewAt && contract.nextRenewAt > now() ? contract.nextRenewAt : now();
    const nextRenewAt = computeRenewDate(baseRenewDate, contract.billingFrequency);

    const object = (payload as any)?.data?.object || {};
    const paymentIntentId = String(object.payment_intent_id || object.paymentIntentId || payload.id);

    await prisma.$transaction(async (tx) => {
      await tx.membershipPayment.create({
        data: {
          contractId: contract.id,
          amount: new Prisma.Decimal(amount),
          method: "CARD",
          kind: "RENEWAL",
          status: "PAID",
          paidAt: now(),
          refNo: paymentIntentId,
          invoiceId: object.invoiceId || null,
          notes: `Webhook RECURRENT ${eventType}`,
          createdAt: now()
        }
      });

      await tx.membershipContractBillingProfile.upsert({
        where: { contractId: contract.id },
        update: {
          provider: "RECURRENT",
          recurrenteCustomerId: object.customerId || contract.MembershipContractBillingProfile?.recurrenteCustomerId || null,
          recurrenteSubscriptionId:
            object.subscriptionId || contract.MembershipContractBillingProfile?.recurrenteSubscriptionId || null,
          lastPaymentIntentId: paymentIntentId,
          status: "ACTIVE",
          updatedAt: now()
        },
        create: {
          contractId: contract.id,
          provider: "RECURRENT",
          recurrenteCustomerId: object.customerId || null,
          recurrenteSubscriptionId: object.subscriptionId || null,
          lastPaymentIntentId: paymentIntentId,
          status: "ACTIVE",
          createdAt: now(),
          updatedAt: now()
        }
      });

      await tx.membershipContract.update({
        where: { id: contract.id },
        data: {
          status: MembershipStatus.ACTIVO,
          balance: new Prisma.Decimal(nextBalance),
          nextRenewAt,
          channel: "RECURRENT_WEBHOOK",
          updatedAt: now()
        }
      });
    });

    const partyId = contract.ClientProfile?.partyId || null;
    let receivable = null;
    if (partyId) {
      receivable = await createReceivableDraftForMembership({
        contractId: contract.id,
        contractCode: contract.code,
        partyId,
        amount: new Prisma.Decimal(amount)
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
    }

    await prisma.membershipWebhookEvent.update({
      where: { eventId: payload.id },
      data: {
        status: "PROCESSED",
        processedAt: now(),
        updatedAt: now(),
        contractId: contract.id
      }
    });
    await prisma.membershipGatewayConfig
      .update({
        where: { id: 1 },
        data: {
          lastWebhookAt: now(),
          updatedAt: now()
        }
      })
      .catch(() => null);

    return {
      idempotent: false,
      eventId: payload.id,
      status: "PROCESSED",
      contractId: contract.id,
      invoiceId: receivable?.id || null
    };
  }

  if (normalizedType === "payment_intent.failed" || normalizedType === "subscription.past_due") {
    await prisma.$transaction(async (tx) => {
      await tx.membershipContractBillingProfile.upsert({
        where: { contractId: contract.id },
        update: {
          provider: "RECURRENT",
          status: "PAST_DUE",
          updatedAt: now()
        },
        create: {
          contractId: contract.id,
          provider: "RECURRENT",
          status: "PAST_DUE",
          createdAt: now(),
          updatedAt: now()
        }
      });

      await tx.membershipContract.update({
        where: { id: contract.id },
        data: {
          status: MembershipStatus.PENDIENTE_PAGO,
          updatedAt: now()
        }
      });
    });

    await prisma.membershipWebhookEvent.update({
      where: { eventId: payload.id },
      data: {
        status: "PROCESSED",
        processedAt: now(),
        updatedAt: now(),
        contractId: contract.id
      }
    });
    await prisma.membershipGatewayConfig
      .update({
        where: { id: 1 },
        data: {
          lastWebhookAt: now(),
          updatedAt: now()
        }
      })
      .catch(() => null);

    return { idempotent: false, eventId: payload.id, status: "PROCESSED", contractId: contract.id };
  }

  if (normalizedType === "subscription.cancel") {
    await prisma.$transaction(async (tx) => {
      await tx.membershipContractBillingProfile.upsert({
        where: { contractId: contract.id },
        update: {
          provider: "RECURRENT",
          status: "CANCELLED",
          updatedAt: now()
        },
        create: {
          contractId: contract.id,
          provider: "RECURRENT",
          status: "CANCELLED",
          createdAt: now(),
          updatedAt: now()
        }
      });

      await tx.membershipContract.update({
        where: { id: contract.id },
        data: {
          status: MembershipStatus.CANCELADO,
          updatedAt: now()
        }
      });
    });

    await prisma.membershipWebhookEvent.update({
      where: { eventId: payload.id },
      data: {
        status: "PROCESSED",
        processedAt: now(),
        updatedAt: now(),
        contractId: contract.id
      }
    });
    await prisma.membershipGatewayConfig
      .update({
        where: { id: 1 },
        data: {
          lastWebhookAt: now(),
          updatedAt: now()
        }
      })
      .catch(() => null);

    return { idempotent: false, eventId: payload.id, status: "PROCESSED", contractId: contract.id };
  }

  await prisma.membershipWebhookEvent.update({
    where: { eventId: payload.id },
    data: {
      status: "IGNORED",
      processedAt: now(),
      updatedAt: now(),
      contractId: contract.id
    }
  });
  await prisma.membershipGatewayConfig
    .update({
      where: { id: 1 },
      data: {
        lastWebhookAt: now(),
        updatedAt: now()
      }
    })
    .catch(() => null);

  return { idempotent: false, eventId: payload.id, status: "IGNORED", contractId: contract.id };
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

  await prisma.membershipContractBillingProfile.upsert({
    where: { contractId: contract.id },
    update: {
      provider: "MANUAL",
      status: "PENDING_SETUP",
      updatedAt: now()
    },
    create: {
      contractId: contract.id,
      provider: "MANUAL",
      status: "PENDING_SETUP",
      createdAt: now(),
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
      ? buildMembershipInvoiceLink({
          contractId: contract.id,
          basePath: "/admin/finanzas",
          params: { tab: "operacion", receivableId: receivable.id }
        })
      : buildMembershipInvoiceLink({ contractId: contract.id }),
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
