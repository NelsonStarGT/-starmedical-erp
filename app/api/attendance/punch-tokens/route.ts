import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiErrorHandling, safeJson } from "@/lib/api/http";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { generatePunchToken, validatePunchTokenInput } from "@/lib/attendance/configService";

export const dynamic = "force-dynamic";

function requireAdmin(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) return { user: null, errorResponse: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  if (!hasPermission(user, "USERS:ADMIN")) return { user, errorResponse: NextResponse.json({ error: "No autorizado" }, { status: 403 }) };
  return { user, errorResponse: null };
}

async function getHandler(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;
  const siteId = req.nextUrl.searchParams.get("siteId") || undefined;

  const tokens = await prisma.attendancePunchToken.findMany({
    where: { ...(siteId ? { siteId } : {}) },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ data: tokens });
}

async function postHandler(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;
  const parsed = validatePunchTokenInput(await safeJson(req));
  const token = generatePunchToken();

  const created = await prisma.attendancePunchToken.create({
    data: {
      token,
      siteId: parsed.siteId,
      employeeId: parsed.employeeId,
      expiresAt: parsed.expiresAt,
      createdByUserId: auth.user?.id || null
    }
  });

  return NextResponse.json({
    data: {
      ...created,
      punchUrl: `/punch/${created.token}`
    }
  });
}

export const GET = withApiErrorHandling(getHandler);
export const POST = withApiErrorHandling(postHandler);
