import type {
  EncounterOrderRequestItem,
  EncounterOrderRequestModality,
  EncounterOrderRequestPriority,
  EncounterOrderRequestStatus
} from "@/components/medical/encounter/types";

export type EncounterOrderPostPayload = {
  modality: EncounterOrderRequestModality;
  serviceId: string | null;
  serviceCode: string | null;
  title: string;
  quantity: number;
  notes: string | null;
  priority: EncounterOrderRequestPriority;
  status?: EncounterOrderRequestStatus;
};

export type EncounterOrderPatchPayload = {
  notes?: string | null;
  priority?: EncounterOrderRequestPriority;
  status?: EncounterOrderRequestStatus;
};

export type MedicalServiceSearchItem = {
  id: string;
  code: string | null;
  title: string;
  modality: EncounterOrderRequestModality;
  price: number | null;
};

type OrdersApiResponse = {
  ok?: boolean;
  error?: string;
  code?: string;
  data?: {
    items?: unknown[];
    total?: number;
  } | EncounterOrderRequestItem;
};

type ServiceSearchApiResponse = {
  ok?: boolean;
  error?: string;
  data?: {
    items?: unknown[];
    total?: number;
  };
};

function resolveOrderErrorMessage(status: number, body: OrdersApiResponse | null, fallback: string) {
  if (body?.error && typeof body.error === "string") return body.error;
  if (status === 404) return "Encounter no encontrado.";
  if (status === 409 && body?.code === "ENCOUNTER_CLOSED") return "Consulta cerrada: no se pueden modificar órdenes médicas.";
  if (status === 409) return "Consulta firmada: no se pueden modificar órdenes médicas.";
  return fallback;
}

function normalizeModality(raw: unknown): EncounterOrderRequestModality {
  if (raw === "RX" || raw === "USG") return raw;
  return "LAB";
}

function normalizePriority(raw: unknown): EncounterOrderRequestPriority {
  return raw === "urgent" ? "urgent" : "routine";
}

function normalizeStatus(raw: unknown): EncounterOrderRequestStatus {
  if (raw === "in_progress" || raw === "completed" || raw === "cancelled") return raw;
  return "ordered";
}

function normalizeOrder(raw: unknown): EncounterOrderRequestItem | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.encounterId !== "string" || typeof row.title !== "string") return null;
  const quantityRaw = Number(row.quantity);
  return {
    id: row.id,
    encounterId: row.encounterId,
    modality: normalizeModality(row.modality),
    assignedToService:
      row.assignedToService === "LAB" || row.assignedToService === "RX" || row.assignedToService === "USG"
        ? (row.assignedToService as EncounterOrderRequestModality)
        : null,
    serviceId: typeof row.serviceId === "string" && row.serviceId.trim().length > 0 ? row.serviceId : null,
    serviceCode: typeof row.serviceCode === "string" && row.serviceCode.trim().length > 0 ? row.serviceCode : null,
    title: row.title,
    quantity: Number.isFinite(quantityRaw) && quantityRaw > 0 ? Math.round(quantityRaw) : 1,
    notes: typeof row.notes === "string" && row.notes.trim().length > 0 ? row.notes : null,
    priority: normalizePriority(row.priority),
    status: normalizeStatus(row.status),
    createdAt: typeof row.createdAt === "string" ? row.createdAt : new Date(0).toISOString(),
    createdByName: typeof row.createdByName === "string" && row.createdByName.trim().length > 0 ? row.createdByName : "Médico responsable",
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : (typeof row.createdAt === "string" ? row.createdAt : new Date(0).toISOString()),
    updatedByName: typeof row.updatedByName === "string" && row.updatedByName.trim().length > 0 ? row.updatedByName : null
  };
}

