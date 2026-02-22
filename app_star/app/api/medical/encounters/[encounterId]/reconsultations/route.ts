import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { appendEncounterReconsulta, getEncounterRecordLookup, listEncounterReconsultations } from "@/lib/medical/encounterRealStore";

function safeParam(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value[0]) return value[0];
  return "";
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export async function GET(req: NextRequest, ctx: { params: { encounterId: string } }) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const encounterId = safeParam(ctx.params.encounterId);
  if (!encounterId) {
    return NextResponse.json({ ok: false, error: "encounterId requerido" }, { status: 400 });
  }

  try {
    const items = await listEncounterReconsultations(encounterId);
    return NextResponse.json({
      ok: true,
      data: {
        items,
        total: items.length
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron obtener reconsultas";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: { params: { encounterId: string } }) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const encounterId = safeParam(ctx.params.encounterId);
  if (!encounterId) {
    return NextResponse.json({ ok: false, error: "encounterId requerido" }, { status: 400 });
  }

  const lookup = await getEncounterRecordLookup(encounterId);
  if (lookup.source === "db" && !lookup.record) {
    return NextResponse.json({ ok: false, error: "Encounter no encontrado" }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "Payload inválido" }, { status: 400 });
  }

  const type = body.type === "reconsulta_resultados" ? "reconsulta_resultados" : body.type === "manual_evolution" ? "manual_evolution" : null;
  if (!type) {
    return NextResponse.json({ ok: false, error: "type inválido" }, { status: 400 });
  }

  const noteRaw = (body.noteRich || null) as Record<string, unknown> | null;
  const noteJson =
    noteRaw?.json && typeof noteRaw.json === "object" && !Array.isArray(noteRaw.json) ? (noteRaw.json as Record<string, unknown>) : {};
  const noteHtml = asString(noteRaw?.html, "");
  const noteText = asString(noteRaw?.text, "");
  const noteRich = { json: noteJson, html: noteHtml, text: noteText };

  const interpretation = asString(body.interpretation, "").trim();
  const conduct = asString(body.conduct, "").trim();
  const therapeuticAdjustment = asString(body.therapeuticAdjustment, "").trim();

  if (!noteText.trim() && !interpretation) {
    return NextResponse.json({ ok: false, error: "Se requiere contenido clínico para la reconsulta." }, { status: 400 });
  }

  const entryTitle = asString(body.entryTitle, "").trim() || (type === "reconsulta_resultados" ? "Reconsulta por resultados" : "Evolución manual");

  try {
    const saved = await appendEncounterReconsulta({
      encounterId,
      type,
      sourceResultId: asString(body.sourceResultId, "").trim() || null,
      sourceResultTitle: asString(body.sourceResultTitle, "").trim() || null,
      entryTitle,
      noteRich,
      interpretation: interpretation || noteText.slice(0, 280),
      conduct: conduct || noteText.slice(0, 280),
      therapeuticAdjustment: therapeuticAdjustment || noteText.slice(0, 280),
      authorId: auth.user?.id || null,
      authorName: auth.user?.name || "Médico responsable"
    });

    return NextResponse.json(
      {
        ok: true,
        data: saved,
        event: "encounter.reconsulta.created"
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo registrar reconsulta";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
