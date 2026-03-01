import {
  PharmacyRegimenFrequency,
  PharmacySubscriptionStatus,
  Prisma,
  type PharmacyReminderEventType
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";
import {
  createDiscountPlanSchema,
  createDiscountSubscriptionSchema,
  createMedicationEventSchema,
  createMedicationSubscriptionSchema,
  listDiscountPlansQuerySchema,
  listDiscountSubscriptionsQuerySchema,
  listMedicationSubscriptionsQuerySchema,
  listQueueQuerySchema,
  pharmacyConfigSchema,
  updateMedicationSubscriptionStatusSchema
} from "@/lib/subscriptions/pharmacy/schemas";
import { z } from "zod";

export class PharmacySubscriptionError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "PharmacySubscriptionError";
    this.status = status;
  }
}

type ListMedicationSubscriptionsInput = z.infer<typeof listMedicationSubscriptionsQuerySchema>;
type CreateMedicationSubscriptionInput = z.infer<typeof createMedicationSubscriptionSchema>;
type UpdateMedicationSubscriptionStatusInput = z.infer<typeof updateMedicationSubscriptionStatusSchema>;
type CreateMedicationEventInput = z.infer<typeof createMedicationEventSchema>;
type ListQueueInput = z.infer<typeof listQueueQuerySchema>;
type PharmacyConfigInput = z.infer<typeof pharmacyConfigSchema>;
type ListDiscountPlansInput = z.infer<typeof listDiscountPlansQuerySchema>;
type CreateDiscountPlanInput = z.infer<typeof createDiscountPlanSchema>;
type ListDiscountSubscriptionsInput = z.infer<typeof listDiscountSubscriptionsQuerySchema>;
type CreateDiscountSubscriptionInput = z.infer<typeof createDiscountSubscriptionSchema>;

function resolveFeatureFlagBoolean(raw: string | undefined): boolean | null {
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return null;
}

function resolveScopedBranch(inputBranchId: string | null | undefined, user: SessionUser | null) {
  if (user?.branchId && inputBranchId && inputBranchId !== user.branchId) {
    throw new PharmacySubscriptionError("No autorizado para operar en otra sucursal", 403);
  }

  if (inputBranchId !== undefined) {
    return inputBranchId;
  }

  return user?.branchId ?? null;
}

function assertBranchAccess(user: SessionUser | null, branchId: string | null) {
  if (!user?.branchId) return;
  if (!branchId) return;
  if (user.branchId !== branchId) {
    throw new PharmacySubscriptionError("Registro fuera del alcance de sucursal", 404);
  }
}

function branchScopedWhere(user: SessionUser | null): Prisma.PharmacyMedicationSubscriptionWhereInput {
  if (!user?.branchId) return {};
  return { OR: [{ branchId: user.branchId }, { branchId: null }] };
}

function branchScopedDiscountWhere(user: SessionUser | null): Prisma.PharmacyDiscountSubscriptionWhereInput {
  if (!user?.branchId) return {};
  return { OR: [{ branchId: user.branchId }, { branchId: null }] };
}

function frequencyToDays(frequency: PharmacyRegimenFrequency, customDays?: number | null) {
  if (frequency === PharmacyRegimenFrequency.WEEKLY) return 7;
  if (frequency === PharmacyRegimenFrequency.BIWEEKLY) return 14;
  if (frequency === PharmacyRegimenFrequency.MONTHLY) return 30;
  if (frequency === PharmacyRegimenFrequency.CUSTOM_DAYS && customDays && customDays > 0) return customDays;
  return 30;
}

function computeNextFillAt(base: Date, frequency: PharmacyRegimenFrequency, customDays?: number | null) {
  const next = new Date(base);
  const days = frequencyToDays(frequency, customDays);
  next.setDate(next.getDate() + days);
  return next;
}

function mapMedicationSubscription(
  row: Prisma.PharmacyMedicationSubscriptionGetPayload<{
    include: {
      items: true;
      events: {
        orderBy: { happenedAt: "desc" };
        take: 10;
      };
    };
  }>
) {
  return {
    id: row.id,
    patientId: row.patientId,
    branchId: row.branchId,
    frequency: row.frequency,
    customDays: row.customDays,
    nextFillAt: row.nextFillAt,
    lastFillAt: row.lastFillAt,
    deliveryMethod: row.deliveryMethod,
    contactPreference: row.contactPreference,
    status: row.status,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    items: row.items.map((item) => ({
      id: item.id,
      medicationId: item.medicationId,
      qty: Number(item.qty),
      instructions: item.instructions
    })),
    events: row.events.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      notes: event.notes,
      happenedAt: event.happenedAt,
      createdAt: event.createdAt
    }))
  };
}

