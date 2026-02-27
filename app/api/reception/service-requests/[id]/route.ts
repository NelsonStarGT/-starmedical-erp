import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiErrorHandling, safeJson } from "@/lib/api/http";
import {
  assignServiceRequest,
  cancelServiceRequest,
  completeServiceRequest,
  startServiceRequest
} from "@/lib/reception/service-requests.service";
import {
  assertBranchAccess,
  recordTenantIsolationBlocked,
  requireTenantContextFromRequest
} from "@/lib/security/tenantContext.server";

export const GET = withApiErrorHandling(async (req: NextRequest, ctx: { params: { id: string } }) => {
  const scoped = await requireTenantContextFromRequest(req);
  if (scoped.errorResponse || !scoped.context) return scoped.errorResponse!;
  const { context } = scoped;

  const id = ctx.params.id;
  const request = await prisma.serviceRequest.findFirst({
    where: {
      id,
      visit: { patient: { tenantId: context.tenantId } }
    },
    include: {
      visit: { select: { siteId: true } }
    }
  });

  if (!request) {
    const crossTenantRequest = await prisma.serviceRequest.findFirst({
      where: {
        id,
        visit: { patient: { tenantId: { not: context.tenantId } } }
      },
      select: { id: true }
    });
    if (crossTenantRequest) {
      await recordTenantIsolationBlocked({
        tenantId: context.tenantId,
        userId: context.user.id,
        route: "/api/reception/service-requests/[id]",
        resourceType: "ServiceRequest",
        resourceId: id,
        reason: "service_request_not_in_tenant"
      });
    }
    return NextResponse.json({ error: "ServiceRequest no encontrado" }, { status: 404 });
  }

  if (!assertBranchAccess(context, request.visit.siteId)) {
    return NextResponse.json({ error: "ServiceRequest no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: request });
});

export const PATCH = withApiErrorHandling(async (req: NextRequest, ctx: { params: { id: string } }) => {
  const scoped = await requireTenantContextFromRequest(req);
  if (scoped.errorResponse || !scoped.context) return scoped.errorResponse!;
  const { context } = scoped;

  const id = ctx.params.id;
  const existing = await prisma.serviceRequest.findFirst({
    where: {
      id,
      visit: { patient: { tenantId: context.tenantId } }
    },
    include: { visit: { select: { siteId: true } } }
  });

  if (!existing) {
    const crossTenantRequest = await prisma.serviceRequest.findFirst({
      where: {
        id,
        visit: { patient: { tenantId: { not: context.tenantId } } }
      },
      select: { id: true }
    });
    if (crossTenantRequest) {
      await recordTenantIsolationBlocked({
        tenantId: context.tenantId,
        userId: context.user.id,
        route: "/api/reception/service-requests/[id]",
        resourceType: "ServiceRequest",
        resourceId: id,
        reason: "service_request_not_in_tenant"
      });
    }
    return NextResponse.json({ error: "ServiceRequest no encontrado" }, { status: 404 });
  }

  if (!assertBranchAccess(context, existing.visit.siteId)) {
    return NextResponse.json({ error: "ServiceRequest no encontrado" }, { status: 404 });
  }

  const body = await safeJson(req);
  const action = body.action as string | undefined;

  if (!action) {
    return NextResponse.json({ error: "action es requerido" }, { status: 400 });
  }

  if (action === "assign") {
    if (!body.assignedToUserId) {
      return NextResponse.json({ error: "assignedToUserId es requerido" }, { status: 400 });
    }

    const updated = await assignServiceRequest({
      serviceRequestId: id,
      assignedToUserId: body.assignedToUserId,
      actorUserId: context.user.id,
      actorUser: context.user
    });

    return NextResponse.json({ ok: true, data: updated });
  }

  if (action === "start") {
    const updated = await startServiceRequest({
      serviceRequestId: id,
      actorUserId: context.user.id,
      actorUser: context.user,
      queueItemId: typeof body.queueItemId === "string" ? body.queueItemId : undefined,
      roomId: typeof body.roomId === "string" ? body.roomId : undefined
    });

    return NextResponse.json({ ok: true, data: updated });
  }

  if (action === "complete") {
    const updated = await completeServiceRequest({
      serviceRequestId: id,
      actorUserId: context.user.id,
      actorUser: context.user,
      queueItemId: typeof body.queueItemId === "string" ? body.queueItemId : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined
    });

    return NextResponse.json({ ok: true, data: updated });
  }

  if (action === "cancel") {
    const updated = await cancelServiceRequest({
      serviceRequestId: id,
      actorUserId: context.user.id,
      actorUser: context.user,
      reason: typeof body.reason === "string" ? body.reason : undefined
    });

    return NextResponse.json({ ok: true, data: updated });
  }

  return NextResponse.json({ error: "action inválida" }, { status: 400 });
});
