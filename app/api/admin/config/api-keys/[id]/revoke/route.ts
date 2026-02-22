import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import {
  isCentralConfigCompatError,
  notFound404,
  requireConfigCentralCapability,
  server500,
  service503,
  warnDevCentralCompat
} from "@/lib/config-central";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const auth = requireConfigCentralCapability(req, "CONFIG_API_WRITE");
  if (auth.response) return auth.response;

  const resolved = await resolveParams(params);
  const delegate = getAdminApiKeyDelegate();
  if (!delegate?.findUnique || !delegate?.update) {
    warnDevCentralCompat("config.apiKeys.revoke", new Error("Prisma delegate missing: adminApiKey"));
    return dbNotReadyResponse();
  }

  try {
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
      return NextResponse.json({
        ok: true,
        data: {
          alreadyRevoked: true,
          item: serializeRow(current)
        }
      });
    }

    const revokedAt = new Date();
    const updated = await delegate.update({
      where: { id: resolved.id },
      data: { revokedAt },
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

    await auditLog({
      action: "API_KEY_REVOKED",
      entityType: "AdminApiKey",
      entityId: updated.id,
      user: auth.user,
      req,
      metadata: {
        revokedAt: revokedAt.toISOString(),
        last4: updated.secretLast4
      }
    });

    return NextResponse.json({
      ok: true,
      data: {
        alreadyRevoked: false,
        item: serializeRow(updated)
      }
    });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.apiKeys.revoke", error);
      return dbNotReadyResponse();
    }

    const message = error instanceof Error ? error.message : "No se pudo revocar API key.";
    return server500(message);
  }
}
