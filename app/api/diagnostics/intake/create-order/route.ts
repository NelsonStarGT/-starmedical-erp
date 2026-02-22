import { NextRequest, NextResponse } from "next/server";
import { ClientProfileType, DiagnosticItemKind, DiagnosticOrderSourceType, PatientSex, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDiagnosticsIntakeRole } from "@/lib/api/diagnostics";
import { normalizeRoleName } from "@/lib/rbac";

export const runtime = "nodejs";

const vitalSignsSchema = z.object({
  weight: z.string().optional(),
  height: z.string().optional(),
  bloodPressure: z.string().optional(),
  temperature: z.string().optional(),
  heartRate: z.string().optional(),
  oxygenSaturation: z.string().optional()
});

const patientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  sex: z.nativeEnum(PatientSex).optional(),
  birthDate: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  dpi: z.string().optional()
});

const orderSchema = z
  .object({
    patientId: z.string().optional(),
    patient: patientSchema.optional(),
    branchId: z.string().optional(),
    items: z
      .array(
        z.object({
          catalogItemId: z.string().min(1),
          kind: z.nativeEnum(DiagnosticItemKind)
        })
      )
      .min(1, "Selecciona al menos un item"),
    priority: z.enum(["ROUTINE", "URGENT", "STAT"]).optional(),
    orderNotes: z.string().optional(),
    vitalSigns: vitalSignsSchema.optional(),
    receptionNotes: z.string().optional()
  })
  .refine((val) => Boolean(val.patientId || val.patient), {
    message: "Paciente requerido",
    path: ["patientId"]
  });

type OrderInput = z.infer<typeof orderSchema>;

function normalizeInput(input: OrderInput) {
  return {
    patientId: input.patientId?.trim() || null,
    patient: input.patient
      ? {
          firstName: input.patient.firstName.trim(),
          lastName: input.patient.lastName?.trim() || null,
          sex: input.patient.sex || null,
          birthDate: input.patient.birthDate ? new Date(input.patient.birthDate) : null,
          phone: input.patient.phone?.trim() || null,
          email: input.patient.email?.trim() || null,
          address: input.patient.address?.trim() || null,
          dpi: input.patient.dpi?.trim() || null
        }
      : null,
    branchId: input.branchId?.trim() || null,
    items: input.items,
    priority: input.priority || "ROUTINE",
    orderNotes: input.orderNotes?.trim() || null,
    vitalSigns: input.vitalSigns || null,
    receptionNotes: input.receptionNotes?.trim() || null
  };
}

function isAdmin(roles: string[]) {
  const normalized = roles.map(normalizeRoleName);
  return normalized.includes("ADMIN") || normalized.includes("SUPER_ADMIN");
}

export async function POST(req: NextRequest) {
  const auth = requireDiagnosticsIntakeRole(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json().catch(() => null);
    const parsed = orderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Payload inválido" }, { status: 400 });
    }

    const input = normalizeInput(parsed.data);
    if (input.patient?.birthDate && Number.isNaN(input.patient.birthDate.getTime())) {
      return NextResponse.json({ error: "Fecha de nacimiento inválida" }, { status: 400 });
    }

    const user = auth.user!;
    const admin = isAdmin(user.roles || []);
    const branchId = input.branchId || user.branchId || null;
    if (!branchId) return NextResponse.json({ error: "branchId requerido" }, { status: 400 });
    if (!admin && user.branchId && input.branchId && user.branchId !== input.branchId) {
      return NextResponse.json({ error: "Sucursal no autorizada" }, { status: 403 });
    }

    const result = await prisma.$transaction(async (tx) => {
      let patientId = input.patientId;
      if (!patientId && input.patient) {
        const strongMatch = await tx.clientProfile.findFirst({
          where: {
            OR: [
              ...(input.patient.dpi ? [{ dpi: input.patient.dpi }] : []),
              ...(input.patient.phone ? [{ phone: input.patient.phone }] : [])
            ]
          },
          select: { id: true, firstName: true, lastName: true, phone: true, dpi: true, email: true }
        });
        if (strongMatch) {
          const err: any = new Error("Paciente ya existe con DPI o teléfono");
          err.status = 409;
          err.code = "DUPLICATE_STRONG";
          err.matches = [strongMatch];
          throw err;
        }

        const created = await tx.clientProfile.create({
          data: {
            type: ClientProfileType.PERSON,
            firstName: input.patient.firstName,
            lastName: input.patient.lastName,
            sex: input.patient.sex as PatientSex | null,
            birthDate: input.patient.birthDate,
            phone: input.patient.phone,
            email: input.patient.email,
            address: input.patient.address,
            dpi: input.patient.dpi
          }
        });
        patientId = created.id;
      }

      if (!patientId) throw new Error("Paciente requerido");

      const itemIds = input.items.map((it) => it.catalogItemId);
      const catalogItems = await tx.diagnosticCatalogItem.findMany({
        where: { id: { in: itemIds }, isActive: true }
      });
      if (catalogItems.length !== input.items.length) {
        throw { status: 400, message: "Hay items de catálogo inválidos o inactivos" };
      }
      const catalogMap = new Map(catalogItems.map((c) => [c.id, c]));
      for (const item of input.items) {
        const catalog = catalogMap.get(item.catalogItemId);
        if (!catalog || catalog.kind !== item.kind) {
          throw { status: 400, message: "Tipo de item no coincide con el catálogo" };
        }
      }

      let total = new Prisma.Decimal(0);
      catalogItems.forEach((c) => {
        total = total.add(c.price as Prisma.Decimal);
      });

      const order = await tx.diagnosticOrder.create({
        data: {
          patientId,
          branchId,
          notes: input.orderNotes,
          totalAmount: total,
          sourceType: DiagnosticOrderSourceType.RECEPTION,
          createdByUserId: user.id
        }
      });

      for (const item of input.items) {
        await tx.diagnosticOrderItem.create({
          data: {
            orderId: order.id,
            kind: item.kind,
            catalogItemId: item.catalogItemId,
            priority: input.priority
          }
        });
      }

      if (input.vitalSigns || input.receptionNotes) {
        await tx.receptionNote.create({
          data: {
            diagnosticOrderId: order.id,
            vitalSignsJson: input.vitalSigns || undefined,
            notes: input.receptionNotes,
            createdByUserId: user.id
          }
        });
      }

      return { orderId: order.id, patientId };
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err: any) {
    if (err?.status) {
      return NextResponse.json({ error: err.message, code: err.code, matches: err.matches || [] }, { status: err.status });
    }
    console.error("create reception order error", err);
    return NextResponse.json({ error: "No se pudo crear la orden" }, { status: 500 });
  }
}
