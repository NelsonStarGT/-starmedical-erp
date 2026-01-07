import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureCrmAccess } from "@/lib/api/crm";
import { PERMISSIONS } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = ensureCrmAccess(req, PERMISSIONS.AUDIT_READ);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const url = req.nextUrl;
    const entityType = url.searchParams.get("entityType") || undefined;
    const action = url.searchParams.get("action") || undefined;
    const actorUserId = url.searchParams.get("actorUserId") || undefined;
    const entityId = url.searchParams.get("entityId") || undefined;
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const page = Number(url.searchParams.get("page") || 1);
    const pageSize = Math.min(Number(url.searchParams.get("pageSize") || 20), 100);
    const skip = (page - 1) * pageSize;
    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (action) where.action = action;
    if (actorUserId) where.actorUserId = actorUserId;
    if (entityId) where.entityId = entityId;
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp.gte = new Date(from);
      if (to) where.timestamp.lte = new Date(to);
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        take: pageSize,
        skip
      }),
      prisma.auditLog.count({ where })
    ]);

    return NextResponse.json({
      data: items,
      page,
      pageSize,
      total
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudieron cargar los logs" }, { status: 500 });
  }
}