function normalizeServiceSearchItem(raw: unknown): MedicalServiceSearchItem | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.title !== "string") return null;

  const priceRaw = row.price;
  const price =
    priceRaw === null || priceRaw === undefined || priceRaw === ""
      ? null
      : Number.isFinite(Number(priceRaw))
        ? Number(priceRaw)
        : null;

  return {
    id: row.id,
    code: typeof row.code === "string" && row.code.trim().length > 0 ? row.code : null,
    title: row.title,
    modality: normalizeModality(row.modality),
    price
  };
}

export async function fetchEncounterOrders(encounterId: string): Promise<EncounterOrderRequestItem[]> {
  const encodedId = encodeURIComponent(encounterId);
  const response = await fetch(`/api/medical/encounters/${encodedId}/orders`, { cache: "no-store" });
  const body = (await response.json().catch(() => null)) as OrdersApiResponse | null;
  if (!response.ok || !body?.ok) {
    throw new Error(resolveOrderErrorMessage(response.status, body, "No se pudieron obtener órdenes médicas."));
  }
  const rows = Array.isArray((body.data as { items?: unknown[] } | undefined)?.items)
    ? ((body.data as { items?: unknown[] }).items || [])
    : [];
  return rows.map(normalizeOrder).filter((item): item is EncounterOrderRequestItem => Boolean(item));
}

export async function postEncounterOrder(encounterId: string, payload: EncounterOrderPostPayload): Promise<EncounterOrderRequestItem> {
  const encodedId = encodeURIComponent(encounterId);
  const response = await fetch(`/api/medical/encounters/${encodedId}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const body = (await response.json().catch(() => null)) as OrdersApiResponse | null;
  if (!response.ok || !body?.ok) {
    throw new Error(resolveOrderErrorMessage(response.status, body, "No se pudo guardar orden médica."));
  }
  const row = normalizeOrder(body.data);
  if (!row) throw new Error("Respuesta inválida al guardar orden médica.");
  return row;
}

export async function patchEncounterOrder(
  encounterId: string,
  orderId: string,
  payload: EncounterOrderPatchPayload
): Promise<EncounterOrderRequestItem> {
  const encodedId = encodeURIComponent(encounterId);
  const encodedOrderId = encodeURIComponent(orderId);
  const response = await fetch(`/api/medical/encounters/${encodedId}/orders/${encodedOrderId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const body = (await response.json().catch(() => null)) as OrdersApiResponse | null;
  if (!response.ok || !body?.ok) {
    throw new Error(resolveOrderErrorMessage(response.status, body, "No se pudo actualizar orden médica."));
  }
  const row = normalizeOrder(body.data);
  if (!row) throw new Error("Respuesta inválida al actualizar orden médica.");
  return row;
}

export async function deleteEncounterOrder(encounterId: string, orderId: string): Promise<void> {
  const encodedId = encodeURIComponent(encounterId);
  const encodedOrderId = encodeURIComponent(orderId);
  const response = await fetch(`/api/medical/encounters/${encodedId}/orders/${encodedOrderId}`, { method: "DELETE" });
  const body = (await response.json().catch(() => null)) as OrdersApiResponse | null;
  if (!response.ok || !body?.ok) {
    throw new Error(resolveOrderErrorMessage(response.status, body, "No se pudo eliminar orden médica."));
  }
}

export async function searchMedicalServices(
  q: string,
  modality: EncounterOrderRequestModality | "ALL" = "ALL"
): Promise<MedicalServiceSearchItem[]> {
  const params = new URLSearchParams();
  params.set("q", q.trim());
  if (modality !== "ALL") params.set("modality", modality);
  const response = await fetch(`/api/medical/services/search?${params.toString()}`, { cache: "no-store" });
  const body = (await response.json().catch(() => null)) as ServiceSearchApiResponse | null;
  if (!response.ok || !body?.ok) {
    throw new Error(body?.error || "No se pudo buscar catálogo de servicios.");
  }
  const rows = Array.isArray(body.data?.items) ? body.data.items : [];
  return rows.map(normalizeServiceSearchItem).filter((item): item is MedicalServiceSearchItem => Boolean(item));
}
