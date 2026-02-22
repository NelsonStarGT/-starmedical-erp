import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import {
  getPortalConfig,
  parsePortalConfigPatch,
  PortalConfigConflictError,
  PortalConfigUnavailableError,
  requirePortalApiCapability,
  updatePortalConfig
} from "@/lib/portales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requirePortalApiCapability(req, "PORTAL_CONFIG_READ");
  if (auth.response) return auth.response;

  const config = await getPortalConfig();
  return NextResponse.json({ ok: true, data: config });
}

export async function PUT(req: NextRequest) {
  const auth = requirePortalApiCapability(req, "PORTAL_CONFIG_WRITE");
  if (auth.response) return auth.response;

  try {
    const body = await req.json().catch(() => null);
    const expectedVersion = Number(body?.expectedVersion);
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      return NextResponse.json({ error: "expectedVersion inválido" }, { status: 400 });
    }

    const patch = parsePortalConfigPatch(body?.patch ?? {});
    const updated = await updatePortalConfig({
      expectedVersion,
      patch,
      updatedByUserId: auth.user?.id ?? null
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Configuración inválida",
          issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
        },
        { status: 400 }
      );
    }

    if (error instanceof PortalConfigConflictError) {
      return NextResponse.json(
        {
          error: "Conflicto de versión. Otro usuario actualizó la configuración.",
          code: "PORTAL_CONFIG_VERSION_CONFLICT",
          currentVersion: error.currentVersion
        },
        { status: 409 }
      );
    }

    if (error instanceof PortalConfigUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    const message = error instanceof Error ? error.message : "No se pudo actualizar PortalConfig.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
