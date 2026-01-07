import { ApiIntegrationKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/security/crypto";

export type ApiIntegrationResolvedConfig = {
  id: string;
  key: ApiIntegrationKey;
  name: string;
  isEnabled: boolean;
  baseUrl?: string | null;
  apiKey?: string | null;
  apiSecret?: string | null;
  token?: string | null;
  extra?: unknown;
  lastTestAt?: Date | null;
  lastTestError?: string | null;
};

function ensureServerSide() {
  if (typeof window !== "undefined") {
    throw new Error("getApiConfig solo puede ejecutarse en el servidor");
  }
}

function parseJson(raw?: string | null) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function getApiConfig(key: ApiIntegrationKey): Promise<ApiIntegrationResolvedConfig | null> {
  ensureServerSide();
  const record = await prisma.apiIntegrationConfig.findUnique({ where: { key } });
  if (!record) return null;

  return {
    id: record.id,
    key: record.key,
    name: record.name,
    isEnabled: record.isEnabled,
    baseUrl: record.baseUrl,
    apiKey: record.apiKeyEnc ? decryptSecret(record.apiKeyEnc) : null,
    apiSecret: record.apiSecretEnc ? decryptSecret(record.apiSecretEnc) : null,
    token: record.tokenEnc ? decryptSecret(record.tokenEnc) : null,
    extra: parseJson(record.extraJson),
    lastTestAt: record.lastTestAt,
    lastTestError: record.lastTestError
  };
}
