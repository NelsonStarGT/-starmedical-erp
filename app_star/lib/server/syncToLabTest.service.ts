import { LabArea, LabTestPriority, LabTestStatus, Prisma } from "@prisma/client";

const randomCode = () => `LT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

type OrderWithItems = Prisma.DiagnosticOrderGetPayload<{
  include: { items: { include: { catalogItem: true } }; patient: true };
}>;

export async function syncDiagnosticOrderToExecution(
  tx: Prisma.TransactionClient,
  order: OrderWithItems,
  userId: string | null
) {
  const labItems = order.items.filter((item) => item.kind === "LAB" && item.status !== "CANCELLED");
  const imagingItems = order.items.filter((item) => item.kind === "IMAGING" && item.status !== "CANCELLED");

  if (labItems.length) {
    let labOrder = await tx.labTestOrder.findFirst({
      where: { sourceDiagnosticOrderId: order.id }
    });

    if (!labOrder) {
      labOrder = await tx.labTestOrder.create({
        data: {
          code: randomCode(),
          patientId: order.patientId,
          priority: LabTestPriority.ROUTINE,
          status: LabTestStatus.REQUESTED,
          fastingRequired: false,
          fastingConfirmed: null,
          requirementsNotes: null,
          areaHint: LabArea.OTHER,
          createdById: userId,
          branchId: order.branchId || null,
          sourceDiagnosticOrderId: order.id
        }
      });
    }

    for (const item of labItems) {
      const existing = await tx.labTestItem.findFirst({
        where: {
          orderId: labOrder.id,
          sourceDiagnosticOrderId: order.id,
          code: item.catalogItem.code
        }
      });
      if (existing) continue;
      await tx.labTestItem.create({
        data: {
          orderId: labOrder.id,
          name: item.catalogItem.name,
          code: item.catalogItem.code,
          area: LabArea.OTHER,
          priority: LabTestPriority.ROUTINE,
          status: LabTestStatus.REQUESTED,
          requirementsNotes: null,
          createdById: userId,
          sourceDiagnosticOrderId: order.id
        }
      });
    }
  }

  for (const item of imagingItems) {
    const existing = await tx.imagingStudy.findUnique({ where: { orderItemId: item.id } });
    if (existing) continue;
    await tx.imagingStudy.create({
      data: {
        orderItemId: item.id,
        modality: item.catalogItem.modality || "XR",
        orthancStudyId: null,
        studyInstanceUID: null,
        receivedAt: null,
        diagnosticOrderId: order.id
      }
    });
  }
}
