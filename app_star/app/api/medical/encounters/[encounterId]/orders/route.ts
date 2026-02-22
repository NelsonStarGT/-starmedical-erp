import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { assertEncounterEditable } from "@/lib/medical/guards";
import {
  appendEncounterOrderRequest,
  getEncounterRecordLookup,
  listEncounterOrderRequests
} from "@/lib/medical/encounterRealStore";

function safeParam(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value[0]) return value[0];
  return "";
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asModality(value: unknown): "LAB" | "RX" | "USG" | null {
  if (value === "LAB" || value === "RX" || value === "USG") return value;
  return null;
}

function asPriority(value: unknown): "routine" | "urgent" {
  return value === "urgent" ? "urgent" : "routine";
}

function asStatus(value: unknown): "ordered" | "in_progress" | "completed" | "cancelled" {
  if (value === "in_progress" || value === "completed" || value === "cancelled") return value;
  return "ordered";
}

export async function GET(req: NextRequest, ctx: { params: { encounterId: string } }) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const encounterId = safeParam(ctx.params.encounterId);
  if (!encounterId) {
    return NextResponse.json({ ok: false, error: "encounterId requerido" }, { status: 400 });
  }

  try {
    const lookup = await getEncounterRecordLookup(encounterId);
    if (lookup.source === "db" && !lookup.record) {
      return NextResponse.json({ ok: false, error: "Encounter no encontrado" }, { status: 404 });
    }
    const items = await listEncounterOrderRequests(encounterId);
    return NextResponse.json({
      ok: true,
      data: {
        items,
        total: items.length
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron obtener órdenes médicas";
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
        error: "La consulta está firmada y no permite modificar órdenes médicas.",
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
      { ok: false, error: "Consulta cerrada: no se pueden modificar órdenes médicas.", code: "ENCOUNTER_CLOSED" },
      { status: 409 }
    );
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "Payload inválido" }, { status: 400 });
  }

  const modality = asModality(body.modality);
  const title = optionalString(body.title);
  const quantityRaw = Number(body.quantity);
  const quantity = Number.isFinite(quantityRaw) ? Math.round(quantityRaw) : 0;

  if (!modality) {
    return NextResponse.json({ ok: false, error: "modality inválida" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ ok: false, error: "title requerido" }, { status: 400 });
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return NextResponse.json({ ok: false, error: "quantity debe ser >= 1" }, { status: 400 });
  }

  try {
    const saved = await appendEncounterOrderRequest({
      encounterId,
      modality,
      assignedToService: modality,
      serviceId: optionalString(body.serviceId),
      serviceCode: optionalString(body.serviceCode),
      title,
      quantity,
      notes: optionalString(body.notes),
      priority: asPriority(body.priority),
      status: asStatus(body.status),
      createdByName: auth.user?.name || "Médico responsable",
      updatedByName: auth.user?.name || "Médico responsable"
    });

    return NextResponse.json(
      {
        ok: true,
        data: saved,
        event: "encounter.order-request.created"
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo registrar orden médica";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
