import { NextRequest, NextResponse } from "next/server";
import { DiagnosticOrderAdminStatus, DiagnosticOrderSourceType, DiagnosticOrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireDiagnosticsPermission } from "@/lib/api/diagnostics";
import { auditLog } from "@/lib/audit";
import { createDiagnosticOrderSchema } from "@/lib/diagnostics/schemas";
import { serializeDiagnosticOrder } from "@/lib/diagnostics/service";
import { attachClinicalSummary } from "@/lib/server/diagnosticsClinical.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = requireDiagnosticsPermission(req, "DIAG:READ");
  if (auth.errorResponse) return auth.errorResponse;

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const adminStatusParam = searchParams.get("adminStatus");
  const q = searchParams.get("q") || undefined;

  let status: DiagnosticOrderStatus | undefined;
  if (statusParam) {
    const normalized = statusParam.toUpperCase();
    if (!Object.values(DiagnosticOrderStatus).includes(normalized as DiagnosticOrderStatus)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }
    status = normalized as DiagnosticOrderStatus;
  }
  let adminStatus: DiagnosticOrderAdminStatus | undefined;
  if (adminStatusParam) {
    const normalized = adminStatusParam.toUpperCase();
    if (!Object.values(DiagnosticOrderAdminStatus).includes(normalized as DiagnosticOrderAdminStatus)) {
      return NextResponse.json({ error: "Estado administrativo inválido" }, { status: 400 });
    }
    adminStatus = normalized as DiagnosticOrderAdminStatus;
  }

  const where: Prisma.DiagnosticOrderWhereInput = {};
  if (status) where.status = status;
  if (adminStatus) where.adminStatus = adminStatus;
  if (q) {
    where.OR = [
      { patient: { firstName: { contains: q, mode: "insensitive" } } },
      { patient: { lastName: { contains: q, mode: "insensitive" } } },
      { patient: { dpi: { contains: q, mode: "insensitive" } } },
      { patient: { nit: { contains: q, mode: "insensitive" } } },
      { items: { some: { catalogItem: { name: { contains: q, mode: "insensitive" } } } } },
      { items: { some: { catalogItem: { code: { contains: q, mode: "insensitive" } } } } }
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

  const withSummary = await attachClinicalSummary(orders);
  return NextResponse.json({ data: withSummary });
}

export async function POST(req: NextRequest) {
  const auth = requireDiagnosticsPermission(req, "DIAG:WRITE");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const parsed = createDiagnosticOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Payload inválido" }, { status: 400 });
    }
    const input = parsed.data;
    const orderedAt = input.orderedAt ? new Date(input.orderedAt) : new Date();
    if (Number.isNaN(orderedAt.getTime())) return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });

    const created = await prisma.$transaction(async (tx) => {
      const patient = await tx.clientProfile.findUnique({ where: { id: input.patientId } });
      if (!patient) throw { status: 404, message: "Paciente no encontrado" };

      if (input.branchId) {
        const branch = await tx.branch.findUnique({ where: { id: input.branchId } });
        if (!branch) throw { status: 400, message: "Sucursal inválida" };
      }

      const itemIds = input.items.map((it) => it.catalogItemId);
      const catalogItems = await tx.diagnosticCatalogItem.findMany({ where: { id: { in: itemIds }, isActive: true } });
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
          patientId: input.patientId,
          branchId: input.branchId || null,
          notes: input.notes || null,
          orderedAt,
          totalAmount: total,
          sourceType: input.sourceType || DiagnosticOrderSourceType.WALK_IN,
          sourceRefId: input.sourceRefId || null,
          createdByUserId: auth.user?.id
        }
      });

      for (const item of input.items) {
        const scheduledAt = item.scheduledAt ? new Date(item.scheduledAt) : null;
        if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
          throw { status: 400, message: "Fecha programada inválida" };
        }
        await tx.diagnosticOrderItem.create({
          data: {
            orderId: order.id,
            kind: item.kind,
            catalogItemId: item.catalogItemId,
            priority: item.priority || null,
            scheduledAt
          }
        });
      }

      return order.id;
    });

    const saved = await prisma.diagnosticOrder.findUnique({
      where: { id: created },
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
    if (!saved) throw new Error("No se pudo cargar la orden");

    await auditLog({
      action: "DIAG_ORDER_CREATED",
      entityType: "DiagnosticOrder",
      entityId: saved.id,
      user: auth.user,
      req,
      after: { status: saved.status, patientId: saved.patientId }
    });

    return NextResponse.json({ data: serializeDiagnosticOrder(saved) }, { status: 201 });
  } catch (err: any) {
    if (err?.status) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("create diagnostic order error", err);
    return NextResponse.json({ error: "No se pudo crear la orden" }, { status: 500 });
  }
}
