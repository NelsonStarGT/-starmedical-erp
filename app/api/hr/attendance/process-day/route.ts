import { NextRequest, NextResponse } from "next/server";
import { withApiErrorHandling } from "@/lib/api/http";
import { requireHrPermission } from "@/lib/api/rbac";
import { processDayQuerySchema } from "@/lib/hr/attendance/schemas";
import { processAttendanceDayFromRaw } from "@/lib/hr/attendance/rawProcessing";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest) {
  const auth = requireHrPermission(req, "HR:ATTENDANCE:WRITE");
  if (auth.errorResponse) return auth.errorResponse;

  const parsed = processDayQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!parsed.success) throw { status: 400, body: { error: "Parámetros inválidos" } };

  const date = new Date(`${parsed.data.date}T00:00:00`);
  const reprocess = parsed.data.reprocess === "true";
  const result = await processAttendanceDayFromRaw({ date, siteId: parsed.data.siteId || null, reprocess });

  return NextResponse.json({ ok: true, processedCount: result.length });
}

export const POST = withApiErrorHandling(handler);
