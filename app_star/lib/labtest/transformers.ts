import type { LabTestOrder } from "@prisma/client";

export function serializeLabOrder(order: LabTestOrder & { patient?: any; labPatient?: any; samples?: any; items?: any }) {
  return {
    ...order,
    patientDisplay:
      order.patient?.firstName || order.labPatient
        ? `${order.patient?.firstName || order.labPatient?.firstName || ""} ${order.patient?.lastName || order.labPatient?.lastName || ""}`.trim()
        : null
  };
}
