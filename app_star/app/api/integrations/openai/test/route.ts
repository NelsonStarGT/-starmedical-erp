import { NextRequest, NextResponse } from "next/server";
import { loadAiSettings } from "@/lib/ai/config";
import { ensureAdmin } from "@/lib/api/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = ensureAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;

  const settings = await loadAiSettings();
  if (!settings.apiKey) {
    return NextResponse.json({ ok: false, error: { code: "MISSING_KEY", message: "OPENAI_API_KEY no configurada" } }, { status: 400 });
  }
  if (!settings.enabled) {
    return NextResponse.json({ ok: false, error: { code: "DISABLED", message: "OpenAI no está habilitado" } }, { status: 400 });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/models?limit=1", {
      headers: { Authorization: `Bearer ${settings.apiKey}` }
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return NextResponse.json(
        { ok: false, error: { code: "OPENAI_ERROR", message: body?.error?.message || "No se pudo conectar con OpenAI" } },
        { status: 502 }
      );
    }

    const payload = await response.json().catch(() => ({}));
    const model = Array.isArray(payload?.data) && payload.data.length > 0 ? payload.data[0].id : null;
    return NextResponse.json({ ok: true, data: { message: "Conexión OK", model } });
  } catch (err: any) {
    console.error("[openai.test]", err);
    return NextResponse.json({ ok: false, error: { code: "OPENAI_ERROR", message: "Error de conexión" } }, { status: 500 });
  }
}
