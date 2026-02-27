import { ApiIntegrationKey } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auditLog } from "@/lib/audit";
import {
  isCentralConfigCompatError,
  requireConfigCentralCapability,
  server500,
  service503,
  validation422,
  warnDevCentralCompat
} from "@/lib/config-central";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/security/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const keySchema = z.nativeEnum(ApiIntegrationKey);

const upsertConnectorSchema = z
  .object({
    key: keySchema,
    name: z.string().trim().min(2).max(120).optional(),
    enabled: z.boolean().optional(),
    baseUrl: z
      .string()
      .trim()
      .max(1024)
      .optional()
      .nullable(),
    config: z.record(z.string(), z.unknown()).optional(),
    secret: z.string().trim().min(8).max(4096).optional(),
    clearSecret: z.boolean().optional()
  })
  .strict();

function dbNotReadyResponse() {
  return service503("DB_NOT_READY", "Framework de integraciones no disponible. Ejecuta migraciones y prisma generate.");
}

function safeParseJson(value: string | null) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function serializeConnector(row: {
  id: string;
  key: ApiIntegrationKey;
  name: string;
  isEnabled: boolean;
  baseUrl: string | null;
  apiKeyEnc: string | null;
  apiSecretEnc: string | null;
  tokenEnc: string | null;
  extraJson: string | null;
  lastTestAt: Date | null;
  lastTestError: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    enabled: row.isEnabled,
    baseUrl: row.baseUrl,
    hasSecret: Boolean(row.apiKeyEnc || row.apiSecretEnc || row.tokenEnc),
    config: safeParseJson(row.extraJson),
    lastCheckAt: row.lastTestAt ? row.lastTestAt.toISOString() : null,
    lastError: row.lastTestError,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireConfigCentralCapability(req, "CONFIG_API_READ");
  if (auth.response) return auth.response;

  try {
    const rows = await prisma.apiIntegrationConfig.findMany({
      orderBy: [{ key: "asc" }],
      select: {
        id: true,
        key: true,
        name: true,
        isEnabled: true,
        baseUrl: true,
        apiKeyEnc: true,
        apiSecretEnc: true,
        tokenEnc: true,
        extraJson: true,
        lastTestAt: true,
        lastTestError: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({ ok: true, data: { items: rows.map(serializeConnector) } });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.integrations.list", error);
      return dbNotReadyResponse();
    }

    const message = error instanceof Error ? error.message : "No se pudo listar conectores.";
    return server500(message);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireConfigCentralCapability(req, "CONFIG_API_WRITE");
  if (auth.response) return auth.response;

  try {
    const body = await req.json().catch(() => null);
    const parsed = upsertConnectorSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return validation422(
        "Datos inválidos para conector.",
        parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      );
    }

    const existing = await prisma.apiIntegrationConfig.findUnique({
      where: { key: parsed.data.key },
      select: {
        id: true,
        key: true,
        name: true,
        isEnabled: true,
        baseUrl: true,
        apiKeyEnc: true,
        apiSecretEnc: true,
        tokenEnc: true,
        extraJson: true,
        lastTestAt: true,
        lastTestError: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (parsed.data.baseUrl) {
      try {
        new URL(parsed.data.baseUrl);
      } catch {
        return validation422("URL inválida para conector.", [
          {
            path: "baseUrl",
            message: "Debe ser una URL absoluta (http/https)."
          }
        ]);
      }
    }

    const payload = {
      name: parsed.data.name || existing?.name || parsed.data.key,
      isEnabled: parsed.data.enabled ?? existing?.isEnabled ?? false,
      baseUrl: typeof parsed.data.baseUrl === "string" ? parsed.data.baseUrl : existing?.baseUrl ?? null,
      extraJson:
        parsed.data.config && Object.keys(parsed.data.config).length > 0
          ? JSON.stringify(parsed.data.config)
          : existing?.extraJson ?? null,
      ...(parsed.data.secret ? { apiKeyEnc: encryptSecret(parsed.data.secret) } : {}),
      ...(parsed.data.clearSecret
        ? {
            apiKeyEnc: null,
            apiSecretEnc: null,
            tokenEnc: null
          }
        : {})
    };

    const saved = await prisma.apiIntegrationConfig.upsert({
      where: { key: parsed.data.key },
      update: payload,
      create: {
        key: parsed.data.key,
        ...payload
      },
      select: {
        id: true,
        key: true,
        name: true,
        isEnabled: true,
        baseUrl: true,
        apiKeyEnc: true,
        apiSecretEnc: true,
        tokenEnc: true,
        extraJson: true,
        lastTestAt: true,
        lastTestError: true,
        createdAt: true,
        updatedAt: true
      }
    });

    const toggled = existing && existing.isEnabled !== saved.isEnabled;

    await auditLog({
      action: toggled ? "INTEGRATION_TOGGLED" : "INTEGRATION_UPDATED",
      entityType: "ApiIntegrationConfig",
      entityId: saved.id,
      user: auth.user,
      req,
      metadata: {
        key: saved.key,
        enabled: saved.isEnabled,
        rotatedSecret: Boolean(parsed.data.secret),
        clearSecret: Boolean(parsed.data.clearSecret)
      }
    });

    return NextResponse.json({ ok: true, data: { item: serializeConnector(saved) } });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.integrations.upsert", error);
      return dbNotReadyResponse();
    }

    const message = error instanceof Error ? error.message : "No se pudo guardar conector.";
    return server500(message);
  }
}
