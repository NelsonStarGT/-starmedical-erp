import { NextRequest, NextResponse } from "next/server";
import { attendanceTodayQuerySchema } from "@/lib/hr/attendance/schemas";
import { getAttendanceForDay } from "@/lib/hr/attendance/service";
import { requireAuth } from "@/lib/auth";
import { mapPrismaError } from "@/lib/api/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function handleError(err: any) {
  if (err?.status && err?.body) {
    return NextResponse.json({ ok: false, error: { code: err.body.code || "ERROR", message: err.body.error } }, { status: err.status });
  }
  const mapped = mapPrismaError(err);
  return NextResponse.json({ ok: false, error: { code: mapped.body.code || "ERROR", message: mapped.body.error } }, { status: mapped.status });
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const params = req.nextUrl.searchParams;
  const parsed = attendanceTodayQuerySchema.safeParse({
    employeeId: params.get("employeeId") || undefined,
    branchId: params.get("branchId") || undefined
  });
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_QUERY", message: "Parámetros inválidos", details: parsed.error.flatten().fieldErrors } },
      { status: 400 }
    );
  }

  const userEmployee = await prisma.hrEmployee.findFirst({ where: { userId: auth.user!.id }, select: { id: true } });
  const ownEmployeeId = userEmployee?.id || null;

  const requestedEmployeeId = parsed.data.employeeId || ownEmployeeId;
  if (!requestedEmployeeId) {
    return NextResponse.json({ ok: false, error: { code: "EMPLOYEE_NOT_FOUND", message: "No hay empleado asociado" } }, { status: 404 });
  }

  if (parsed.data.employeeId && parsed.data.employeeId !== ownEmployeeId) {
    const hasHrAccess = (auth.user?.permissions || []).includes("HR:ATTENDANCE:READ");
    if (!hasHrAccess) {
      return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "No autorizado" } }, { status: 403 });
    }
  }

  try {
    const data = await getAttendanceForDay({ employeeId: requestedEmployeeId });
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return handleError(err);
  }
}
