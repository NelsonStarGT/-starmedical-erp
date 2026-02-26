import { normalizeTenantId } from "@/lib/tenant";
import {
  CLIENTS_DATE_FORMAT_DEFAULT,
  normalizeClientsDateFormat,
  type ClientsDateFormat
} from "@/lib/clients/dateFormat";
import {
  getTenantDateTimeConfig,
  updateTenantDateTimeConfig
} from "@/lib/datetime/config";

export type TenantClientsDateFormatSnapshot = {
  tenantId: string;
  clientsDateFormat: ClientsDateFormat;
  updatedByUserId: string | null;
  updatedAt: string | null;
  source: "db" | "defaults";
};

const clientsDateFormatCache = new Map<string, ClientsDateFormat>();

export function buildTenantClientsDateFormatDefaults(tenantIdInput: unknown): TenantClientsDateFormatSnapshot {
  const tenantId = normalizeTenantId(tenantIdInput);
  return {
    tenantId,
    clientsDateFormat: CLIENTS_DATE_FORMAT_DEFAULT,
    updatedByUserId: null,
    updatedAt: null,
    source: "defaults"
  };
}

export async function getTenantClientsDateFormatConfig(tenantIdInput: unknown): Promise<TenantClientsDateFormatSnapshot> {
  const tenantId = normalizeTenantId(tenantIdInput);
  const snapshot = await getTenantDateTimeConfig(tenantId);
  return {
    tenantId,
    clientsDateFormat: normalizeClientsDateFormat(snapshot.dateFormat),
    updatedByUserId: snapshot.updatedByUserId,
    updatedAt: snapshot.updatedAt,
    source: snapshot.source
  };
}

export async function getClientsDateFormat(tenantIdInput: unknown) {
  const tenantId = normalizeTenantId(tenantIdInput);
  const cached = clientsDateFormatCache.get(tenantId);
  if (cached) return cached;
  const snapshot = await getTenantClientsDateFormatConfig(tenantIdInput);
  clientsDateFormatCache.set(tenantId, snapshot.clientsDateFormat);
  return snapshot.clientsDateFormat;
}

export function clearClientsDateFormatCache(tenantIdInput?: unknown) {
  if (typeof tenantIdInput === "undefined") {
    clientsDateFormatCache.clear();
    return;
  }
  clientsDateFormatCache.delete(normalizeTenantId(tenantIdInput));
}

export async function updateTenantClientsDateFormat(input: {
  tenantId: unknown;
  clientsDateFormat: unknown;
  updatedByUserId?: string | null;
}): Promise<TenantClientsDateFormatSnapshot> {
  const tenantId = normalizeTenantId(input.tenantId);
  const clientsDateFormat = normalizeClientsDateFormat(input.clientsDateFormat);

  const updated = await updateTenantDateTimeConfig({
    tenantId,
    patch: { dateFormat: clientsDateFormat },
    updatedByUserId: input.updatedByUserId ?? null
  });

  const snapshot: TenantClientsDateFormatSnapshot = {
    tenantId,
    clientsDateFormat: normalizeClientsDateFormat(updated.dateFormat),
    updatedByUserId: updated.updatedByUserId,
    updatedAt: updated.updatedAt,
    source: updated.source
  };

  clientsDateFormatCache.set(tenantId, snapshot.clientsDateFormat);
  return snapshot;
}
