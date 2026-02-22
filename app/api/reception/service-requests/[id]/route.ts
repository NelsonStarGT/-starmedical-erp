import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withApiErrorHandling, safeJson } from "@/lib/api/http";
import {
  assignServiceRequest,
  cancelServiceRequest,
  completeServiceRequest,
  startServiceRequest
} from "@/lib/reception/service-requests.service";

export const GET = withApiErrorHandling(async (req: NextRequest, ctx: { params: { id: string } }) => {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const id = ctx.params.id;
  const request = await prisma.serviceRequest.findUnique({
    where: { id },
    include: {
      visit: { select: { siteId: true } }
    }
  });

  if (!request) {
    return NextResponse.json({ error: "ServiceRequest no encontrado" }, { status: 404 });
  }

  if (auth.user?.branchId && request.visit.siteId !== auth.user.branchId) {
    return NextResponse.json({ error: "No autorizado para esta sede" }, { status: 403 });
  }

  return NextResponse.json({ ok: true, data: request });
});

export const PATCH = withApiErrorHandling(async (req: NextRequest, ctx: { params: { id: string } }) => {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const id = ctx.params.id;
  const existing = await prisma.serviceRequest.findUnique({
    where: { id },
    include: { visit: { select: { siteId: true } } }
  });

  if (!existing) {
    return NextResponse.json({ error: "ServiceRequest no encontrado" }, { status: 404 });
  }

  if (auth.user?.branchId && existing.visit.siteId !== auth.user.branchId) {
    return NextResponse.json({ error: "No autorizado para esta sede" }, { status: 403 });
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
      actorUserId: auth.user!.id,
      actorUser: auth.user
    });

    return NextResponse.json({ ok: true, data: updated });
  }

  if (action === "start") {
    const updated = await startServiceRequest({
      serviceRequestId: id,
      actorUserId: auth.user!.id,
      actorUser: auth.user,
      queueItemId: typeof body.queueItemId === "string" ? body.queueItemId : undefined,
      roomId: typeof body.roomId === "string" ? body.roomId : undefined
    });

    return NextResponse.json({ ok: true, data: updated });
  }

  if (action === "complete") {
    const updated = await completeServiceRequest({
      serviceRequestId: id,
      actorUserId: auth.user!.id,
      actorUser: auth.user,
      queueItemId: typeof body.queueItemId === "string" ? body.queueItemId : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined
    });

    return NextResponse.json({ ok: true, data: updated });
  }

  if (action === "cancel") {
    const updated = await cancelServiceRequest({
      serviceRequestId: id,
      actorUserId: auth.user!.id,
      actorUser: auth.user,
      reason: typeof body.reason === "string" ? body.reason : undefined
    });

    return NextResponse.json({ ok: true, data: updated });
  }

  return NextResponse.json({ error: "action inválida" }, { status: 400 });
});
