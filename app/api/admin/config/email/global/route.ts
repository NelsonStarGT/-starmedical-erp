import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import {
  isCentralConfigCompatError,
  requireConfigCentralCapability,
  server500,
  service503,
  validation422,
  warnDevCentralCompat
} from "@/lib/config-central";
import { encryptSecret } from "@/lib/email/crypto";
import { invalidateEmailCache } from "@/lib/email/mailer";
import { prisma } from "@/lib/prisma";
import { normalizeTenantId } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GlobalEmailConfigRecord = {
  id: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPasswordEnc: string;
  fromName: string;
  fromEmail: string;
  deliverabilityChecklist: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type TenantDeliverabilityStatus = {
  spf: boolean;
  dkim: boolean;
  dmarc: boolean;
  updatedAt: string | null;
};

type GlobalEmailConfigPublic = {
  id: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  fromName: string;
  fromEmail: string;
  hasPassword: boolean;
  deliverability: TenantDeliverabilityStatus;
  createdAt: Date;
  updatedAt: Date;
};

type GlobalEmailConfigDelegate = {
  findUnique: (args: { where: { id: string } }) => Promise<GlobalEmailConfigRecord | null>;
  upsert: (args: {
    where: { id: string };
    update: {
      smtpHost: string;
      smtpPort: number;
      smtpSecure: boolean;
      smtpUser: string;
      fromName: string;
      fromEmail: string;
      deliverabilityChecklist: unknown;
      smtpPasswordEnc?: string;
    };
    create: {
      id: string;
      smtpHost: string;
      smtpPort: number;
      smtpSecure: boolean;
      smtpUser: string;
      smtpPasswordEnc: string;
      fromName: string;
      fromEmail: string;
      deliverabilityChecklist: unknown;
    };
  }) => Promise<GlobalEmailConfigRecord>;
};

function getGlobalEmailConfigDelegate(): GlobalEmailConfigDelegate | null {
  const prismaClient = prisma as unknown as {
    globalEmailConfig?: GlobalEmailConfigDelegate;
  };

  return prismaClient.globalEmailConfig ?? null;
}

function normalizeDeliverabilityMap(value: unknown): Record<string, TenantDeliverabilityStatus> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const entries = Object.entries(value as Record<string, unknown>).map(([tenantId, snapshot]) => {
    const normalizedTenantId = normalizeTenantId(tenantId);
    const row = (snapshot && typeof snapshot === "object" ? snapshot : {}) as Partial<TenantDeliverabilityStatus>;
    return [
      normalizedTenantId,
      {
        spf: row.spf === true,
        dkim: row.dkim === true,
        dmarc: row.dmarc === true,
        updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : null
      }
    ] as const;
  });

  return Object.fromEntries(entries);
}

function resolveTenantDeliverability(
  map: Record<string, TenantDeliverabilityStatus>,
  tenantId: string
): TenantDeliverabilityStatus {
  const row = map[normalizeTenantId(tenantId)];
  if (!row) {
    return {
      spf: false,
      dkim: false,
      dmarc: false,
      updatedAt: null
    };
  }
  return row;
}

