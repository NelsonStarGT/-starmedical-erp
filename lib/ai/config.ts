import { ApiIntegrationKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/security/crypto";

const DEFAULT_TIMEZONE = "America/Guatemala";

export type AiSettings = {
  enabled: boolean;
  apiKey: string | null;
  photoSafetyEnabled: boolean;
  defaultTimezone: string;
};

export function ensureEncryptionKey() {
  const key = process.env.APP_ENCRYPTION_KEY;
  if (!key) {
    throw { status: 400, body: { error: "APP_ENCRYPTION_KEY es requerido para guardar la clave", code: "MISSING_ENCRYPTION_KEY" } };
  }
  return key;
}

export async function loadAiSettings(): Promise<AiSettings> {
  const [settings, openaiConfig] = await prisma.$transaction([
    prisma.hrSettings.findUnique({ where: { id: 1 } }),
    prisma.apiIntegrationConfig.findUnique({ where: { key: ApiIntegrationKey.OPENAI } })
  ]);

  let apiKey: string | null = null;
  if (openaiConfig?.apiKeyEnc) {
    try {
      apiKey = decryptSecret(openaiConfig.apiKeyEnc);
    } catch (err) {
      console.error("[openai] No se pudo descifrar API key", err);
    }
  }

  if (!apiKey && process.env.OPENAI_API_KEY) {
    apiKey = process.env.OPENAI_API_KEY;
  }

  const enabled = openaiConfig?.isEnabled ?? Boolean(settings?.openaiEnabled);
  return {
    enabled: Boolean(enabled),
    apiKey,
    photoSafetyEnabled: Boolean(settings?.photoSafetyEnabled),
    defaultTimezone: settings?.defaultTimezone || DEFAULT_TIMEZONE
  };
}
