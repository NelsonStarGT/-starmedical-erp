import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiErrorHandling, safeJson } from "@/lib/api/http";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { validateSiteConfigInput } from "@/lib/attendance/configService";

export const dynamic = "force-dynamic";

function requireConfigRead(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) return { user: null, errorResponse: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  const allowed = hasPermission(user, "USERS:ADMIN") || hasPermission(user, "HR:ATTENDANCE:WRITE");
  if (!allowed) return { user, errorResponse: NextResponse.json({ error: "No autorizado" }, { status: 403 }) };
  return { user, errorResponse: null };
}

function requireAdmin(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) return { user: null, errorResponse: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  if (!hasPermission(user, "USERS:ADMIN")) return { user, errorResponse: NextResponse.json({ error: "No autorizado" }, { status: 403 }) };
  return { user, errorResponse: null };
}

async function getHandler(req: NextRequest) {
  const auth = requireConfigRead(req);
  if (auth.errorResponse) return auth.errorResponse;
  const siteId = req.nextUrl.searchParams.get("siteId");
  if (!siteId) return NextResponse.json({ error: "siteId requerido" }, { status: 400 });

  const config = await prisma.attendanceSiteConfig.findUnique({ where: { siteId } });
  return NextResponse.json({ data: config });
}

async function postHandler(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;
  const body = await safeJson(req);
  const parsed = validateSiteConfigInput(body);

  const saved = await prisma.attendanceSiteConfig.upsert({
    where: { siteId: parsed.siteId },
    update: {
      customerId: parsed.customerId,
      lat: parsed.lat,
      lng: parsed.lng,
      radiusMeters: parsed.radiusMeters,
      allowOutOfZone: parsed.allowOutOfZone,
      requirePhoto: parsed.requirePhoto,
      requireLiveness: parsed.requireLiveness,
      windowBeforeMinutes: parsed.windowBeforeMinutes,
      windowAfterMinutes: parsed.windowAfterMinutes,
      antiPassback: parsed.antiPassback,
      allowedSources: parsed.allowedSources
    },
    create: {
      ...parsed
    }
  });

  return NextResponse.json({ data: saved });
}

export const GET = withApiErrorHandling(getHandler);
export const POST = withApiErrorHandling(postHandler);
