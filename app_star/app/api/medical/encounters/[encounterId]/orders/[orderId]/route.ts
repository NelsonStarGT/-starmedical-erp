import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { assertEncounterEditable } from "@/lib/medical/guards";
import {
  deleteEncounterOrderRequest,
  getEncounterRecordLookup,
  updateEncounterOrderRequest
} from "@/lib/medical/encounterRealStore";

function safeParam(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value[0]) return value[0];
  return "";
}

function asPriority(value: unknown): "routine" | "urgent" | undefined {
  if (value === "routine" || value === "urgent") return value;
  return undefined;
}

function asStatus(value: unknown): "ordered" | "in_progress" | "completed" | "cancelled" | undefined {
  if (value === "ordered" || value === "in_progress" || value === "completed" || value === "cancelled") return value;
  return undefined;
}

function optionalStringOrNull(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

async function assertEncounterWriteAllowed(encounterId: string) {
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
  return null;
}

export async function DELETE(req: NextRequest, ctx: { params: { encounterId: string; orderId: string } }) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const encounterId = safeParam(ctx.params.encounterId);
  const orderId = safeParam(ctx.params.orderId);
  if (!encounterId || !orderId) {
    return NextResponse.json({ ok: false, error: "encounterId y orderId requeridos" }, { status: 400 });
  }

  const guardResponse = await assertEncounterWriteAllowed(encounterId);
  if (guardResponse) return guardResponse;

  try {
    const deleted = await deleteEncounterOrderRequest(encounterId, orderId);
    if (!deleted) {
      return NextResponse.json({ ok: false, error: "Orden médica no encontrada" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        encounterId,
        orderId
      },
      event: "encounter.order-request.deleted"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar orden médica";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: { params: { encounterId: string; orderId: string } }) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const encounterId = safeParam(ctx.params.encounterId);
  const orderId = safeParam(ctx.params.orderId);
  if (!encounterId || !orderId) {
    return NextResponse.json({ ok: false, error: "encounterId y orderId requeridos" }, { status: 400 });
  }

  const guardResponse = await assertEncounterWriteAllowed(encounterId);
  if (guardResponse) return guardResponse;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "Payload inválido" }, { status: 400 });
  }

  const priority = asPriority(body.priority);
  const status = asStatus(body.status);
  const notes = optionalStringOrNull(body.notes);

  if (priority === undefined && status === undefined && notes === undefined) {
    return NextResponse.json(
      { ok: false, error: "Se requiere al menos uno: notes, priority o status." },
      { status: 400 }
    );
  }

  try {
    const updated = await updateEncounterOrderRequest({
      encounterId,
      orderRequestId: orderId,
      notes,
      priority,
      status,
      updatedByName: auth.user?.name || null
    });
    if (!updated) {
      return NextResponse.json({ ok: false, error: "Orden médica no encontrada" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      data: updated,
      event: "encounter.order-request.updated"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar orden médica";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
