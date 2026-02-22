import { cookies } from "next/headers";
import { Prisma, LabArea, LabTestStatus, LabTestPriority, LabRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserFromCookies, type SessionUser } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { serializeLabOrder } from "@/lib/labtest/transformers";
import { isMissingLabTableError } from "@/lib/labtest/dbGuard";
import { getLabRoleForUser } from "@/lib/labtest/access";

type RequirementFilters = {
  status?: LabTestStatus;
  priority?: LabTestPriority;
  area?: LabArea;
  fasting?: "required" | "confirmed" | "unconfirmed";
};

async function ensureLabRead(user: SessionUser | null): Promise<LabRole | null> {
  if (!user) {
    const err = new Error("No autenticado");
    (err as any).status = 401;
    throw err;
  }
  const roles = (user.roles || []).map((r) => r.toUpperCase());
  if (roles.includes("SUPER_ADMIN") || roles.includes("ADMIN")) return "LAB_ADMIN";
  const perm = requirePermission(user, "LABTEST:READ");
  // even if global perms fail, LabAccess is source of verdad
  const accessRole = await getLabRoleForUser(user.id, user.branchId);
  if (accessRole) return accessRole;
  if (perm.errorResponse) {
    const err = new Error("No autorizado");
    (err as any).status = 403;
    throw err;
  }
  return null;
}

async function getUserOrThrow() {
  const user = await getSessionUserFromCookies(cookies());
  if (!user) {
    const err = new Error("No autenticado");
    (err as any).status = 401;
    throw err;
  }
  return user;
}

export async function listRequirements(filters: RequirementFilters = {}) {
  const user = await getUserOrThrow();
  await ensureLabRead(user);

  const where: Prisma.LabTestOrderWhereInput = {};
  if (user.branchId) where.branchId = user.branchId;
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.area) where.OR = [{ areaHint: filters.area }, { items: { some: { area: filters.area } } }];
  if (filters.fasting === "required") where.fastingRequired = true;
  if (filters.fasting === "confirmed") where.fastingConfirmed = true;
  if (filters.fasting === "unconfirmed") {
    where.fastingRequired = true;
    where.fastingConfirmed = false;
  }

  try {
    const orders = await prisma.labTestOrder.findMany({
      where,
      include: {
        patient: true,
        labPatient: true,
        items: { select: { id: true, name: true, status: true, area: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return orders.map(serializeLabOrder);
  } catch (err) {
    if (isMissingLabTableError(err)) return [];
    throw err;
  }
}

export async function listSamples() {
  const user = await getUserOrThrow();
  await ensureLabRead(user);

  try {
    const samples = await prisma.labSample.findMany({
      where: user.branchId ? { order: { branchId: user.branchId } } : undefined,
      include: {
        order: { include: { patient: true, labPatient: true } },
        items: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    return samples;
  } catch (err) {
    if (isMissingLabTableError(err)) return [];
    throw err;
  }
}

export async function listWorkbench(area: LabArea) {
  const user = await getUserOrThrow();
  await ensureLabRead(user);

  try {
    const items = await prisma.labTestItem.findMany({
      where: {
        area,
        status: { in: ["QUEUED", "IN_PROCESS", "RESULT_CAPTURED"] },
        sampleId: { not: null },
        order: user.branchId ? { branchId: user.branchId } : undefined
      },
      include: {
        order: { include: { patient: true, labPatient: true } },
        sample: true,
        results: { orderBy: { createdAt: "desc" }, take: 1 }
      },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      take: 80
    });
    return items.map((item) => ({
      ...item,
      order: serializeLabOrder(item.order)
    }));
  } catch (err) {
    if (isMissingLabTableError(err)) return [];
    throw err;
  }
}

export async function listResultsBandeja() {
  const user = await getUserOrThrow();
  await ensureLabRead(user);

  try {
    const items = await prisma.labTestItem.findMany({
      where: {
        status: { in: ["RESULT_CAPTURED", "TECH_VALIDATED", "RELEASED", "SENT"] },
        order: user.branchId ? { branchId: user.branchId } : undefined
      },
      include: {
        order: { include: { patient: true, labPatient: true } },
        sample: true,
        results: { orderBy: { createdAt: "desc" }, take: 1 }
      },
      orderBy: { updatedAt: "desc" },
      take: 100
    });

    return items.map((item) => ({
      ...item,
      order: serializeLabOrder(item.order)
    }));
  } catch (err) {
    if (isMissingLabTableError(err)) return [];
    throw err;
  }
}

export async function listTemplates(area?: LabArea) {
  const user = await getUserOrThrow();
  await ensureLabRead(user);

  const where = area ? { area } : undefined;
  try {
    const templates = await prisma.labTemplate.findMany({ where, orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }] });
    return templates;
  } catch (err) {
    if (isMissingLabTableError(err)) return [];
    throw err;
  }
}
