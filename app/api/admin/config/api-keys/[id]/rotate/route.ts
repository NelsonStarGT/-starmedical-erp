import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import {
  isCentralConfigCompatError,
  notFound404,
  requireConfigCentralCapability,
  server500,
  service503,
  validation422,
  warnDevCentralCompat
} from "@/lib/config-central";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildApiKeySecret() {
  return `smk_${crypto.randomBytes(24).toString("base64url")}`;
}

function buildApiKeyHash(secret: string) {
  const pepper = process.env.API_KEY_PEPPER || process.env.AUTH_SECRET || "dev-star-secret";
  return crypto.createHash("sha256").update(`${secret}:${pepper}`).digest("hex");
}

function serializeRow(row: {
  id: string;
  name: string;
  scopes: string[];
  secretLast4: string;
  createdAt: Date;
  revokedAt: Date | null;
  createdByUserId: string | null;
}) {
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
      findUnique?: typeof prisma.adminApiKey.findUnique;
      update?: typeof prisma.adminApiKey.update;
      create?: typeof prisma.adminApiKey.create;
    };
  }).adminApiKey;
}

async function resolveParams(
  params: { id: string } | Promise<{ id: string }>
): Promise<{ id: string }> {
  if ("then" in params) return params;
  return params;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const auth = await requireConfigCentralCapability(req, "CONFIG_API_WRITE");
  if (auth.response) return auth.response;

  const resolved = await resolveParams(params);
  const delegate = getAdminApiKeyDelegate();
  if (!delegate?.findUnique || !delegate?.update || !delegate?.create) {
    warnDevCentralCompat("config.apiKeys.rotate", new Error("Prisma delegate missing: adminApiKey"));
    return dbNotReadyResponse();
  }

  try {
    const now = new Date();

    const current = await delegate.findUnique({
      where: { id: resolved.id },
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

    if (!current) {
      return notFound404("API key no encontrada.");
    }

    if (current.revokedAt) {
      return validation422("No se puede rotar una API key revocada. Crea una nueva.", [
        {
          path: "id",
          message: "La API key ya está revocada."
        }
      ]);
    }

    let secret = "";
    let created: {
      id: string;
      name: string;
      scopes: string[];
      secretLast4: string;
      createdAt: Date;
      revokedAt: Date | null;
      createdByUserId: string | null;
    } | null = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      secret = buildApiKeySecret();
      const keyHash = buildApiKeyHash(secret);

      try {
        created = await prisma.$transaction(async (tx) => {
          const txClient = tx as typeof prisma;
          await txClient.adminApiKey.update({
            where: { id: resolved.id },
            data: { revokedAt: now }
          });

          return txClient.adminApiKey.create({
            data: {
              name: current.name,
              scopes: current.scopes,
              keyHash,
              secretLast4: secret.slice(-4),
              createdByUserId: auth.user?.id ?? null,
              rotatedFromId: current.id
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

    if (!created) {
      return validation422("No se pudo rotar la API key. Intenta nuevamente.");
    }

    await auditLog({
      action: "API_KEY_ROTATED",
      entityType: "AdminApiKey",
      entityId: created.id,
      user: auth.user,
      req,
      metadata: {
        previousId: current.id,
        previousLast4: current.secretLast4,
        newLast4: created.secretLast4,
        scopes: created.scopes
      }
    });

    return NextResponse.json({
      ok: true,
      data: {
        item: serializeRow(created),
        secret
      }
    });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.apiKeys.rotate", error);
      return dbNotReadyResponse();
    }

    const message = error instanceof Error ? error.message : "No se pudo rotar API key.";
    return server500(message);
  }
}
