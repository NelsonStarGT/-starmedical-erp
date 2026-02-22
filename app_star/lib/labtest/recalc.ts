import { LabTestStatus, Prisma } from "@prisma/client";

const STATUS_ORDER: LabTestStatus[] = [
  "REQUESTED",
  "REQUIREMENTS_PENDING",
  "READY_FOR_COLLECTION",
  "COLLECTED",
  "QUEUED",
  "IN_PROCESS",
  "RESULT_CAPTURED",
  "TECH_VALIDATED",
  "RELEASED",
  "SENT",
  "CANCELLED"
];

const statusRank = STATUS_ORDER.reduce((acc, status, idx) => {
  acc[status] = idx;
  return acc;
}, {} as Record<LabTestStatus, number>);

export async function recalcLabOrderStatus(tx: Prisma.TransactionClient, orderId: string): Promise<LabTestStatus> {
  const order = await tx.labTestOrder.findUnique({
    where: { id: orderId },
    select: { status: true, items: { select: { status: true } } }
  });
  if (!order) return "REQUESTED";
  if (order.status === "SENT") return "SENT"; // estado final

  const statuses = order.items.map((i) => i.status);
  if (statuses.length === 0) return order.status;

  const allCancelled = statuses.every((s) => s === "CANCELLED");
  const nextStatus: LabTestStatus = allCancelled
    ? "CANCELLED"
    : statuses
        .filter((s) => s !== "CANCELLED")
        .reduce((max, current) => {
          const maxRank = statusRank[max] ?? -1;
          const currentRank = statusRank[current] ?? -1;
          return currentRank > maxRank ? current : max;
        }, statuses.find((s) => s !== "CANCELLED") || "REQUESTED");

  if (nextStatus !== order.status) {
    await tx.labTestOrder.update({ where: { id: orderId }, data: { status: nextStatus } });
  }

  return nextStatus;
}
