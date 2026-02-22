import type { EncounterSupplyItem } from "@/components/medical/encounter/types";

export type EncounterSupplyPostPayload = {
  source: "inventory" | "manual";
  inventoryItemId: string | null;
  sku: string | null;
  name: string;
  unit: string | null;
  quantity: number;
  unitPrice: number | null;
  notes: string | null;
};

export type MedicalInventorySearchItem = {
  id: string;
  sku: string | null;
  name: string;
  unit: string | null;
  unitPrice: number | null;
};

type SuppliesApiResponse = {
  ok?: boolean;
  error?: string;
  code?: string;
  data?: {
    items?: unknown[];
    total?: number;
  } | EncounterSupplyItem;
};

type InventoryApiResponse = {
  ok?: boolean;
  error?: string;
  data?: {
    items?: unknown[];
    total?: number;
  };
};

function resolveSupplyErrorMessage(status: number, body: SuppliesApiResponse | null, fallback: string) {
  if (body?.error && typeof body.error === "string") return body.error;
  if (status === 404) return "Encounter no encontrado.";
  if (status === 409 && body?.code === "ENCOUNTER_CLOSED") return "Consulta cerrada: no se pueden modificar insumos.";
  if (status === 409) return "Consulta firmada: no se pueden modificar insumos.";
  return fallback;
}

function normalizeSupply(raw: unknown): EncounterSupplyItem | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.encounterId !== "string" || typeof row.name !== "string") return null;
  const quantityRaw = Number(row.quantity);
  const unitPriceRaw = row.unitPrice;
  const unitPrice =
    unitPriceRaw === null || unitPriceRaw === undefined || unitPriceRaw === ""
      ? null
      : Number.isFinite(Number(unitPriceRaw))
        ? Number(unitPriceRaw)
        : null;
  return {
    id: row.id,
    encounterId: row.encounterId,
    source: row.source === "manual" ? "manual" : "inventory",
    inventoryItemId: typeof row.inventoryItemId === "string" && row.inventoryItemId.trim().length > 0 ? row.inventoryItemId : null,
    sku: typeof row.sku === "string" && row.sku.trim().length > 0 ? row.sku : null,
    name: row.name,
    unit: typeof row.unit === "string" && row.unit.trim().length > 0 ? row.unit : null,
    quantity: Number.isFinite(quantityRaw) && quantityRaw > 0 ? Math.round(quantityRaw) : 1,
    unitPrice,
    notes: typeof row.notes === "string" && row.notes.trim().length > 0 ? row.notes : null,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : new Date(0).toISOString(),
    createdByName: typeof row.createdByName === "string" && row.createdByName.trim().length > 0 ? row.createdByName : "Médico responsable"
  };
}

function normalizeInventoryItem(raw: unknown): MedicalInventorySearchItem | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.name !== "string") return null;
  const unitPriceRaw = row.unitPrice;
  const unitPrice =
    unitPriceRaw === null || unitPriceRaw === undefined || unitPriceRaw === ""
      ? null
      : Number.isFinite(Number(unitPriceRaw))
        ? Number(unitPriceRaw)
        : null;

  return {
    id: row.id,
    sku: typeof row.sku === "string" && row.sku.trim().length > 0 ? row.sku : null,
    name: row.name,
    unit: typeof row.unit === "string" && row.unit.trim().length > 0 ? row.unit : null,
    unitPrice
  };
}

export async function fetchEncounterSupplies(encounterId: string): Promise<EncounterSupplyItem[]> {
  const encodedId = encodeURIComponent(encounterId);
  const response = await fetch(`/api/medical/encounters/${encodedId}/supplies`, { cache: "no-store" });
  const body = (await response.json().catch(() => null)) as SuppliesApiResponse | null;
  if (!response.ok || !body?.ok) {
    throw new Error(resolveSupplyErrorMessage(response.status, body, "No se pudieron obtener insumos."));
  }
  const rows = Array.isArray((body.data as { items?: unknown[] } | undefined)?.items)
    ? ((body.data as { items?: unknown[] }).items || [])
    : [];
  return rows.map(normalizeSupply).filter((item): item is EncounterSupplyItem => Boolean(item));
}

export async function postEncounterSupply(encounterId: string, payload: EncounterSupplyPostPayload): Promise<EncounterSupplyItem> {
  const encodedId = encodeURIComponent(encounterId);
  const response = await fetch(`/api/medical/encounters/${encodedId}/supplies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const body = (await response.json().catch(() => null)) as SuppliesApiResponse | null;
  if (!response.ok || !body?.ok) {
    throw new Error(resolveSupplyErrorMessage(response.status, body, "No se pudo guardar insumo."));
  }
  const row = normalizeSupply(body.data);
  if (!row) throw new Error("Respuesta inválida al guardar insumo.");
  return row;
}

export async function deleteEncounterSupply(encounterId: string, supplyId: string): Promise<void> {
  const encodedId = encodeURIComponent(encounterId);
  const encodedSupplyId = encodeURIComponent(supplyId);
  const response = await fetch(`/api/medical/encounters/${encodedId}/supplies/${encodedSupplyId}`, {
    method: "DELETE"
  });
  const body = (await response.json().catch(() => null)) as SuppliesApiResponse | null;
  if (!response.ok || !body?.ok) {
    throw new Error(resolveSupplyErrorMessage(response.status, body, "No se pudo eliminar insumo."));
  }
}

export async function searchMedicalInventory(q: string): Promise<MedicalInventorySearchItem[]> {
  const query = encodeURIComponent(q.trim());
  const response = await fetch(`/api/medical/inventory/search?q=${query}`, { cache: "no-store" });
  const body = (await response.json().catch(() => null)) as InventoryApiResponse | null;
  if (!response.ok || !body?.ok) {
    throw new Error(body?.error || "No se pudo buscar insumos en inventario.");
  }
  const rows = Array.isArray(body.data?.items) ? body.data.items : [];
  return rows.map(normalizeInventoryItem).filter((item): item is MedicalInventorySearchItem => Boolean(item));
}
