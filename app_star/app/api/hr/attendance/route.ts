import { AttendanceRecordSource } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { attendanceListQuerySchema } from "@/lib/hr/attendance/schemas";
import { listAttendanceRecords } from "@/lib/hr/attendance/service";
import { requireRole } from "@/lib/api/hr";
import { mapPrismaError } from "@/lib/api/http";

export const dynamic = "force-dynamic";

function handleError(err: any) {
  if (err?.status && err?.body) {
    return NextResponse.json({ ok: false, error: { code: err.body.code || "ERROR", message: err.body.error } }, { status: err.status });
  }
  const mapped = mapPrismaError(err);
  return NextResponse.json({ ok: false, error: { code: mapped.body.code || "ERROR", message: mapped.body.error } }, { status: mapped.status });
}

export async function GET(req: NextRequest) {
  const auth = requireRole(req, [], "HR:ATTENDANCE:READ");
  if (auth.errorResponse) return auth.errorResponse;

  const params = req.nextUrl.searchParams;
  const parsed = attendanceListQuerySchema.safeParse({
    from: params.get("from") || "",
    to: params.get("to") || "",
    employeeId: params.get("employeeId") || undefined,
    branchId: params.get("branchId") || undefined,
    status: params.get("status") || undefined,
    source: params.get("source") || undefined
  });

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_QUERY", message: "Parámetros inválidos", details: parsed.error.flatten().fieldErrors } },
      { status: 400 }
    );
  }

  try {
    const data = await listAttendanceRecords({
      ...parsed.data,
      source: parsed.data.source ? (parsed.data.source as AttendanceRecordSource) : null
    });
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return handleError(err);
  }
}
