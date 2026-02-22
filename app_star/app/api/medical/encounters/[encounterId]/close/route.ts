import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { assertEncounterEditable } from "@/lib/medical/guards";
import { encounterSnapshotSchema } from "@/lib/medical/schemas";
import { createEncounterSnapshot } from "@/lib/medical/snapshotStore";
import {
  closeEncounterInDb,
  getEncounterRecordLookup,
  upsertEncounterDocumentSnapshot
} from "@/lib/medical/encounterRealStore";
import { buildMockEncounter } from "@/components/medical/encounter/mock";
import type { EncounterSnapshot } from "@/components/medical/encounter/types";

function safeParam(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value[0]) return value[0];
  return "";
}

function asOptionalString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function buildSnapshotFallback(params: {
  encounterId: string;
  principalCode: string;
  signedAt: string;
  signedByName: string;
}): EncounterSnapshot {
  const mock = buildMockEncounter(params.encounterId, { clinicianName: params.signedByName });
  return {
    encounterId: params.encounterId,
    signedAt: params.signedAt,
    signedByName: params.signedByName,
    status: "closed",
    patient: mock.patient,
    vitals: mock.vitals,
    history: mock.historyDraft,
    diagnosis: {
      principalCode: params.principalCode,
      secondaryCodes: mock.diagnosis.secondaryCodes
    },
    prescription: mock.prescription,
    reconsultations: mock.reconsultations,
    template: null,
    clinicalEvents: ["encounter.closed", "encounter.snapshot.created", ...mock.clinicalEvents]
  };
}

export async function POST(req: NextRequest, ctx: { params: { encounterId: string } }) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const encounterId = safeParam(ctx.params.encounterId);
  if (!encounterId) {
    return NextResponse.json({ ok: false, error: "encounterId requerido" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        diagnosis?: { principalCode?: unknown };
        signedByName?: unknown;
        snapshot?: unknown;
      }
    | null;
  const principalCode = asOptionalString(body?.diagnosis?.principalCode);
  if (!principalCode) {
    return NextResponse.json({ ok: false, error: "No se puede cerrar: requiere diagnóstico principal CIE-10." }, { status: 400 });
  }

  const guard = await assertEncounterEditable(encounterId);
  if (!guard.editable) {
    return NextResponse.json(
      {
        ok: false,
        error: "El encounter ya tiene snapshot firmado.",
        code: "ALREADY_SIGNED",
        data: guard.existingSnapshot
      },
      { status: 409 }
    );
  }

  const encounterLookup = await getEncounterRecordLookup(encounterId);
  if (encounterLookup.source === "db" && !encounterLookup.record) {
    return NextResponse.json({ ok: false, error: "Encounter no encontrado" }, { status: 404 });
  }

  const signedAt = new Date().toISOString();
  const signedByName = asOptionalString(body?.signedByName) || auth.user?.name || "Médico responsable";
  const actorUserId = auth.user?.id || null;

  let snapshot: EncounterSnapshot;
  if (body?.snapshot) {
    const parsedSnapshot = encounterSnapshotSchema.safeParse(body.snapshot);
    if (!parsedSnapshot.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "snapshot inválido",
          details: parsedSnapshot.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
        },
        { status: 400 }
      );
    }
    snapshot = parsedSnapshot.data;
  } else {
    snapshot = buildSnapshotFallback({
      encounterId,
      principalCode,
      signedAt,
      signedByName
    });
  }

  if (snapshot.encounterId !== encounterId) {
    return NextResponse.json({ ok: false, error: "encounterId no coincide con snapshot" }, { status: 400 });
  }

  snapshot = {
    ...snapshot,
    encounterId,
    signedAt,
    signedByName,
    status: "closed",
    diagnosis: {
      ...snapshot.diagnosis,
      principalCode
    },
    clinicalEvents: Array.from(new Set(["encounter.closed", "encounter.snapshot.created", ...snapshot.clinicalEvents]))
  };

  try {
    const closed = await closeEncounterInDb(encounterId, actorUserId, signedAt);
    if (!closed.ok && closed.reason === "not_found") {
      return NextResponse.json({ ok: false, error: "Encounter no encontrado" }, { status: 404 });
    }

    const savedSnapshot = await createEncounterSnapshot({
      encounterId,
      snapshot,
      actorUserId
    });

    if (!savedSnapshot.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "El encounter ya fue firmado y su snapshot es inmutable.",
          code: "ALREADY_SIGNED",
          data: savedSnapshot.saved
        },
        { status: 409 }
      );
    }

    const storageRef = `/api/medical/encounters/${encodeURIComponent(encounterId)}/pdf`;
    const snapshotDocument = await upsertEncounterDocumentSnapshot({
      encounterId,
      storageRef,
      title: "Snapshot clínico firmado",
      createdAtIso: savedSnapshot.saved.createdAt,
      snapshotVersion: savedSnapshot.saved.versionNo
    });

    return NextResponse.json({
      ok: true,
      data: {
        encounterId,
        status: "closed",
        signedByName,
        closedAt: closed.ok ? closed.closedAt : signedAt,
        snapshotDocId: savedSnapshot.saved.docId,
        snapshotVersion: savedSnapshot.saved.versionNo,
        documents: snapshotDocument ? [snapshotDocument] : []
      },
      event: "encounter.closed"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cerrar y firmar encounter";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
