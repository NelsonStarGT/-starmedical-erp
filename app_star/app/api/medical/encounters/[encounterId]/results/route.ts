import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getEncounterRecord, listEncounterResults } from "@/lib/medical/encounterRealStore";

function safeParam(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value[0]) return value[0];
  return "";
}

export async function GET(req: NextRequest, ctx: { params: { encounterId: string } }) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const encounterId = safeParam(ctx.params.encounterId);
  if (!encounterId) {
    return NextResponse.json({ ok: false, error: "encounterId requerido" }, { status: 400 });
  }

  try {
    const encounter = await getEncounterRecord(encounterId);
    if (!encounter) {
      return NextResponse.json({ ok: false, error: "Encounter no encontrado" }, { status: 404 });
    }

    const items = await listEncounterResults(encounterId);
    return NextResponse.json({
      ok: true,
      data: {
        items,
        total: items.length
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron obtener resultados";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
