import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { assertEncounterEditable } from "@/lib/medical/guards";

function safeParam(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value[0]) return value[0];
  return "";
}

export async function PATCH(req: NextRequest, ctx: { params: { encounterId: string } }) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const encounterId = safeParam(ctx.params.encounterId);
  if (!encounterId) {
    return NextResponse.json({ ok: false, error: "encounterId requerido" }, { status: 400 });
  }

  const guard = await assertEncounterEditable(encounterId);
  if (!guard.editable) {
    return NextResponse.json(
      {
        ok: false,
        error: "El encounter está firmado y no admite mutaciones clínicas base.",
        code: "ALREADY_SIGNED",
        data: guard.existingSnapshot
      },
      { status: 409 }
    );
  }

  const payload = await req.json().catch(() => ({}));
  return NextResponse.json({
    ok: true,
    data: {
      encounterId,
      actorUserId: auth.user?.id || null,
      acceptedAt: new Date().toISOString(),
      payload,
      mode: "stub"
    },
    event: "encounter.draft.updated"
  });
}
