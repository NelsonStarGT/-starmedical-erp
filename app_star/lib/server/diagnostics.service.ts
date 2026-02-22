import { cookies } from "next/headers";
import { DiagnosticOrderAdminStatus, DiagnosticOrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserFromCookies, type SessionUser } from "@/lib/auth";
import { isAdmin, requirePermission } from "@/lib/rbac";
import { serializeDiagnosticOrder } from "@/lib/diagnostics/service";
import { attachClinicalSummary } from "@/lib/server/diagnosticsClinical.service";

type OrderFilters = {
  status?: DiagnosticOrderStatus;
  adminStatus?: DiagnosticOrderAdminStatus;
  q?: string | null;
};

function ensureDiagRead(user: SessionUser | null) {
  const perm = requirePermission(user, "DIAG:READ");
  if (perm.errorResponse) {
    const err = new Error("No autorizado");
    (err as any).status = 403;
    throw err;
  }
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

export async function listOrders(filters: OrderFilters = {}) {
  const user = await getUserOrThrow();
  ensureDiagRead(user);

  const where: Prisma.DiagnosticOrderWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.adminStatus) where.adminStatus = filters.adminStatus;
  if (filters.q) {
    where.OR = [
      { patient: { firstName: { contains: filters.q, mode: "insensitive" } } },
      { patient: { lastName: { contains: filters.q, mode: "insensitive" } } },
      { patient: { dpi: { contains: filters.q, mode: "insensitive" } } },
      { patient: { nit: { contains: filters.q, mode: "insensitive" } } },
      { items: { some: { catalogItem: { name: { contains: filters.q, mode: "insensitive" } } } } },
      { items: { some: { catalogItem: { code: { contains: filters.q, mode: "insensitive" } } } } }
    ];
  }

  const orders = await prisma.diagnosticOrder.findMany({
    where,
    include: {
      patient: true,
      items: {
        include: {
          catalogItem: true,
          specimen: true,
          labResults: true,
          imagingStudy: { include: { reports: true } }
        }
      }
    },
    orderBy: { orderedAt: "desc" },
    take: 100
  });
  return attachClinicalSummary(orders);
}

export async function getOrderDetail(orderId: string) {
  const user = await getUserOrThrow();
  ensureDiagRead(user);

  const order = await prisma.diagnosticOrder.findUnique({
    where: { id: orderId },
    include: {
      patient: true,
      items: {
        include: {
          catalogItem: true,
          specimen: true,
          labResults: true,
          imagingStudy: { include: { reports: true } }
        }
      }
    }
  });
  if (!order) {
    const err: any = new Error("Orden no encontrada");
    err.status = 404;
    throw err;
  }

  if (!isAdmin(user) && user.branchId && order.branchId && user.branchId !== order.branchId) {
    const err: any = new Error("Sucursal no autorizada");
    err.status = 403;
    throw err;
  }

  const [withSummary] = await attachClinicalSummary([order]);
  return withSummary;
}

export async function listLabWorklist() {
  const user = await getUserOrThrow();
  ensureDiagRead(user);

  const orders = await prisma.diagnosticOrder.findMany({
    where: { items: { some: { kind: "LAB", status: { not: "CANCELLED" } } } },
    include: {
      patient: true,
      items: {
        where: { kind: "LAB", status: { not: "CANCELLED" } },
        include: {
          catalogItem: true,
          specimen: true,
          labResults: true,
          imagingStudy: { include: { reports: true } }
        }
      }
    },
    orderBy: { orderedAt: "desc" },
    take: 100
  });
  return orders.map(serializeDiagnosticOrder);
}

export async function listImagingWorklist(modality?: "XR" | "US" | "CT" | "MR") {
  const user = await getUserOrThrow();
  ensureDiagRead(user);

  const orders = await prisma.diagnosticOrder.findMany({
    where: {
      items: {
        some: {
          kind: "IMAGING",
          status: { not: "CANCELLED" },
          ...(modality ? { catalogItem: { modality } } : {})
        }
      }
    },
    include: {
      patient: true,
      items: {
        where: {
          kind: "IMAGING",
          status: { not: "CANCELLED" },
          ...(modality ? { catalogItem: { modality } } : {})
        },
        include: {
          catalogItem: true,
          specimen: true,
          labResults: true,
          imagingStudy: { include: { reports: true } }
        }
      }
    },
    orderBy: { orderedAt: "desc" },
    take: 100
  });
  return orders.map(serializeDiagnosticOrder);
}

export async function listCatalogItems(includeInactive = true) {
  const user = await getUserOrThrow();
  ensureDiagRead(user);

  const where = includeInactive ? undefined : { isActive: true };
  const items = await prisma.diagnosticCatalogItem.findMany({ where, orderBy: [{ kind: "asc" }, { name: "asc" }] });
  return items.map((item) => ({
    ...item,
    price: item.price ? Number(item.price) : null,
    refLow: item.refLow ? Number(item.refLow) : null,
    refHigh: item.refHigh ? Number(item.refHigh) : null,
    isActive: item.isActive
  }));
}