function toPublicRow(row: GlobalEmailConfigRecord, tenantId: string): GlobalEmailConfigPublic {
  const deliverabilityMap = normalizeDeliverabilityMap(row.deliverabilityChecklist);
  return {
    id: row.id,
    smtpHost: row.smtpHost,
    smtpPort: row.smtpPort,
    smtpSecure: row.smtpSecure,
    smtpUser: row.smtpUser,
    fromName: row.fromName,
    fromEmail: row.fromEmail,
    hasPassword: Boolean(row.smtpPasswordEnc),
    deliverability: resolveTenantDeliverability(deliverabilityMap, tenantId),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function dbNotReadyResponse() {
  return service503(
    "DB_NOT_READY",
    "Configuración de correo no disponible. Ejecuta migraciones y prisma generate."
  );
}

function isValidEmail(value: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

export async function GET(req: NextRequest) {
  const auth = requireConfigCentralCapability(req, "CONFIG_EMAIL_READ");
  if (auth.response) return auth.response;
  const tenantId = normalizeTenantId(auth.user?.tenantId);

  const delegate = getGlobalEmailConfigDelegate();
  if (!delegate) {
    warnDevCentralCompat("config.email.global.get", new Error("Prisma delegate missing: globalEmailConfig"));
    return dbNotReadyResponse();
  }

  try {
    const row = await delegate.findUnique({ where: { id: "global" } });
    return NextResponse.json({ ok: true, data: row ? toPublicRow(row, tenantId) : null });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.email.global.get", error);
      return dbNotReadyResponse();
    }

    const message = error instanceof Error ? error.message : "No se pudo cargar la configuración de correo.";
    console.error("[config.email.global.get]", error);
    return server500(message);
  }
}

export async function POST(req: NextRequest) {
  const auth = requireConfigCentralCapability(req, "CONFIG_EMAIL_WRITE");
  if (auth.response) return auth.response;
  const tenantId = normalizeTenantId(auth.user?.tenantId);

  const delegate = getGlobalEmailConfigDelegate();
  if (!delegate) {
    warnDevCentralCompat("config.email.global.update", new Error("Prisma delegate missing: globalEmailConfig"));
    return dbNotReadyResponse();
  }

  try {
    const body = (await req.json().catch(() => null)) as {
      smtpHost?: unknown;
      smtpPort?: unknown;
      smtpSecure?: unknown;
      smtpUser?: unknown;
      fromName?: unknown;
      fromEmail?: unknown;
      includePassword?: unknown;
      smtpPassword?: unknown;
      deliverability?: unknown;
    } | null;

    const smtpHost = typeof body?.smtpHost === "string" ? body.smtpHost.trim() : "";
    const smtpUser = typeof body?.smtpUser === "string" ? body.smtpUser.trim() : "";
    const fromName = typeof body?.fromName === "string" ? body.fromName.trim() : "";
    const fromEmail = typeof body?.fromEmail === "string" ? body.fromEmail.trim() : "";
    const includePassword = body?.includePassword === true;
    const smtpPassword = typeof body?.smtpPassword === "string" ? body.smtpPassword : "";
    const deliverabilityPatch =
      body?.deliverability && typeof body.deliverability === "object" && !Array.isArray(body.deliverability)
        ? (body.deliverability as { spf?: unknown; dkim?: unknown; dmarc?: unknown })
        : null;

    const parsedPort =
      typeof body?.smtpPort === "number"
        ? body.smtpPort
        : typeof body?.smtpPort === "string"
          ? Number(body.smtpPort)
          : Number.NaN;

    const issues: Array<{ path: string; message: string }> = [];

    if (!smtpHost) {
      issues.push({ path: "smtpHost", message: "SMTP host es requerido." });
    }

    if (!Number.isInteger(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
      issues.push({ path: "smtpPort", message: "SMTP port debe ser un entero entre 1 y 65535." });
    }

    if (!smtpUser) {
      issues.push({ path: "smtpUser", message: "SMTP user es requerido." });
    } else if (!isValidEmail(smtpUser)) {
      issues.push({ path: "smtpUser", message: "SMTP user debe ser un correo válido." });
    }

    if (!fromEmail) {
      issues.push({ path: "fromEmail", message: "From email es requerido." });
    } else if (!isValidEmail(fromEmail)) {
      issues.push({ path: "fromEmail", message: "From email debe ser un correo válido." });
    }

    if (includePassword && !smtpPassword.trim()) {
      issues.push({ path: "smtpPassword", message: "La contraseña es requerida cuando rotas credenciales." });
    }

    if (issues.length > 0) {
      return validation422("Configuración de correo inválida.", issues);
    }

    const existing = await delegate.findUnique({ where: { id: "global" } });
    if (!existing && !includePassword) {
      return validation422("Debe enviar contraseña la primera vez.", [
        {
          path: "smtpPassword",
          message: "Configura la contraseña SMTP inicial para activar el correo global."
        }
      ]);
    }

    let smtpPasswordEnc: string | undefined;
    if (includePassword) {
      smtpPasswordEnc = encryptSecret(smtpPassword.trim());
    }

    const currentDeliverabilityMap = normalizeDeliverabilityMap(existing?.deliverabilityChecklist);
    const nextDeliverabilityMap = { ...currentDeliverabilityMap };
    if (deliverabilityPatch) {
      nextDeliverabilityMap[tenantId] = {
        spf: deliverabilityPatch.spf === true,
        dkim: deliverabilityPatch.dkim === true,
        dmarc: deliverabilityPatch.dmarc === true,
        updatedAt: new Date().toISOString()
      };
    }

    const saved = await delegate.upsert({
      where: { id: "global" },
      update: {
        smtpHost,
        smtpPort: parsedPort,
        smtpSecure: body?.smtpSecure !== false,
        smtpUser,
        fromName,
        fromEmail,
        deliverabilityChecklist: nextDeliverabilityMap,
        ...(smtpPasswordEnc ? { smtpPasswordEnc } : {})
      },
      create: {
        id: "global",
        smtpHost,
        smtpPort: parsedPort,
        smtpSecure: body?.smtpSecure !== false,
        smtpUser,
        smtpPasswordEnc: smtpPasswordEnc || encryptSecret(smtpPassword.trim()),
        fromName,
        fromEmail,
        deliverabilityChecklist: nextDeliverabilityMap
      }
    });

    invalidateEmailCache();

    await auditLog({
      action: "EMAIL_UPDATED",
      entityType: "GlobalEmailConfig",
      entityId: "global",
      user: auth.user,
      req,
      before: existing
        ? {
            smtpHost: existing.smtpHost,
            smtpPort: existing.smtpPort,
            smtpSecure: existing.smtpSecure,
            smtpUser: existing.smtpUser,
            fromName: existing.fromName,
            fromEmail: existing.fromEmail,
            hasPassword: Boolean(existing.smtpPasswordEnc),
            deliverability: resolveTenantDeliverability(currentDeliverabilityMap, tenantId)
          }
        : null,
      after: {
        smtpHost: saved.smtpHost,
        smtpPort: saved.smtpPort,
        smtpSecure: saved.smtpSecure,
        smtpUser: saved.smtpUser,
        fromName: saved.fromName,
        fromEmail: saved.fromEmail,
        hasPassword: Boolean(saved.smtpPasswordEnc),
        deliverability: resolveTenantDeliverability(nextDeliverabilityMap, tenantId)
      },
      metadata: {
        rotatedPassword: includePassword,
        channel: "smtp",
        tenantId
      }
    });

    return NextResponse.json({ ok: true, data: toPublicRow(saved, tenantId) });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.email.global.update", error);
      return dbNotReadyResponse();
    }

    const message = error instanceof Error ? error.message : "No se pudo guardar la configuración de correo.";
    console.error("[config.email.global.update]", error);
    return server500(message);
  }
}
