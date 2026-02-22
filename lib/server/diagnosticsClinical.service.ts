import { DiagnosticItemKind, LabTestStatus, ReportStatus, PrismaClient, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { serializeDiagnosticOrder, type DiagnosticOrderWithRelations } from "@/lib/diagnostics/service";
import type { DiagnosticOrderDTO } from "@/lib/diagnostics/types";

export type ClinicalModuleSummary = {
  expected: boolean;
  total: number;
  released: number;
  cancelled: number;
  pending: number;
  completed: boolean;
};

export type DiagnosticClinicalSummary = {
  lab: ClinicalModuleSummary;
  xr: ClinicalModuleSummary;
  us: ClinicalModuleSummary;
};

type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

type LabCount = { total: number; released: number; cancelled: number };

type LabCountMap = Record<string, LabCount>;

function initSummary(expected: boolean, total: number, released: number, cancelled: number): ClinicalModuleSummary {
  const safeTotal = Math.max(total, 0);
  const safeReleased = Math.max(released, 0);
  const safeCancelled = Math.max(cancelled, 0);
  const pending = Math.max(safeTotal - safeReleased - safeCancelled, 0);
  const completed = expected ? pending === 0 : true;
  return {
    expected,
    total: safeTotal,
    released: safeReleased,
    cancelled: safeCancelled,
    pending,
    completed
  };
}

function resolveModality(modality?: string | null) {
  if (modality === "US") return "US";
  return "XR";
}

export async function getLabCountByOrderIds(
  orderIds: string[],
  client: PrismaClientOrTx = prisma
): Promise<LabCountMap> {
  if (!orderIds.length) return {};
  const items = await client.labTestItem.findMany({
    where: { sourceDiagnosticOrderId: { in: orderIds } },
    select: { sourceDiagnosticOrderId: true, status: true }
  });
  const map: LabCountMap = {};
  for (const item of items) {
    const key = item.sourceDiagnosticOrderId;
    if (!key) continue;
    if (!map[key]) map[key] = { total: 0, released: 0, cancelled: 0 };
    map[key].total += 1;
    if (item.status === LabTestStatus.RELEASED) map[key].released += 1;
    if (item.status === LabTestStatus.CANCELLED) map[key].cancelled += 1;
  }
  return map;
}

export function buildClinicalSummaryFromOrder(order: DiagnosticOrderWithRelations, labCount?: LabCount): DiagnosticClinicalSummary {
  const labExpected = order.items.filter((item) => item.kind === DiagnosticItemKind.LAB && item.status !== "CANCELLED").length;
  const labTotal = Math.max(labExpected, labCount?.total || 0);
  const labExpectedFlag = labExpected > 0 || (labCount?.total || 0) > 0;
  const labSummary = initSummary(labExpectedFlag, labTotal, labCount?.released || 0, labCount?.cancelled || 0);

  const imagingItems = order.items.filter((item) => item.kind === DiagnosticItemKind.IMAGING);
  const imagingTotals = {
    XR: { total: 0, released: 0, cancelled: 0 },
    US: { total: 0, released: 0, cancelled: 0 }
  };

  for (const item of imagingItems) {
    const modality = resolveModality(item.catalogItem.modality || item.imagingStudy?.modality || "XR");
    const bucket = imagingTotals[modality];
    bucket.total += 1;

    if (item.status === "CANCELLED") {
      bucket.cancelled += 1;
      continue;
    }

    const reports = item.imagingStudy?.reports || [];
    if (!reports.length) continue;
    const allReleased = reports.every((rep) => rep.status === ReportStatus.RELEASED);
    if (allReleased) bucket.released += 1;
  }

  const xrExpected = imagingTotals.XR.total > 0;
  const usExpected = imagingTotals.US.total > 0;

  const xrSummary = initSummary(xrExpected, imagingTotals.XR.total, imagingTotals.XR.released, imagingTotals.XR.cancelled);
  const usSummary = initSummary(usExpected, imagingTotals.US.total, imagingTotals.US.released, imagingTotals.US.cancelled);

  return {
    lab: labSummary,
    xr: xrSummary,
    us: usSummary
  };
}

export async function attachClinicalSummary(
  orders: DiagnosticOrderWithRelations[],
  client: PrismaClientOrTx = prisma
): Promise<(DiagnosticOrderDTO & { clinicalSummary: DiagnosticClinicalSummary })[]> {
  const orderIds = orders.map((order) => order.id);
  const labCounts = await getLabCountByOrderIds(orderIds, client);
  return orders.map((order) => {
    const dto = serializeDiagnosticOrder(order);
    const summary = buildClinicalSummaryFromOrder(order, labCounts[order.id]);
    return { ...dto, clinicalSummary: summary };
  });
}

export function isClinicalComplete(summary: DiagnosticClinicalSummary) {
  return summary.lab.completed && summary.xr.completed && summary.us.completed;
}
