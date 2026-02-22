import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { withApiErrorHandling } from "@/lib/api/http";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const allowed = hasPermission(user, "USERS:ADMIN") || hasPermission(user, "HR:ATTENDANCE:READ");
  if (!allowed) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const [configs, tokens, raws, shifts, assignments] = await Promise.all([
    prisma.attendanceSiteConfig.findMany({ select: { siteId: true } }),
    prisma.attendancePunchToken.findMany({ select: { siteId: true } }),
    prisma.attendanceRawEvent.findMany({ distinct: ["siteId"], select: { siteId: true } }),
    prisma.attendanceShift.findMany({ distinct: ["siteId"], select: { siteId: true } }),
    prisma.employeeSiteAssignment.findMany({ distinct: ["siteId"], select: { siteId: true } })
  ]);

  const ids = new Set<string>();
  configs.forEach(({ siteId }) => siteId && ids.add(siteId));
  tokens.forEach(({ siteId }) => siteId && ids.add(siteId));
  raws.forEach(({ siteId }) => siteId && ids.add(siteId));
  shifts.forEach(({ siteId }) => siteId && ids.add(siteId));
  assignments.forEach(({ siteId }) => siteId && ids.add(siteId));

  const data = Array.from(ids)
    .filter(Boolean)
    .sort()
    .map((id) => ({ id, name: id }));

  return NextResponse.json({ data });
}

export const GET = withApiErrorHandling(handler);
