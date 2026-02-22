import type {
  EncounterResult,
  EncounterResultStatus,
  EncounterResultType,
  EncounterResultValueRow
} from "@/components/medical/encounter/types";

type ResultsApiResponse = {
  ok?: boolean;
  error?: string;
  data?: {
    items?: unknown[];
    total?: number;
  };
};

function resolveApiErrorMessage(status: number, body: ResultsApiResponse | null, fallback: string) {
  if (body?.error && typeof body.error === "string") return body.error;
  if (status === 404) return "Encounter no encontrado.";
  return fallback;
}

function normalizeResultType(raw: unknown): EncounterResultType {
  const value = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  if (value === "LAB" || value === "RX" || value === "USG") return value;
  return "LAB";
}

function normalizeResultStatus(raw: unknown): EncounterResultStatus {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (value === "ready") return "ready";
  if (value === "in_progress") return "in_progress";
  return "pending";
}

function normalizeImageUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function normalizeResultValues(raw: unknown): EncounterResultValueRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      if (typeof row.parameter !== "string" || typeof row.value !== "string") return null;
      return {
        parameter: row.parameter,
        value: row.value,
        range: typeof row.range === "string" ? row.range : null,
        flag: typeof row.flag === "string" ? row.flag : null
      } satisfies EncounterResultValueRow;
    })
    .filter((item): item is EncounterResultValueRow => Boolean(item));
}

function normalizeResultRow(raw: unknown): EncounterResult | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== "string") return null;

  const performedAt =
    typeof row.performedAt === "string" && row.performedAt.trim().length > 0 ? row.performedAt : new Date(0).toISOString();

  return {
    id: row.id,
    title: typeof row.title === "string" && row.title.trim().length > 0 ? row.title : "Resultado clínico",
    type: normalizeResultType(row.type),
    status: normalizeResultStatus(row.status),
    performedAt,
    pdfUrl: typeof row.pdfUrl === "string" && row.pdfUrl.trim().length > 0 ? row.pdfUrl : null,
    imageUrls: normalizeImageUrls(row.imageUrls),
    values: normalizeResultValues(row.values)
  };
}

export async function fetchEncounterResults(encounterId: string): Promise<EncounterResult[]> {
  const encodedId = encodeURIComponent(encounterId);
  const response = await fetch(`/api/medical/encounters/${encodedId}/results`, { cache: "no-store" });
  const body = (await response.json().catch(() => null)) as ResultsApiResponse | null;

  if (!response.ok || !body?.ok) {
    throw new Error(resolveApiErrorMessage(response.status, body, "No se pudieron obtener resultados."));
  }

  const items = Array.isArray(body.data?.items) ? body.data?.items : [];
  return items.map(normalizeResultRow).filter((row): row is EncounterResult => Boolean(row));
}