function queueEventFlags(events: Array<{ eventType: PharmacyReminderEventType }>) {
  return {
    prepared: events.some((event) => event.eventType === "PREPARED"),
    contacted: events.some((event) => event.eventType === "CONTACTED"),
    delivered: events.some((event) => event.eventType === "DELIVERED"),
    pickupReady: events.some((event) => event.eventType === "PICKUP_READY"),
    billingLinked: events.some((event) => event.eventType === "BILLING_LINK")
  };
}

async function getOrCreateConfig() {
  return prisma.pharmacySubscriptionConfig.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 }
  });
}

export async function getPharmacyConfig() {
  const config = await getOrCreateConfig();
  const envDiscount = resolveFeatureFlagBoolean(process.env.SUBSCRIPTIONS_PHARMACY_DISCOUNT_ENABLED);

  return {
    ...config,
    discountEnabled: envDiscount === null ? config.discountEnabled : envDiscount,
    discountSource: envDiscount === null ? "DB" : "ENV"
  };
}

export async function updatePharmacyConfig(input: PharmacyConfigInput) {
  const data = pharmacyConfigSchema.parse(input);

  return prisma.pharmacySubscriptionConfig.upsert({
    where: { id: 1 },
    update: data,
    create: {
      id: 1,
      ...data
    }
  });
}

export async function listMedicationSubscriptions(input: ListMedicationSubscriptionsInput, user: SessionUser | null) {
  const payload = listMedicationSubscriptionsQuerySchema.parse(input);
  const where: Prisma.PharmacyMedicationSubscriptionWhereInput = {
    ...branchScopedWhere(user)
  };

  if (payload.status) where.status = payload.status;
  if (payload.patientId) where.patientId = { contains: payload.patientId, mode: "insensitive" };
  if (payload.branchId) where.branchId = resolveScopedBranch(payload.branchId, user);

  if (payload.dueInDays !== undefined) {
    const now = new Date();
    const horizon = new Date(now);
    horizon.setDate(horizon.getDate() + payload.dueInDays);
    where.nextFillAt = { lte: horizon };
  }

  const rows = await prisma.pharmacyMedicationSubscription.findMany({
    where,
    orderBy: [{ nextFillAt: "asc" }, { createdAt: "desc" }],
    take: payload.take,
    include: {
      items: true,
      events: {
        orderBy: { happenedAt: "desc" },
        take: 10
      }
    }
  });

  return rows.map(mapMedicationSubscription);
}

export async function createMedicationSubscription(input: CreateMedicationSubscriptionInput, user: SessionUser | null) {
  const payload = createMedicationSubscriptionSchema.parse(input);
  const branchId = resolveScopedBranch(payload.branchId, user);

  const created = await prisma.pharmacyMedicationSubscription.create({
    data: {
      patientId: payload.patientId,
      branchId,
      frequency: payload.frequency,
      customDays: payload.customDays ?? null,
      nextFillAt: payload.nextFillAt,
      deliveryMethod: payload.deliveryMethod,
      contactPreference: payload.contactPreference,
      notes: payload.notes ?? null,
      items: {
        create: payload.items.map((item) => ({
          medicationId: item.medicationId,
          qty: new Prisma.Decimal(item.qty),
          instructions: item.instructions ?? null
        }))
      }
    },
    include: {
      items: true,
      events: {
        orderBy: { happenedAt: "desc" },
        take: 10
      }
    }
  });

  return mapMedicationSubscription(created);
}

export async function updateMedicationSubscriptionStatus(id: string, input: UpdateMedicationSubscriptionStatusInput, user: SessionUser | null) {
  const payload = updateMedicationSubscriptionStatusSchema.parse(input);
  const current = await prisma.pharmacyMedicationSubscription.findUnique({ where: { id } });
  if (!current) throw new PharmacySubscriptionError("Suscripción no encontrada", 404);
  assertBranchAccess(user, current.branchId);

  const updated = await prisma.pharmacyMedicationSubscription.update({
    where: { id },
    data: {
      status: payload.status,
      notes: payload.notes ?? current.notes
    },
    include: {
      items: true,
      events: {
        orderBy: { happenedAt: "desc" },
        take: 10
      }
    }
  });

  return mapMedicationSubscription(updated);
}

