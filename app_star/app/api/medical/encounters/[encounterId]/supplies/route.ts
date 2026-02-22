import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { assertEncounterEditable } from "@/lib/medical/guards";
import { appendEncounterSupply, getEncounterRecordLookup, listEncounterSupplies } from "@/lib/medical/encounterRealStore";

function safeParam(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value[0]) return value[0];
  return "";
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asSource(value: unknown): "inventory" | "manual" | null {
  if (value === "inventory" || value === "manual") return value;
  return null;
}

export async function GET(req: NextRequest, ctx: { params: { encounterId: string } }) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const encounterId = safeParam(ctx.params.encounterId);
  if (!encounterId) {
    return NextResponse.json({ ok: false, error: "encounterId requerido" }, { status: 400 });
  }

  try {
    const items = await listEncounterSupplies(encounterId);
    return NextResponse.json({
      ok: true,
      data: {
        items,
        total: items.length
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron obtener insumos";
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

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "Payload inválido" }, { status: 400 });
  }

  const source = asSource(body.source);
  const name = optionalString(body.name);
  const quantityRaw = Number(body.quantity);
  const quantity = Number.isFinite(quantityRaw) ? Math.round(quantityRaw) : 0;

  if (!source) {
    return NextResponse.json({ ok: false, error: "source inválido" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ ok: false, error: "name requerido" }, { status: 400 });
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return NextResponse.json({ ok: false, error: "quantity debe ser >= 1" }, { status: 400 });
  }

  const unitPriceRaw = body.unitPrice;
  const unitPrice =
    unitPriceRaw === null || unitPriceRaw === undefined || unitPriceRaw === ""
      ? null
      : Number.isFinite(Number(unitPriceRaw))
        ? Number(unitPriceRaw)
        : null;

  try {
    const saved = await appendEncounterSupply({
      encounterId,
      source,
      inventoryItemId: optionalString(body.inventoryItemId),
      sku: optionalString(body.sku),
      name,
      unit: optionalString(body.unit),
      quantity,
      unitPrice,
      notes: optionalString(body.notes),
      createdByName: auth.user?.name || "Médico responsable"
    });

    return NextResponse.json(
      {
        ok: true,
        data: saved,
        event: "encounter.supply.created"
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo registrar insumo";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
