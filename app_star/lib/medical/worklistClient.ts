import type { EncounterResult, EncounterResultValueRow } from "@/components/medical/encounter/types";

export type WorklistModality = "LAB" | "RX" | "USG";
export type WorklistOrderStatus = "ordered" | "in_progress" | "completed" | "cancelled";
export type WorklistOrderPriority = "routine" | "urgent";

export type WorklistOrderItem = {
  orderId: string;
  encounterId: string;
  patientName: string;
  serviceTitle: string;
  priority: WorklistOrderPriority;
  status: WorklistOrderStatus;
  modality: WorklistModality;
  createdAt: string;
  updatedAt: string;
};

type WorklistApiResponse = {
  ok?: boolean;
  error?: string;
  code?: string;
  data?: {
    items?: unknown[];
    total?: number;
  };
};

type OrderStatusApiResponse = {
  ok?: boolean;
  error?: string;
  code?: string;
  data?: {
    order?: unknown;
    generatedResult?: unknown;
  };
};

type UploadResultApiResponse = {
  ok?: boolean;
  error?: string;
  code?: string;
  data?: {
    result?: unknown;
  };
};

function normalizeStatus(raw: unknown): WorklistOrderStatus {
  if (raw === "in_progress" || raw === "completed" || raw === "cancelled") return raw;
  return "ordered";
}

function normalizePriority(raw: unknown): WorklistOrderPriority {
  return raw === "urgent" ? "urgent" : "routine";
}

function normalizeModality(raw: unknown): WorklistModality {
  if (raw === "RX" || raw === "USG") return raw;
  return "LAB";
}

function normalizeWorklistItem(raw: unknown): WorklistOrderItem | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.orderId !== "string" || typeof row.encounterId !== "string" || typeof row.serviceTitle !== "string") return null;
  return {
    orderId: row.orderId,
    encounterId: row.encounterId,
    patientName: typeof row.patientName === "string" && row.patientName.trim().length > 0 ? row.patientName : "Paciente",
    serviceTitle: row.serviceTitle,
    priority: normalizePriority(row.priority),
    status: normalizeStatus(row.status),
    modality: normalizeModality(row.modality),
    createdAt: typeof row.createdAt === "string" ? row.createdAt : new Date(0).toISOString(),
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : (typeof row.createdAt === "string" ? row.createdAt : new Date(0).toISOString())
  };
}

function normalizeResultValue(raw: unknown): EncounterResultValueRow | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.parameter !== "string" || typeof row.value !== "string") return null;
  return {
    parameter: row.parameter,
    value: row.value,
    range: typeof row.range === "string" ? row.range : null,
    flag: typeof row.flag === "string" ? row.flag : null
  };
}

function normalizeEncounterResult(raw: unknown): EncounterResult | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.title !== "string") return null;
  const values = Array.isArray(row.values) ? row.values.map(normalizeResultValue).filter((item): item is EncounterResultValueRow => Boolean(item)) : [];
  return {
    id: row.id,
    title: row.title,
    type: normalizeModality(row.type),
    status: row.status === "ready" || row.status === "in_progress" ? row.status : "pending",
    performedAt: typeof row.performedAt === "string" ? row.performedAt : new Date(0).toISOString(),
    pdfUrl: typeof row.pdfUrl === "string" && row.pdfUrl.trim().length > 0 ? row.pdfUrl : null,
    imageUrls: Array.isArray(row.imageUrls) ? row.imageUrls.filter((item): item is string => typeof item === "string") : [],
    values,
    sourceOrderRequestId: typeof row.sourceOrderRequestId === "string" ? row.sourceOrderRequestId : null
  };
}

function resolveError(response: Response, body: { error?: string } | null, fallback: string) {
  if (body?.error && typeof body.error === "string") return body.error;
  if (response.status === 403) return "No autorizado para esta acción.";
  if (response.status === 404) return "Orden no encontrada.";
  if (response.status === 409) return "Acción no permitida para el estado actual.";
  return fallback;
}

export async function fetchWorklistOrders(params: {
  modality: WorklistModality;
  priority?: WorklistOrderPriority | "all";
  query?: string;
  dateFrom?: string;
  dateTo?: string;
  statuses?: WorklistOrderStatus[];
}): Promise<WorklistOrderItem[]> {
  const qp = new URLSearchParams();
  qp.set("modality", params.modality);
  if (params.priority && params.priority !== "all") qp.set("priority", params.priority);
  if (params.query && params.query.trim().length > 0) qp.set("query", params.query.trim());
  if (params.dateFrom) qp.set("dateFrom", params.dateFrom);
  if (params.dateTo) qp.set("dateTo", params.dateTo);
  if (params.statuses && params.statuses.length > 0) {
    for (const status of params.statuses) qp.append("status", status);
  }

  const response = await fetch(`/api/medical/worklist?${qp.toString()}`, { cache: "no-store" });
  const body = (await response.json().catch(() => null)) as WorklistApiResponse | null;
  if (!response.ok || !body?.ok) {
    throw new Error(resolveError(response, body, "No se pudo cargar la worklist."));
  }
  const rows = Array.isArray(body.data?.items) ? body.data.items : [];
  return rows.map(normalizeWorklistItem).filter((item): item is WorklistOrderItem => Boolean(item));
}

export async function patchWorklistOrderStatus(params: {
  orderId: string;
  status: WorklistOrderStatus;
}): Promise<{ order: WorklistOrderItem; generatedResult: EncounterResult | null }> {
  const response = await fetch(`/api/medical/orders/${encodeURIComponent(params.orderId)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: params.status })
  });
  const body = (await response.json().catch(() => null)) as OrderStatusApiResponse | null;
  if (!response.ok || !body?.ok) {
    throw new Error(resolveError(response, body, "No se pudo cambiar el estado de la orden."));
  }

  const order = normalizeWorklistItem(body.data?.order);
  if (!order) throw new Error("Respuesta inválida al actualizar la orden.");
  const generatedResult = normalizeEncounterResult(body.data?.generatedResult) || null;
  return { order, generatedResult };
}

export async function uploadWorklistOrderResult(params: {
  orderId: string;
  pdfUrl?: string | null;
  imageUrls?: string[];
  values?: EncounterResultValueRow[];
  markReady?: boolean;
}): Promise<EncounterResult> {
  const response = await fetch(`/api/medical/orders/${encodeURIComponent(params.orderId)}/result`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pdfUrl: params.pdfUrl,
      imageUrls: params.imageUrls,
      values: params.values,
      markReady: params.markReady
    })
  });
  const body = (await response.json().catch(() => null)) as UploadResultApiResponse | null;
  if (!response.ok || !body?.ok) {
    throw new Error(resolveError(response, body, "No se pudo cargar el resultado."));
  }
  const result = normalizeEncounterResult(body.data?.result);
  if (!result) throw new Error("Respuesta inválida al cargar resultado.");
  return result;
}
