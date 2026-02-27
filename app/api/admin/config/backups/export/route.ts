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
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dbNotReadyResponse() {
  return service503("DB_NOT_READY", "Configuración de backups no disponible. Ejecuta migraciones y prisma generate.");
}

function getBackupDelegates() {
  return prisma as unknown as {
    adminBackupPolicy?: {
      upsert?: typeof prisma.adminBackupPolicy.upsert;
    };
    adminBackupRun?: {
      create?: typeof prisma.adminBackupRun.create;
    };
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

export async function POST(req: NextRequest) {
  const auth = await requireConfigCentralCapability(req, "CONFIG_BACKUP_WRITE");
  if (auth.response) return auth.response;
  const delegates = getBackupDelegates();
  if (!delegates.adminBackupPolicy?.upsert || !delegates.adminBackupRun?.create) {
    warnDevCentralCompat("config.backups.export", new Error("Prisma delegate missing: adminBackupPolicy/adminBackupRun"));
    return dbNotReadyResponse();
  }

  try {
    const body = (await req.json().catch(() => null)) as {
      reason?: unknown;
    } | null;

    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    const policy = await delegates.adminBackupPolicy.upsert({
      where: { id: "global" },
      update: {},
      create: { id: "global" },
      select: {
        id: true,
        manualExportEnabled: true
      }
    });

    if (!policy.manualExportEnabled) {
      return validation422("La exportación manual está deshabilitada por política.", [
        {
          path: "manualExportEnabled",
          message: "Activa exportación manual para disparar un respaldo."
        }
      ]);
    }

    const run = await delegates.adminBackupRun.create({
      data: {
        triggerMode: "MANUAL",
        status: process.env.NODE_ENV === "production" ? "QUEUED" : "COMPLETED",
        requestedByUserId: auth.user?.id ?? null,
        metadata: {
          reason: reason || null,
          mode: process.env.NODE_ENV === "production" ? "queue_pending" : "dev_preview"
        }
      },
      select: {
        id: true,
        triggerMode: true,
        status: true,
        requestedByUserId: true,
        metadata: true,
        createdAt: true
      }
    });

    await auditLog({
      action: "EXPORT_TRIGGERED",
      entityType: "AdminBackupRun",
      entityId: run.id,
      user: auth.user,
      req,
      metadata: {
        triggerMode: run.triggerMode,
        status: run.status,
        requestedByUserId: run.requestedByUserId
      }
    });

    return NextResponse.json({ ok: true, data: { run: serializeRun(run) } }, { status: 201 });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.backups.export", error);
      return dbNotReadyResponse();
    }

    const message = error instanceof Error ? error.message : "No se pudo disparar exportación manual.";
    return server500(message);
  }
}
