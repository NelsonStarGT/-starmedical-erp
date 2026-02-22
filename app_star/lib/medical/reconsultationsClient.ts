import type { EncounterReconsulta, EncounterRichTextValue } from "@/components/medical/encounter/types";

export type ReconsultaPostPayload = {
  type: "reconsulta_resultados" | "manual_evolution";
  sourceResultId: string | null;
  sourceResultTitle: string | null;
  entryTitle: string;
  noteRich: EncounterRichTextValue;
  interpretation: string;
  conduct: string;
  therapeuticAdjustment: string;
};

type ApiResponse = {
  ok?: boolean;
  error?: string;
  data?: {
    items?: EncounterReconsulta[];
    total?: number;
  } | EncounterReconsulta;
};

function resolveApiErrorMessage(status: number, body: ApiResponse | null, fallback: string) {
  if (body?.error && typeof body.error === "string") return body.error;
  if (status === 404) return "Encounter no encontrado.";
  if (status === 409) return "Encounter cerrado para mutaciones clínicas base.";
  return fallback;
}

function cleanReconsultaArray(value: unknown): EncounterReconsulta[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is EncounterReconsulta => {
    if (!item || typeof item !== "object") return false;
    const row = item as Record<string, unknown>;
    return typeof row.id === "string" && typeof row.createdAt === "string" && typeof row.entryTitle === "string";
  });
}

function cleanReconsulta(value: unknown): EncounterReconsulta {
  if (!value || typeof value !== "object") {
    throw new Error("Respuesta inválida al guardar reconsulta.");
  }
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.createdAt !== "string" || typeof row.entryTitle !== "string") {
    throw new Error("Respuesta inválida al guardar reconsulta.");
  }
  return row as unknown as EncounterReconsulta;
}

export async function fetchReconsultations(encounterId: string): Promise<EncounterReconsulta[]> {
  const encodedId = encodeURIComponent(encounterId);
  const response = await fetch(`/api/medical/encounters/${encodedId}/reconsultations`, { cache: "no-store" });
  const body = (await response.json().catch(() => null)) as ApiResponse | null;
  if (!response.ok || !body?.ok) {
    throw new Error(resolveApiErrorMessage(response.status, body, "No se pudieron obtener reconsultas."));
  }
  const items = (body.data as { items?: EncounterReconsulta[] } | undefined)?.items;
  return cleanReconsultaArray(items);
}

export async function postReconsulta(encounterId: string, payload: ReconsultaPostPayload): Promise<EncounterReconsulta> {
  const encodedId = encodeURIComponent(encounterId);
  const response = await fetch(`/api/medical/encounters/${encodedId}/reconsultations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const body = (await response.json().catch(() => null)) as ApiResponse | null;
  if (!response.ok || !body?.ok) {
    throw new Error(resolveApiErrorMessage(response.status, body, "No se pudo guardar reconsulta."));
  }
  return cleanReconsulta(body.data);
}
