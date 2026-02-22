import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { processRawEvents } from "@/lib/hr/attendance/rawPipeline";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) return NextResponse.json({ ok: false, error: { code: "UNAUTHENTICATED", message: "No autenticado" } }, { status: 401 });
  if (!hasPermission(user, "USERS:ADMIN") && !hasPermission(user, "HR:ATTENDANCE:WRITE")) {
    return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "No autorizado" } }, { status: 403 });
  }

  try {
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "50", 10), 200);
    const result = await processRawEvents({ limit });
    return NextResponse.json({ ok: true, data: result });
  } catch (err: any) {
    console.error("process raw events error", err);
    return NextResponse.json({ ok: false, error: { code: "PROCESS_FAILED", message: err?.message || "No se pudo procesar" } }, { status: 500 });
  }
}
