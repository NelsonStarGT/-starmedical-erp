import { LabTestStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const statusOrder: LabTestStatus[] = [
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

function minStatus(statuses: LabTestStatus[]) {
  if (!statuses.length) return "REQUESTED" as LabTestStatus;
  let minIdx = statusOrder.length - 1;
  for (const st of statuses) {
    const idx = statusOrder.indexOf(st);
    if (idx !== -1 && idx < minIdx) minIdx = idx;
  }
  return statusOrder[minIdx];
}

export async function recalcLabOrderStatus(orderId: string, tx?: Prisma.TransactionClient) {
  const client = tx || prisma;
  const order = await client.labTestOrder.findUnique({
    where: { id: orderId },
    select: { status: true, items: { select: { status: true } } }
  });
  if (!order) return null;
  if (order.status === "SENT") return order.status; // final

  const itemStatuses = order.items.map((i) => i.status);
  const derived = minStatus(itemStatuses);
  if (derived === order.status) return derived;

  await client.labTestOrder.update({ where: { id: orderId }, data: { status: derived } });
  return derived;
}