export async function createMedicationSubscriptionEvent(id: string, input: CreateMedicationEventInput, user: SessionUser | null) {
  const payload = createMedicationEventSchema.parse(input);
  const happenedAt = payload.happenedAt ?? new Date();

  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.pharmacyMedicationSubscription.findUnique({
      where: { id },
      include: {
        items: true,
        events: {
          orderBy: { happenedAt: "desc" },
          take: 10
        }
      }
    });

    if (!current) throw new PharmacySubscriptionError("Suscripción no encontrada", 404);
    assertBranchAccess(user, current.branchId);

    if (current.status === PharmacySubscriptionStatus.CANCELLED) {
      throw new PharmacySubscriptionError("No se pueden registrar eventos para suscripciones canceladas", 409);
    }

    await tx.pharmacyReminderEvent.create({
      data: {
        subscriptionId: id,
        eventType: payload.eventType,
        notes: payload.notes ?? null,
        happenedAt
      }
    });

    let patch: Prisma.PharmacyMedicationSubscriptionUpdateInput = {};
    if (payload.eventType === "DELIVERED") {
      patch = {
        lastFillAt: happenedAt,
        nextFillAt: computeNextFillAt(happenedAt, current.frequency, current.customDays),
        status: PharmacySubscriptionStatus.ACTIVE
      };
    }

    const updated = await tx.pharmacyMedicationSubscription.update({
      where: { id },
      data: patch,
      include: {
        items: true,
        events: {
          orderBy: { happenedAt: "desc" },
          take: 10
        }
      }
    });

    return updated;
  });

  return mapMedicationSubscription(result);
}

export async function listPharmacyQueue(input: ListQueueInput, user: SessionUser | null) {
  const payload = listQueueQuerySchema.parse(input);
  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + payload.windowDays);

  const rows = await prisma.pharmacyMedicationSubscription.findMany({
    where: {
      ...branchScopedWhere(user),
      status: PharmacySubscriptionStatus.ACTIVE,
      nextFillAt: {
        gte: now,
        lte: horizon
      }
    },
    orderBy: [{ nextFillAt: "asc" }, { createdAt: "desc" }],
    include: {
      items: true,
      events: {
        orderBy: { happenedAt: "desc" },
        take: 30
      }
    }
  });

  return rows.map((row) => {
    const mapped = mapMedicationSubscription(row);
    const diffMs = new Date(mapped.nextFillAt).getTime() - now.getTime();
    const daysUntilNextFill = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return {
      ...mapped,
      daysUntilNextFill,
      queueFlags: queueEventFlags(mapped.events)
    };
  });
}

export async function listDiscountPlans(input: ListDiscountPlansInput) {
  const payload = listDiscountPlansQuerySchema.parse(input);

  const rows = await prisma.pharmacyDiscountSubscriptionPlan.findMany({
    where: payload.includeInactive ? {} : { isActive: true },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    take: payload.take
  });

  return rows.map((row) => ({
    ...row,
    percentage: Number(row.percentage)
  }));
}

export async function createDiscountPlan(input: CreateDiscountPlanInput) {
  const payload = createDiscountPlanSchema.parse(input);

  const created = await prisma.pharmacyDiscountSubscriptionPlan.create({
    data: {
      name: payload.name,
      percentage: new Prisma.Decimal(payload.percentage),
      startsAt: payload.startsAt ?? null,
      endsAt: payload.endsAt ?? null,
      isActive: payload.isActive,
      rules: payload.rules ?? undefined
    }
  });

  return {
    ...created,
    percentage: Number(created.percentage)
  };
}

export async function listDiscountSubscriptions(input: ListDiscountSubscriptionsInput, user: SessionUser | null) {
  const payload = listDiscountSubscriptionsQuerySchema.parse(input);

  const where: Prisma.PharmacyDiscountSubscriptionWhereInput = {
    ...branchScopedDiscountWhere(user)
  };

  if (payload.status) where.status = payload.status;
  if (payload.patientId) where.patientId = { contains: payload.patientId, mode: "insensitive" };
  if (payload.branchId) where.branchId = resolveScopedBranch(payload.branchId, user);

  const rows = await prisma.pharmacyDiscountSubscription.findMany({
    where,
    orderBy: [{ startedAt: "desc" }, { createdAt: "desc" }],
    take: payload.take,
    include: {
      plan: true
    }
  });

  return rows.map((row) => ({
    ...row,
    plan: {
      ...row.plan,
      percentage: Number(row.plan.percentage)
    }
  }));
}

export async function createDiscountSubscription(input: CreateDiscountSubscriptionInput, user: SessionUser | null) {
  const config = await getPharmacyConfig();
  if (!config.discountEnabled) {
    throw new PharmacySubscriptionError("Suscripción de descuento deshabilitada (feature flag)", 409);
  }

  const payload = createDiscountSubscriptionSchema.parse(input);
  const branchId = resolveScopedBranch(payload.branchId, user);

  const plan = await prisma.pharmacyDiscountSubscriptionPlan.findUnique({ where: { id: payload.planId } });
  if (!plan || !plan.isActive) {
    throw new PharmacySubscriptionError("Plan de descuento no disponible", 404);
  }

  return prisma.pharmacyDiscountSubscription.create({
    data: {
      planId: payload.planId,
      patientId: payload.patientId ?? null,
      clientId: payload.clientId ?? null,
      branchId,
      startedAt: payload.startedAt ?? new Date()
    },
    include: {
      plan: true
    }
  });
}
