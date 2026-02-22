import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createSnapshotRequestSchema } from "@/lib/medical/schemas";
import { createEncounterSnapshot, getEncounterSnapshot } from "@/lib/medical/snapshotStore";
import { assertEncounterEditable } from "@/lib/medical/guards";

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
    return NextResponse.json({ ok: true, data: snapshot });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo obtener snapshot";
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

  const editGuard = await assertEncounterEditable(encounterId);
  if (!editGuard.editable) {
    return NextResponse.json(
      {
        ok: false,
        error: "El encounter ya fue firmado y su snapshot es inmutable.",
        code: "ALREADY_SIGNED",
        data: editGuard.existingSnapshot
      },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = createSnapshotRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Payload inválido",
        details: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
      },
      { status: 400 }
    );
  }

  if (parsed.data.snapshot.encounterId !== encounterId) {
    return NextResponse.json({ ok: false, error: "encounterId no coincide con snapshot" }, { status: 400 });
  }

  try {
    const saved = await createEncounterSnapshot({
      encounterId,
      snapshot: parsed.data.snapshot,
      actorUserId: auth.user?.id || null
    });

    if (!saved.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "El encounter ya fue firmado y su snapshot es inmutable.",
          code: "ALREADY_SIGNED",
          data: saved.saved
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: true, data: saved.saved }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar snapshot";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
