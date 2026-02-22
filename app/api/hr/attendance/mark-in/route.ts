import { NextRequest, NextResponse } from "next/server";
import { mapPrismaError, safeJson } from "@/lib/api/http";
import { markAttendanceSchema } from "@/lib/hr/attendance/schemas";
import { markCheckIn } from "@/lib/hr/attendance/service";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

function handleError(err: any) {
  if (err?.status && err?.body) {
    return NextResponse.json({ ok: false, error: { code: err.body.code || "ERROR", message: err.body.error } }, { status: err.status });
  }
  const mapped = mapPrismaError(err);
  return NextResponse.json({ ok: false, error: { code: mapped.body.code || "ERROR", message: mapped.body.error } }, { status: mapped.status });
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const body = await safeJson(req);
  const parsed = markAttendanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_DATA", message: "Datos inválidos", details: parsed.error.flatten().fieldErrors } },
      { status: 400 }
    );
  }

  try {
    const record = await markCheckIn({ ...parsed.data, actorUserId: auth.user?.id || undefined });
    return NextResponse.json({ ok: true, data: record });
  } catch (err: any) {
    return handleError(err);
  }
}
