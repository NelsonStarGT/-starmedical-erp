import { NextRequest } from "next/server";
import { LabTestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireLabTestPermission, jsonError, jsonOk } from "@/lib/api/labtest";
import { createLabOrderSchema } from "@/lib/labtest/schemas";
import { serializeLabOrder } from "@/lib/labtest/transformers";

const randomCode = () => `LT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export async function POST(req: NextRequest) {
  const auth = await requireLabTestPermission(req, "LABTEST:WRITE");
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => null);
  const parsed = createLabOrderSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.flatten().formErrors.join("; ") || "Payload inválido", 400, "INVALID_BODY");
  }
  const input = parsed.data;

  const status: LabTestStatus =
    input.fastingRequired && !input.fastingConfirmed ? "REQUIREMENTS_PENDING" : "READY_FOR_COLLECTION";

  try {
    const created = await prisma.$transaction(async (tx) => {
      let labPatientId: string | undefined = undefined;
      if (input.labPatient) {
        const lp = await tx.labPatient.create({
          data: {
            firstName: input.labPatient.firstName,
            lastName: input.labPatient.lastName || null,
            docId: input.labPatient.docId || null,
            phone: input.labPatient.phone || null,
            email: input.labPatient.email || null
          }
        });
        labPatientId = lp.id;
      }

      const order = await tx.labTestOrder.create({
        data: {
          code: randomCode(),
          patientId: input.patientId || null,
          labPatientId: labPatientId || null,
          priority: input.priority,
          status,
          fastingRequired: input.fastingRequired,
          fastingConfirmed: input.fastingConfirmed,
          requirementsNotes: input.requirementsNotes || null,
          areaHint: input.areaHint || null,
          createdById: auth.user?.id,
          branchId: auth.user?.branchId || null
        }
      });

      for (const item of input.items) {
        await tx.labTestItem.create({
          data: {
            orderId: order.id,
            name: item.name,
            code: item.code || null,
            area: item.area,
            priority: item.priority || input.priority,
            requirementsNotes: item.requirementsNotes || null,
            status
          }
        });
      }

      return order;
    });

    const orderFull = await prisma.labTestOrder.findUnique({
      where: { id: created.id },
      include: { items: true, samples: true, patient: true, labPatient: true }
    });

    return jsonOk(orderFull ? serializeLabOrder(orderFull) : created, 201);
  } catch (err: any) {
    console.error(err);
    return jsonError(err.message || "Error al crear orden", 500);
  }
}
