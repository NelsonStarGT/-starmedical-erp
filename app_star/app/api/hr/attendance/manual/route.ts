import { NextRequest, NextResponse } from "next/server";
import { manualAttendanceSchema } from "@/lib/hr/attendance/schemas";
import { mapPrismaError, safeJson } from "@/lib/api/http";
import { requireRole } from "@/lib/api/hr";
import { upsertManualAttendance } from "@/lib/hr/attendance/service";

export const dynamic = "force-dynamic";

function handleError(err: any) {
  if (err?.status && err?.body) {
    return NextResponse.json({ ok: false, error: { code: err.body.code || "ERROR", message: err.body.error } }, { status: err.status });
  }
  const mapped = mapPrismaError(err);
  return NextResponse.json({ ok: false, error: { code: mapped.body.code || "ERROR", message: mapped.body.error } }, { status: mapped.status });
}

export async function POST(req: NextRequest) {
  const auth = requireRole(req, [], "HR:ATTENDANCE:WRITE");
  if (auth.errorResponse) return auth.errorResponse;

  const body = await safeJson(req);
  const parsed = manualAttendanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_DATA", message: "Datos inválidos", details: parsed.error.flatten().fieldErrors } },
      { status: 400 }
    );
  }

  try {
    const record = await upsertManualAttendance({ ...parsed.data, createdByUserId: auth.user?.id || undefined });
    return NextResponse.json({ ok: true, data: record }, { status: 201 });
  } catch (err: any) {
    return handleError(err);
  }
}
