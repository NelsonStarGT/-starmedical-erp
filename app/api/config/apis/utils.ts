import { ApiIntegrationConfig, ApiIntegrationKey } from "@prisma/client";

const VALID_KEYS = Object.values(ApiIntegrationKey);

export function normalizeKey(raw: any): ApiIntegrationKey {
  const key = String(raw || "").toUpperCase();
  if (VALID_KEYS.includes(key as ApiIntegrationKey)) return key as ApiIntegrationKey;
  throw new Error("key inválido");
}

export function normalizeName(raw: any, required = false): string | undefined {
  if (raw === undefined) {
    if (required) throw new Error("name requerido");
    return undefined;
  }
  const name = String(raw || "").trim();
  if (!name) throw new Error("name requerido");
  return name;
}

export function normalizeBaseUrl(raw: any): string | null | undefined {
  if (raw === undefined) return undefined;
  const value = String(raw || "").trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.toString().replace(/\/$/, "");
  } catch {
    throw new Error("baseUrl inválida");
  }
}

export function normalizeExtraJson(raw: any): string | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    JSON.parse(trimmed);
    return trimmed;
  }
  return JSON.stringify(raw);
}

export function serializeConfig(record: ApiIntegrationConfig) {
  return {
    id: record.id,
    key: record.key,
    name: record.name,
    isEnabled: record.isEnabled,
    baseUrl: record.baseUrl,
    extraJson: record.extraJson,
    hasApiKey: Boolean(record.apiKeyEnc),
    hasSecret: Boolean(record.apiSecretEnc),
    hasToken: Boolean(record.tokenEnc),
    lastTestAt: record.lastTestAt,
    lastTestError: record.lastTestError
  };
}

export function shouldPersistSecret(raw: any) {
  return typeof raw === "string" && raw.trim().length > 0;
}
