import { NextRequest, NextResponse } from "next/server";
import { OperationalArea, VisitPriority } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { withApiErrorHandling, safeJson } from "@/lib/api/http";
import {
  createServiceRequest,
  listOpenServiceRequestsByArea,
  listServiceRequestsForVisit
} from "@/lib/reception/service-requests.service";

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
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const visitId = req.nextUrl.searchParams.get("visitId");
  const siteId = req.nextUrl.searchParams.get("siteId");
  const areaRaw = req.nextUrl.searchParams.get("area");
  const status = req.nextUrl.searchParams.get("status");

  if (visitId) {
    const data = await listServiceRequestsForVisit({ visitId });
    return NextResponse.json({ ok: true, data });
  }

  if (siteId && areaRaw && status === "open") {
    if (auth.user?.branchId && auth.user.branchId !== siteId) {
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
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const body = await safeJson(req);
  const visitId = body.visitId as string | undefined;
  const siteId = body.siteId as string | undefined;

  if (!visitId || !siteId) {
    return NextResponse.json({ error: "visitId y siteId son requeridos" }, { status: 400 });
  }

  if (auth.user?.branchId && auth.user.branchId !== siteId) {
    return NextResponse.json({ error: "No autorizado para esta sede" }, { status: 403 });
  }

  const area = parseArea(body.area);
  const priority = parsePriority(body.priorityOverride ?? null);
  const enqueue = body.enqueue !== false;

  const created = await createServiceRequest({
    visitId,
    siteId,
    area,
    actorUserId: auth.user!.id,
    actorUser: auth.user,
    priorityOverride: priority,
    notes: typeof body.notes === "string" ? body.notes : undefined,
    enqueue
  });

  return NextResponse.json({ ok: true, data: created }, { status: 201 });
});
