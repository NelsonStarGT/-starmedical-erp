import { addDays, startOfDay } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { withApiErrorHandling } from "@/lib/api/http";

function ingestConfigured() {
  const defaultKey = process.env.ATTENDANCE_INGEST_KEY;
  const map = process.env.ATTENDANCE_INGEST_KEYS;
  return Boolean((defaultKey && defaultKey.trim()) || (map && map.trim()));
}

function authorize(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) return { user: null, errorResponse: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  const ok = hasPermission(user, "USERS:ADMIN") || hasPermission(user, "HR:ATTENDANCE:READ");
  if (!ok) return { user, errorResponse: NextResponse.json({ error: "No autorizado" }, { status: 403 }) };
  return { user, errorResponse: null };
}

async function handler(req: NextRequest) {
  const auth = authorize(req);
  if (auth.errorResponse) return auth.errorResponse;

  const siteId = req.nextUrl.searchParams.get("siteId") || undefined;
  const todayStart = startOfDay(new Date());
  const todayEnd = addDays(todayStart, 1);

  const [activeTokens, lastRaw, todayCount] = await Promise.all([
    prisma.attendancePunchToken.count({ where: { revokedAt: null, ...(siteId ? { siteId } : {}) } }),
    prisma.attendanceRawEvent.findFirst({
      where: { ...(siteId ? { siteId } : {}) },
      orderBy: { occurredAt: "desc" },
      select: { occurredAt: true }
    }),
    prisma.attendanceRawEvent.count({
      where: {
        occurredAt: { gte: todayStart, lt: todayEnd },
        ...(siteId ? { siteId } : {})
      }
    })
  ]);

  const configured = ingestConfigured();

  return NextResponse.json({
    ok: true,
    data: {
      configured,
      ingestKeyConfigured: configured,
      activeTokens,
      lastEventAt: lastRaw?.occurredAt || null,
      todayCount,
      errors: []
    }
  });
}

export const GET = withApiErrorHandling(handler);
