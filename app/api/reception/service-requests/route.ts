import { NextRequest, NextResponse } from "next/server";
import { OperationalArea, VisitPriority } from "@prisma/client";
import { withApiErrorHandling, safeJson } from "@/lib/api/http";
import {
  createServiceRequest,
  listOpenServiceRequestsByArea,
  listServiceRequestsForVisit
} from "@/lib/reception/service-requests.service";
import { prisma } from "@/lib/prisma";
import {
  assertBranchAccess,
  recordTenantIsolationBlocked,
  requireTenantContextFromRequest
} from "@/lib/security/tenantContext.server";

function parseArea(value: unknown): OperationalArea {
  if (typeof value !== "string") throw { status: 400, body: { error: "area inválida" } };
  const upper = value.toUpperCase();
  if (!Object.values(OperationalArea).includes(upper as OperationalArea)) {
    throw { status: 400, body: { error: "area inválida" } };
  }
  return upper as OperationalArea;
}

function parsePriority(value: unknown): VisitPriority | null {
  if (value == null) return null;
  if (typeof value !== "string") throw { status: 400, body: { error: "priority inválida" } };
  const upper = value.toUpperCase();
  if (!Object.values(VisitPriority).includes(upper as VisitPriority)) {
    throw { status: 400, body: { error: "priority inválida" } };
  }
  return upper as VisitPriority;
}

export const GET = withApiErrorHandling(async (req: NextRequest) => {
  const scoped = await requireTenantContextFromRequest(req);
  if (scoped.errorResponse || !scoped.context) return scoped.errorResponse!;
  const { context } = scoped;

  const visitId = req.nextUrl.searchParams.get("visitId");
  const siteId = req.nextUrl.searchParams.get("siteId");
  const areaRaw = req.nextUrl.searchParams.get("area");
  const status = req.nextUrl.searchParams.get("status");

  if (visitId) {
    const visit = await prisma.visit.findFirst({
      where: { id: visitId, patient: { tenantId: context.tenantId } },
      select: { id: true, siteId: true }
    });
    if (!visit) {
      const crossTenantVisit = await prisma.visit.findFirst({
        where: { id: visitId, patient: { tenantId: { not: context.tenantId } } },
        select: { id: true }
      });
      if (crossTenantVisit) {
        await recordTenantIsolationBlocked({
          tenantId: context.tenantId,
          userId: context.user.id,
          route: "/api/reception/service-requests",
          resourceType: "Visit",
          resourceId: visitId,
          reason: "visit_not_in_tenant"
        });
      }
      return NextResponse.json({ error: "ServiceRequest no encontrado" }, { status: 404 });
    }
    if (!assertBranchAccess(context, visit.siteId)) {
      return NextResponse.json({ error: "ServiceRequest no encontrado" }, { status: 404 });
    }
    const data = await listServiceRequestsForVisit({ visitId });
    return NextResponse.json({ ok: true, data });
  }

  if (siteId && areaRaw && status === "open") {
    if (!assertBranchAccess(context, siteId)) {
      await recordTenantIsolationBlocked({
        tenantId: context.tenantId,
        userId: context.user.id,
        route: "/api/reception/service-requests",
        resourceType: "Branch",
        resourceId: siteId,
        reason: "branch_not_allowed"
      });
      return NextResponse.json({ error: "No autorizado para esta sede" }, { status: 403 });
    }
    const area = parseArea(areaRaw);
    const data = await listOpenServiceRequestsByArea({ siteId, area });
    return NextResponse.json({ ok: true, data });
  }

  return NextResponse.json(
    { error: "Parámetros inválidos. Usa visitId o siteId+area+status=open." },
    { status: 400 }
  );
});

export const POST = withApiErrorHandling(async (req: NextRequest) => {
  const scoped = await requireTenantContextFromRequest(req);
  if (scoped.errorResponse || !scoped.context) return scoped.errorResponse!;
  const { context } = scoped;

  const body = await safeJson(req);
  const visitId = body.visitId as string | undefined;
  const siteId = body.siteId as string | undefined;

  if (!visitId || !siteId) {
    return NextResponse.json({ error: "visitId y siteId son requeridos" }, { status: 400 });
  }

  if (!assertBranchAccess(context, siteId)) {
    await recordTenantIsolationBlocked({
      tenantId: context.tenantId,
      userId: context.user.id,
      route: "/api/reception/service-requests",
      resourceType: "Branch",
      resourceId: siteId,
      reason: "branch_not_allowed"
    });
    return NextResponse.json({ error: "No autorizado para esta sede" }, { status: 403 });
  }

  const visit = await prisma.visit.findFirst({
    where: { id: visitId, patient: { tenantId: context.tenantId }, siteId },
    select: { id: true }
  });
  if (!visit) {
    const crossTenantVisit = await prisma.visit.findFirst({
      where: { id: visitId, patient: { tenantId: { not: context.tenantId } } },
      select: { id: true }
    });
    if (crossTenantVisit) {
      await recordTenantIsolationBlocked({
        tenantId: context.tenantId,
        userId: context.user.id,
        route: "/api/reception/service-requests",
        resourceType: "Visit",
        resourceId: visitId,
        reason: "visit_not_in_tenant"
      });
    }
    return NextResponse.json({ error: "Visita no encontrada" }, { status: 404 });
  }

  const area = parseArea(body.area);
  const priority = parsePriority(body.priorityOverride ?? null);
  const enqueue = body.enqueue !== false;

  const created = await createServiceRequest({
    visitId,
    siteId,
    area,
    actorUserId: context.user.id,
    actorUser: context.user,
    priorityOverride: priority,
    notes: typeof body.notes === "string" ? body.notes : undefined,
    enqueue
  });

  return NextResponse.json({ ok: true, data: created }, { status: 201 });
});
