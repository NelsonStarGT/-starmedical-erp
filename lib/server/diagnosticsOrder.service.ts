import { DiagnosticOrderAdminStatus, DiagnosticOrderStatus, DiagnosticPaymentMethod, Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { normalizeRoleName } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { syncDiagnosticOrderToExecution } from "@/lib/server/syncToLabTest.service";

const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "SECRETARY"]);

function ensureAdminRole(user: SessionUser | null) {
  if (!user) throw { status: 401, message: "No autenticado" };
  const normalized = (user.roles || []).map(normalizeRoleName);
  const isAllowed = normalized.some((role) => ADMIN_ROLES.has(role));
  if (!isAllowed) throw { status: 403, message: "No autorizado" };
}

function ensureBranchAccess(user: SessionUser, order: { branchId: string | null }) {
  const normalized = (user.roles || []).map(normalizeRoleName);
  const isGlobalAdmin = normalized.includes("ADMIN") || normalized.includes("SUPER_ADMIN");
  if (isGlobalAdmin) return;
  if (user.branchId && order.branchId && user.branchId !== order.branchId) {
    throw { status: 403, message: "Sucursal no autorizada" };
  }
}

const ADMIN_TRANSITIONS: Record<DiagnosticOrderAdminStatus, DiagnosticOrderAdminStatus[]> = {
  DRAFT: ["DRAFT", "PENDING_PAYMENT", "PAID", "INSURANCE_AUTH", "CANCELLED"],
  PENDING_PAYMENT: ["PENDING_PAYMENT", "PAID", "INSURANCE_AUTH", "CANCELLED"],
  INSURANCE_AUTH: ["INSURANCE_AUTH", "PAID", "CANCELLED"],
  PAID: ["PAID"],
  SENT_TO_EXECUTION: ["SENT_TO_EXECUTION"],
  COMPLETED: ["COMPLETED"],
  CANCELLED: ["CANCELLED"]
};

export async function updateDiagnosticOrderAdminStatus(params: {
  orderId: string;
  adminStatus: DiagnosticOrderAdminStatus;
  paymentMethod?: DiagnosticPaymentMethod;
  paymentReference?: string;
  insuranceId?: string;
  user: SessionUser | null;
}) {
  ensureAdminRole(params.user);

  const { orderId, adminStatus, paymentMethod, paymentReference, insuranceId, user } = params;

  return prisma.$transaction(async (tx) => {
    const order = await tx.diagnosticOrder.findUnique({
      where: { id: orderId },
      select: { id: true, adminStatus: true, status: true, paymentMethod: true, branchId: true }
    });
    if (!order) throw { status: 404, message: "Orden no encontrada" };
    ensureBranchAccess(user!, { branchId: order.branchId || null });

    const allowed = ADMIN_TRANSITIONS[order.adminStatus] || [];
    if (!allowed.includes(adminStatus)) {
      throw { status: 409, message: "Transición administrativa no permitida" };
    }

    if (adminStatus === DiagnosticOrderAdminStatus.PAID) {
      const method = paymentMethod || order.paymentMethod;
      if (!method) throw { status: 400, message: "Método de pago requerido" };
    }

    if (adminStatus === DiagnosticOrderAdminStatus.INSURANCE_AUTH && paymentMethod && paymentMethod !== "INSURANCE") {
      throw { status: 400, message: "Método inválido para autorización" };
    }

    const now = new Date();
    const data: Prisma.DiagnosticOrderUpdateInput = {
      adminStatus,
      paymentMethod: paymentMethod ?? undefined,
      paymentReference: paymentReference !== undefined ? paymentReference || null : undefined,
      insuranceId: insuranceId !== undefined ? insuranceId || null : undefined
    };

    if (adminStatus === DiagnosticOrderAdminStatus.PAID) {
      data.paidAt = now;
      data.paymentMethod = paymentMethod || order.paymentMethod || DiagnosticPaymentMethod.CASH;
      if (order.adminStatus === DiagnosticOrderAdminStatus.INSURANCE_AUTH) {
        data.authorizedAt = now;
        data.authorizedByUserId = user?.id || null;
      }
      if (order.status === DiagnosticOrderStatus.DRAFT) {
        data.status = DiagnosticOrderStatus.PAID;
      }
    }

    if (adminStatus === DiagnosticOrderAdminStatus.INSURANCE_AUTH) {
      data.paymentMethod = DiagnosticPaymentMethod.INSURANCE;
    }

    if (adminStatus === DiagnosticOrderAdminStatus.CANCELLED) {
      data.status = DiagnosticOrderStatus.CANCELLED;
    }

    const updated = await tx.diagnosticOrder.update({ where: { id: orderId }, data });
    return updated;
  });
}

export async function sendDiagnosticOrderToExecution(params: { orderId: string; user: SessionUser | null }) {
  ensureAdminRole(params.user);

  return prisma.$transaction(async (tx) => {
    const order = await tx.diagnosticOrder.findUnique({
      where: { id: params.orderId },
      include: { items: { include: { catalogItem: true } }, patient: true }
    });
    if (!order) throw { status: 404, message: "Orden no encontrada" };
    ensureBranchAccess(params.user!, { branchId: order.branchId || null });

    if (order.adminStatus !== DiagnosticOrderAdminStatus.PAID) {
      throw { status: 409, message: "Orden no está pagada" };
    }

    await syncDiagnosticOrderToExecution(tx, order, params.user?.id || null);

    const updated = await tx.diagnosticOrder.update({
      where: { id: order.id },
      data: { adminStatus: DiagnosticOrderAdminStatus.SENT_TO_EXECUTION }
    });

    return updated;
  });
}
