import { addDays, startOfDay } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { withApiErrorHandling } from "@/lib/api/http";

export const dynamic = "force-dynamic";

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
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "20", 10), 100);
  const range = (req.nextUrl.searchParams.get("range") || "").toLowerCase();
  const days = range === "today" ? 1 : Math.min(parseInt(req.nextUrl.searchParams.get("days") || "7", 10), 30);
  const cursor = req.nextUrl.searchParams.get("cursor") || undefined;

  const end = new Date();
  const start = addDays(startOfDay(end), -Math.max(0, days - 1));

  const where: any = {
    occurredAt: { gte: start, lte: end },
    ...(siteId ? { siteId } : {})
  };

  const rows = await prisma.attendanceRawEvent.findMany({
    where,
    orderBy: { occurredAt: "desc" },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
          branchAssignments: { where: { isPrimary: true }, include: { branch: true }, take: 1 }
        }
      }
    },
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {})
  });

  const hasNext = rows.length > limit;
  const data = rows.slice(0, limit);
  const nextCursor = hasNext ? data[data.length - 1]?.id : null;

  return NextResponse.json({
    ok: true,
    data: data.map((row) => ({
      id: row.id,
      occurredAt: row.occurredAt,
      type: row.type,
      source: row.source,
      status: row.status,
      biometricId: row.biometricId,
      employee: row.employee
        ? {
            id: row.employee.id,
            name:
              [row.employee.firstName, row.employee.lastName].filter(Boolean).join(" ") ||
              row.employee.employeeCode ||
              row.biometricId ||
              "Empleado",
            branchName: row.employee.branchAssignments?.[0]?.branch?.name || null
          }
        : null,
      branchId: row.branchId,
      errorMessage: row.errorMessage,
      rawPayload: row.rawPayload || row.payloadJson || null
    })),
    nextCursor
  });
}

export const GET = withApiErrorHandling(handler);
