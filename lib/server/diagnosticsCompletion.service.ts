import { DiagnosticOrderAdminStatus } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { normalizeRoleName } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { buildClinicalSummaryFromOrder, getLabCountByOrderIds, isClinicalComplete } from "@/lib/server/diagnosticsClinical.service";

function canAccessBranch(user: SessionUser | null, branchId: string | null) {
  if (!user) return true;
  const roles = (user.roles || []).map(normalizeRoleName);
  const isAdmin = roles.includes("ADMIN") || roles.includes("SUPER_ADMIN");
  if (isAdmin) return true;
  if (!branchId || !user.branchId) return false;
  return branchId === user.branchId;
}

export async function syncDiagnosticOrderCompletion(orderId: string, user?: SessionUser | null, req?: Request) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.diagnosticOrder.findUnique({
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

    if (!order) return { updated: false, reason: "NOT_FOUND" };
    if (order.adminStatus === DiagnosticOrderAdminStatus.COMPLETED) return { updated: false, reason: "ALREADY_COMPLETED" };
    if (order.adminStatus === DiagnosticOrderAdminStatus.CANCELLED) return { updated: false, reason: "CANCELLED" };
    if (order.adminStatus !== DiagnosticOrderAdminStatus.SENT_TO_EXECUTION) return { updated: false, reason: "NOT_SENT" };
    if (!canAccessBranch(user || null, order.branchId || null)) return { updated: false, reason: "BRANCH_FORBIDDEN" };

    const labCounts = await getLabCountByOrderIds([order.id], tx);
    const summary = buildClinicalSummaryFromOrder(order, labCounts[order.id]);
    const completed = isClinicalComplete(summary);
    if (!completed) return { updated: false, reason: "NOT_COMPLETE", summary };

    const update = await tx.diagnosticOrder.updateMany({
      where: { id: order.id, adminStatus: DiagnosticOrderAdminStatus.SENT_TO_EXECUTION },
      data: { adminStatus: DiagnosticOrderAdminStatus.COMPLETED }
    });

    if (update.count === 0) return { updated: false, reason: "NO_UPDATE" };

    const modules = new Set<string>();
    order.items.forEach((item) => {
      if (item.kind === "LAB") modules.add("LAB");
      if (item.kind === "IMAGING") {
        const modality = item.catalogItem.modality || item.imagingStudy?.modality || "XR";
        modules.add(modality === "US" ? "US" : "XR");
      }
    });

    await auditLog({
      action: "DIAG_ORDER_COMPLETED",
      entityType: "DiagnosticOrder",
      entityId: order.id,
      user: user || null,
      req: req as any,
      after: {
        adminStatus: DiagnosticOrderAdminStatus.COMPLETED,
        modules: Array.from(modules)
      }
    });

    return { updated: true, summary, modules: Array.from(modules) };
  });
}
