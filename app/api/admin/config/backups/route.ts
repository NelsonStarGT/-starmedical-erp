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

const patchSchema = z
  .object({
    retentionDays: z.number().int().min(1).max(3650).optional(),
    manualExportEnabled: z.boolean().optional()
  })
  .strict();

const updateSchema = z
  .object({
    expectedVersion: z.number().int().min(1),
    patch: patchSchema
  })
  .strict();

function dbNotReadyResponse() {
  return service503("DB_NOT_READY", "Configuración de backups no disponible. Ejecuta migraciones y prisma generate.");
}

function getBackupDelegates() {
  return prisma as unknown as {
    adminBackupPolicy?: {
      upsert?: typeof prisma.adminBackupPolicy.upsert;
      findUnique?: typeof prisma.adminBackupPolicy.findUnique;
      update?: typeof prisma.adminBackupPolicy.update;
    };
    adminBackupRun?: {
      findMany?: typeof prisma.adminBackupRun.findMany;
    };
  };
}

function serializePolicy(row: {
  id: string;
  version: number;
  retentionDays: number;
  manualExportEnabled: boolean;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    version: row.version,
    retentionDays: row.retentionDays,
    manualExportEnabled: row.manualExportEnabled,
    updatedByUserId: row.updatedByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function serializeRun(row: {
  id: string;
  triggerMode: string;
  status: string;
  requestedByUserId: string | null;
  metadata: unknown;
  createdAt: Date;
}) {
  return {
    id: row.id,
    triggerMode: row.triggerMode,
    status: row.status,
    requestedByUserId: row.requestedByUserId,
    metadata: row.metadata ?? null,
    createdAt: row.createdAt.toISOString()
  };
}

async function ensurePolicyRow() {
  const delegates = getBackupDelegates();
  if (!delegates.adminBackupPolicy?.upsert) {
    throw new Error("BACKUP_POLICY_DELEGATE_MISSING");
  }
  return delegates.adminBackupPolicy.upsert({
    where: { id: "global" },
    update: {},
    create: { id: "global" },
    select: {
      id: true,
      version: true,
      retentionDays: true,
      manualExportEnabled: true,
      updatedByUserId: true,
      createdAt: true,
      updatedAt: true
    }
  });
}

export async function GET(req: NextRequest) {
  const auth = requireConfigCentralCapability(req, "CONFIG_BACKUP_READ");
  if (auth.response) return auth.response;
  const delegates = getBackupDelegates();
  if (!delegates.adminBackupPolicy?.upsert || !delegates.adminBackupRun?.findMany) {
    warnDevCentralCompat("config.backups.get", new Error("Prisma delegate missing: adminBackupPolicy/adminBackupRun"));
    return dbNotReadyResponse();
  }

  try {
    const [policy, runs] = await Promise.all([
      ensurePolicyRow(),
      delegates.adminBackupRun.findMany({
        orderBy: [{ createdAt: "desc" }],
        take: 20,
        select: {
          id: true,
          triggerMode: true,
          status: true,
          requestedByUserId: true,
          metadata: true,
          createdAt: true
        }
      })
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        policy: serializePolicy(policy),
        runs: runs.map(serializeRun)
      }
    });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.backups.get", error);
      return dbNotReadyResponse();
    }

    const message = error instanceof Error ? error.message : "No se pudo cargar configuración de backups.";
    return server500(message);
  }
}

export async function PUT(req: NextRequest) {
  const auth = requireConfigCentralCapability(req, "CONFIG_BACKUP_WRITE");
  if (auth.response) return auth.response;
  const delegates = getBackupDelegates();
  if (!delegates.adminBackupPolicy?.upsert || !delegates.adminBackupPolicy?.update) {
    warnDevCentralCompat("config.backups.put", new Error("Prisma delegate missing: adminBackupPolicy"));
    return dbNotReadyResponse();
  }

  try {
    const body = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return validation422(
        "Datos inválidos para backups.",
        parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const txClient = tx as typeof prisma;
      const current = await txClient.adminBackupPolicy.upsert({
        where: { id: "global" },
        update: {},
        create: { id: "global" },
        select: {
          id: true,
          version: true,
          retentionDays: true,
          manualExportEnabled: true,
          updatedByUserId: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (current.version !== parsed.data.expectedVersion) {
        throw new Error(`VERSION_CONFLICT:${current.version}`);
      }

      return txClient.adminBackupPolicy.update({
        where: { id: "global" },
        data: {
          version: { increment: 1 },
          retentionDays: parsed.data.patch.retentionDays ?? current.retentionDays,
          manualExportEnabled: parsed.data.patch.manualExportEnabled ?? current.manualExportEnabled,
          updatedByUserId: auth.user?.id ?? null,
          updatedAt: new Date()
        },
        select: {
          id: true,
          version: true,
          retentionDays: true,
          manualExportEnabled: true,
          updatedByUserId: true,
          createdAt: true,
          updatedAt: true
        }
      });
    });

    await auditLog({
      action: "BACKUP_POLICY_UPDATED",
      entityType: "AdminBackupPolicy",
      entityId: "global",
      user: auth.user,
      req,
      metadata: {
        newVersion: updated.version,
        retentionDays: updated.retentionDays,
        manualExportEnabled: updated.manualExportEnabled
      }
    });

    return NextResponse.json({ ok: true, data: { policy: serializePolicy(updated) } });
  } catch (error) {
    if (error instanceof Error && error.message === "BACKUP_POLICY_DELEGATE_MISSING") {
      warnDevCentralCompat("config.backups.ensurePolicy", error);
      return dbNotReadyResponse();
    }

    if (error instanceof Error && error.message.startsWith("VERSION_CONFLICT:")) {
      const currentVersion = Number(error.message.split(":")[1] || 0);
      return conflict409("Conflicto de versión en política de backups.", {
        currentVersion
      });
    }

    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.backups.put", error);
      return dbNotReadyResponse();
    }

    const message = error instanceof Error ? error.message : "No se pudo guardar configuración de backups.";
    return server500(message);
  }
}
