import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { assertEncounterEditable } from "@/lib/medical/guards";
import { deleteEncounterSupply, getEncounterRecordLookup } from "@/lib/medical/encounterRealStore";

function safeParam(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value[0]) return value[0];
  return "";
}

export async function DELETE(req: NextRequest, ctx: { params: { encounterId: string; supplyId: string } }) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const encounterId = safeParam(ctx.params.encounterId);
  const supplyId = safeParam(ctx.params.supplyId);
  if (!encounterId || !supplyId) {
    return NextResponse.json({ ok: false, error: "encounterId y supplyId requeridos" }, { status: 400 });
  }

  const editable = await assertEncounterEditable(encounterId);
  if (!editable.editable) {
    return NextResponse.json(
      {
        ok: false,
        error: "La consulta está firmada y no permite modificar insumos.",
        code: "ALREADY_SIGNED",
        data: editable.existingSnapshot
      },
      { status: 409 }
    );
  }

  const lookup = await getEncounterRecordLookup(encounterId);
  if (lookup.source === "db" && !lookup.record) {
    return NextResponse.json({ ok: false, error: "Encounter no encontrado" }, { status: 404 });
  }
  if (lookup.source === "db" && lookup.record?.status.toLowerCase() === "closed") {
    return NextResponse.json(
      { ok: false, error: "Consulta cerrada: no se pueden modificar insumos.", code: "ENCOUNTER_CLOSED" },
      { status: 409 }
    );
  }

  try {
    const deleted = await deleteEncounterSupply(encounterId, supplyId);
    if (!deleted) {
      return NextResponse.json({ ok: false, error: "Insumo no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        encounterId,
        supplyId
      },
      event: "encounter.supply.deleted"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar insumo";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
