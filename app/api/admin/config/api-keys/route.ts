import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auditLog } from "@/lib/audit";
import {
  conflict409,
  isCentralConfigCompatError,
  requireConfigCentralCapability,
  server500,
  service503,
  validation422,
  warnDevCentralCompat
} from "@/lib/config-central";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createApiKeySchema = z
  .object({
    name: z.string().trim().min(3).max(120),
    scopes: z.array(z.string().trim().min(2).max(80)).min(1).max(30)
  })
  .strict();

type AdminApiKeyRow = {
  id: string;
  name: string;
  scopes: string[];
  secretLast4: string;
  createdAt: Date;
  revokedAt: Date | null;
  createdByUserId: string | null;
};

function normalizeScopes(values: string[]) {
  const normalized = values
    .map((value) => value.trim().toUpperCase())
    .filter((value) => value.length > 0);

  const invalid = normalized.filter((value) => !/^[A-Z0-9:_-]{2,80}$/.test(value));
  if (invalid.length > 0) {
    return {
      ok: false as const,
      issues: invalid.map((value) => ({
        path: "scopes",
        message: `Scope inválido: ${value}`
      }))
    };
  }

  return {
    ok: true as const,
    scopes: Array.from(new Set(normalized)).sort((left, right) => left.localeCompare(right))
  };
}

function buildApiKeySecret() {
  return `smk_${crypto.randomBytes(24).toString("base64url")}`;
}

function buildApiKeyHash(secret: string) {
  const pepper = process.env.API_KEY_PEPPER || process.env.AUTH_SECRET || "dev-star-secret";
  return crypto.createHash("sha256").update(`${secret}:${pepper}`).digest("hex");
}

function serializeRow(row: AdminApiKeyRow) {
  return {
    id: row.id,
    name: row.name,
    scopes: row.scopes,
    last4: row.secretLast4,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
    status: row.revokedAt ? "revoked" : "active"
  };
}

function dbNotReadyResponse() {
  return service503("DB_NOT_READY", "Configuración de API keys no disponible. Ejecuta migraciones y prisma generate.");
}

function getAdminApiKeyDelegate() {
  return (prisma as unknown as {
    adminApiKey?: {
      findMany?: typeof prisma.adminApiKey.findMany;
      create?: typeof prisma.adminApiKey.create;
    };
  }).adminApiKey;
}

export async function GET(req: NextRequest) {
  const auth = await requireConfigCentralCapability(req, "CONFIG_API_READ");
  if (auth.response) return auth.response;

  const status = req.nextUrl.searchParams.get("status")?.trim() || "all";
  const delegate = getAdminApiKeyDelegate();
  if (!delegate?.findMany) {
    warnDevCentralCompat("config.apiKeys.list", new Error("Prisma delegate missing: adminApiKey"));
    return dbNotReadyResponse();
  }

  try {
    const rows = await delegate.findMany({
      where:
        status === "active"
          ? { revokedAt: null }
          : status === "revoked"
            ? { revokedAt: { not: null } }
            : {},
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        scopes: true,
        secretLast4: true,
        createdAt: true,
        revokedAt: true,
        createdByUserId: true
      }
    });

    return NextResponse.json({ ok: true, data: { items: rows.map(serializeRow) } });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.apiKeys.list", error);
      return dbNotReadyResponse();
    }

    const message = error instanceof Error ? error.message : "No se pudo listar API keys.";
    return server500(message);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireConfigCentralCapability(req, "CONFIG_API_WRITE");
  if (auth.response) return auth.response;
  const delegate = getAdminApiKeyDelegate();
  if (!delegate?.create) {
    warnDevCentralCompat("config.apiKeys.create", new Error("Prisma delegate missing: adminApiKey"));
    return dbNotReadyResponse();
  }

  try {
    const body = await req.json().catch(() => null);
    const parsed = createApiKeySchema.safeParse(body ?? {});
    if (!parsed.success) {
      return validation422(
        "Datos inválidos para API key.",
        parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      );
    }

    const normalizedScopes = normalizeScopes(parsed.data.scopes);
    if (!normalizedScopes.ok) {
      return validation422("Scopes inválidos.", normalizedScopes.issues);
    }

    let secret = "";
    let saved: AdminApiKeyRow | null = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      secret = buildApiKeySecret();
      const keyHash = buildApiKeyHash(secret);
      try {
        saved = await delegate.create({
          data: {
            name: parsed.data.name,
            scopes: normalizedScopes.scopes,
            keyHash,
            secretLast4: secret.slice(-4),
            createdByUserId: auth.user?.id ?? null
          },
          select: {
            id: true,
            name: true,
            scopes: true,
            secretLast4: true,
            createdAt: true,
            revokedAt: true,
            createdByUserId: true
          }
        });
        break;
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code?: string }).code === "P2002"
        ) {
          continue;
        }
        throw error;
      }
    }

    if (!saved) {
      return conflict409("No se pudo generar una API key única. Intenta de nuevo.");
    }

    await auditLog({
      action: "API_KEY_CREATED",
      entityType: "AdminApiKey",
      entityId: saved.id,
      user: auth.user,
      req,
      metadata: {
        name: saved.name,
        scopes: saved.scopes,
        last4: saved.secretLast4
      }
    });

    return NextResponse.json(
      {
        ok: true,
        data: {
          item: serializeRow(saved),
          secret
        }
      },
      { status: 201 }
    );
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.apiKeys.create", error);
      return dbNotReadyResponse();
    }

    const message = error instanceof Error ? error.message : "No se pudo crear API key.";
    return server500(message);
  }
}
