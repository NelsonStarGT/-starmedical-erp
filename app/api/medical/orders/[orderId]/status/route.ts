import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getEncounterOrderRequestById,
  transitionEncounterOrderStatus
} from "@/lib/medical/encounterRealStore";
import { canAccessWorklistByModality } from "@/lib/medical/worklistAccess";

function safeParam(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value[0]) return value[0];
  return "";
}

function parseNextStatus(value: unknown): "ordered" | "in_progress" | "completed" | "cancelled" | null {
  if (value === "ordered" || value === "in_progress" || value === "completed" || value === "cancelled") return value;
  return null;
}

export async function PATCH(req: NextRequest, ctx: { params: { orderId: string } }) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const orderId = safeParam(ctx.params.orderId);
  if (!orderId) {
    return NextResponse.json({ ok: false, error: "orderId requerido" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "Payload inválido" }, { status: 400 });
  }

  const nextStatus = parseNextStatus(body.status ?? body.nextStatus);
  if (!nextStatus) {
    return NextResponse.json(
      { ok: false, error: "status inválido. Use: ordered|in_progress|completed|cancelled." },
      { status: 400 }
    );
  }

  const existing = await getEncounterOrderRequestById(orderId);
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Orden médica no encontrada." }, { status: 404 });
  }

  if (!canAccessWorklistByModality(auth.user, existing.modality, "write")) {
    return NextResponse.json({ ok: false, error: "No autorizado para modificar esta orden." }, { status: 403 });
  }

  try {
    const result = await transitionEncounterOrderStatus({
      orderRequestId: orderId,
      nextStatus,
      actorName: auth.user?.name || null
    });

    if (!result.ok) {
      const statusCode =
        result.code === "NOT_FOUND" ? 404 : result.code === "INVALID_TRANSITION" ? 400 : 409;
      return NextResponse.json(
        {
          ok: false,
          error: result.message,
          code: result.code
        },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        order: result.order,
        generatedResult: result.generatedResult
      },
      event: result.event
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar el estado de la orden.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
