import { getEncounterSnapshot, type SavedSnapshot } from "@/lib/medical/snapshotStore";

export type EncounterEditGuardResult =
  | { editable: true; reason: null; existingSnapshot: null }
  | { editable: false; reason: "already_signed"; existingSnapshot: SavedSnapshot };

// Guard incremental: por ahora se considera "cerrado" cuando ya existe snapshot firmado.
export async function assertEncounterEditable(encounterId: string): Promise<EncounterEditGuardResult> {
  const existingSnapshot = await getEncounterSnapshot(encounterId);
  if (!existingSnapshot) {
    return { editable: true, reason: null, existingSnapshot: null };
  }

  return {
    editable: false,
    reason: "already_signed",
    existingSnapshot
  };
}

export async function ensureEncounterEditable(encounterId: string) {
  const guard = await assertEncounterEditable(encounterId);
  if (guard.editable) return;

  const error = new Error("Encounter cerrado/firmado: no admite mutaciones");
  (error as Error & { code?: string; snapshot?: SavedSnapshot }).code = "ENCOUNTER_CLOSED";
  (error as Error & { code?: string; snapshot?: SavedSnapshot }).snapshot = guard.existingSnapshot;
  throw error;
}
