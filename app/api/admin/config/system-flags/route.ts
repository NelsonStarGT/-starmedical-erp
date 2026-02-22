import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { auditLog } from "@/lib/audit";
import { requireAuth } from "@/lib/auth";
import {
  conflict409,
  forbidden403,
  isCentralConfigCompatError,
  server500,
  service503,
  validation422,
  warnDevCentralCompat
} from "@/lib/config-central";
import { hasPermission, isAdmin } from "@/lib/rbac";
import {
  getSystemFeatureConfig,
  parseSystemFeatureConfigPatch,
  SystemFeatureConfigConflictError,
  SystemFeatureConfigUnavailableError,
  updateSystemFeatureConfig
} from "@/lib/system-flags/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ensureSystemAdmin(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) {
    return { user: null, response: auth.errorResponse };
  }

  const user = auth.user;
  if (!isAdmin(user) && !hasPermission(user, "SYSTEM:ADMIN")) {
    return {
      user,
      response: forbidden403()
    };
  }

  return { user, response: null };
}

function dbNotReadyResponse() {
  return service503(
    "DB_NOT_READY",
    "Feature flags no disponible. Ejecuta migraciones y prisma generate."
  );
}

export async function GET(req: NextRequest) {
  const auth = ensureSystemAdmin(req);
  if (auth.response) return auth.response;

  try {
    const config = await getSystemFeatureConfig();
    return NextResponse.json({ ok: true, data: config });
  } catch (error) {
    if (isCentralConfigCompatError(error) || error instanceof SystemFeatureConfigUnavailableError) {
      warnDevCentralCompat("config.systemFlags.get", error);
      return dbNotReadyResponse();
    }

    const message = error instanceof Error ? error.message : "No se pudo cargar feature flags.";
    return server500(message);
  }
}

export async function PUT(req: NextRequest) {
  const auth = ensureSystemAdmin(req);
  if (auth.response) return auth.response;

  try {
    const body = await req.json().catch(() => null);
    const expectedVersion = Number(body?.expectedVersion);
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      return validation422("expectedVersion inválido.", [
        { path: "expectedVersion", message: "Debe ser un entero >= 1." }
      ]);
    }

    const patch = parseSystemFeatureConfigPatch(body?.patch ?? {});
    const updated = await updateSystemFeatureConfig({
      expectedVersion,
      patch,
      updatedByUserId: auth.user?.id ?? null
    });

    await auditLog({
      action: "SYSTEM_FEATURE_FLAGS_UPDATED",
      entityType: "SystemFeatureConfig",
      entityId: "global",
      user: auth.user,
      req,
      metadata: {
        oldVersion: expectedVersion,
        newVersion: updated.version,
        strictMode: updated.strictMode,
        changedKeys: Object.keys(patch)
      }
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    if (error instanceof ZodError) {
      return validation422(
        "Patch inválido para feature flags.",
        error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      );
    }

    if (error instanceof SystemFeatureConfigConflictError) {
      return conflict409("Conflicto de versión. Otro usuario guardó antes.", {
        currentVersion: error.currentVersion
      });
    }

    if (isCentralConfigCompatError(error) || error instanceof SystemFeatureConfigUnavailableError) {
      warnDevCentralCompat("config.systemFlags.put", error);
      return dbNotReadyResponse();
    }

    const message = error instanceof Error ? error.message : "No se pudo actualizar feature flags.";
    return server500(message);
  }
}
