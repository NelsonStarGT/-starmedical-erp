import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { mapPrismaError, safeJson } from "@/lib/api/http";
import { loadAiSettings } from "@/lib/ai/config";
import { parseAttendanceInputSchema } from "@/lib/hr/attendance/schemas";

export const dynamic = "force-dynamic";

function handleError(err: any) {
  if (err?.status && err?.body) {
    return NextResponse.json({ ok: false, error: { code: err.body.code || "ERROR", message: err.body.error } }, { status: err.status });
  }
  const mapped = mapPrismaError(err);
  return NextResponse.json({ ok: false, error: { code: mapped.body.code || "ERROR", message: mapped.body.error } }, { status: mapped.status });
}

function roughParse(text: string) {
  const dateMatch = text.match(/\d{4}-\d{2}-\d{2}/);
  const timeMatches = text.match(/\b\d{1,2}:\d{2}\b/g) || [];
  const normalizedTimes = timeMatches.map((t) => t.padStart(5, "0"));
  return {
    employee: null,
    date: dateMatch ? dateMatch[0] : null,
    checkIn: normalizedTimes[0] || null,
    checkOut: normalizedTimes[1] || null
  };
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const body = await safeJson(req);
  const parsed = parseAttendanceInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_DATA", message: "Datos inválidos", details: parsed.error.flatten().fieldErrors } },
      { status: 400 }
    );
  }

  try {
    const aiSettings = await loadAiSettings();
    if (!aiSettings.enabled) {
      return NextResponse.json(
        {
          ok: true,
          data: { ...roughParse(parsed.data.text), status: "FEATURE_DISABLED", note: "OpenAI deshabilitado, se devolvió un parseo básico" }
        },
        { status: 200 }
      );
    }

    const base = roughParse(parsed.data.text);
    return NextResponse.json({
      ok: true,
      data: { ...base, status: "PENDING_AI", note: "Scaffold: conectar a OpenAI cuando se habilite la característica" }
    });
  } catch (err: any) {
    return handleError(err);
  }
}
