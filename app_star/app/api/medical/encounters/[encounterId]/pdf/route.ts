import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getEncounterSnapshot } from "@/lib/medical/snapshotStore";

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
    const snapshot = await getEncounterSnapshot(encounterId);
    if (!snapshot) return NextResponse.json({ ok: false, error: "Snapshot no encontrado" }, { status: 404 });

    // MVP: este endpoint entrega HTML imprimible; el PDF binario server-side se prepara en /pdf-binary.
    return new Response(snapshot.html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename=encounter-${encounterId}.html`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo generar vista PDF";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
