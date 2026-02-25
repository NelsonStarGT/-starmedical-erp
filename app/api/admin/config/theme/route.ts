import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  conflict409,
  HEX_COLOR_REGEX,
  getTenantThemeConfig,
  isCentralConfigCompatError,
  parseTenantThemePatch,
  requireConfigCentralCapability,
  server500,
  service503,
  ThemeConfigConflictError,
  ThemeConfigUnavailableError,
  updateTenantThemeConfig,
  validation422,
  warnDevCentralCompat
} from "@/lib/config-central";
import { getSystemFeatureConfig, isFlagEnabledFromSnapshot } from "@/lib/system-flags/service";
import { contrastRatio, isRecommendedContrast } from "@/lib/theme/utils";
import { normalizeTenantId } from "@/lib/tenant";
import { enforceRateLimit } from "@/lib/api/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireConfigCentralCapability(req, "CONFIG_THEME_READ");
  if (auth.response) return auth.response;

  try {
    const config = await getTenantThemeConfig(normalizeTenantId(auth.user?.tenantId));
    return NextResponse.json({ ok: true, data: config });
  } catch (error) {
    if (error instanceof ThemeConfigUnavailableError || isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.theme.get", error);
      return service503("DB_NOT_READY", "Theme/branding no disponible. Ejecuta migraciones y prisma generate.");
    }

    const message = error instanceof Error ? error.message : "No se pudo obtener el tema.";
    return server500(message);
  }
}

export async function PUT(req: NextRequest) {
  const auth = requireConfigCentralCapability(req, "CONFIG_THEME_WRITE");
  if (auth.response) return auth.response;

  try {
    enforceRateLimit(req, { limit: 20, windowMs: 60_000 });
    const body = await req.json().catch(() => null);
    const expectedVersion = Number(body?.expectedVersion);
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      return validation422("expectedVersion inválido.", [
        { path: "expectedVersion", message: "Debe ser un entero >= 1." }
      ]);
    }

    const systemConfig = await getSystemFeatureConfig();
    const requireValidHex =
      systemConfig.strictMode || isFlagEnabledFromSnapshot(systemConfig, "theme.requireValidHex");
    const patch = parseTenantThemePatch(body?.patch ?? {}, { allowInvalidHex: !requireValidHex });
    const updated = await updateTenantThemeConfig({
      tenantId: normalizeTenantId(auth.user?.tenantId),
      expectedVersion,
      patch,
      updatedByUserId: auth.user?.id ?? null
    });

    const invalidHexKeys = !requireValidHex
      ? Object.entries(patch.theme || {})
          .filter(([, value]) => typeof value === "string" && !HEX_COLOR_REGEX.test(value))
          .map(([key]) => key)
      : [];
    const contrastWarnings: string[] = [];
    const textVsBg = contrastRatio(updated.theme.text, updated.theme.bg);
    if (!isRecommendedContrast(updated.theme.text, updated.theme.bg)) {
      contrastWarnings.push(
        `Contraste bajo texto/fondo (${textVsBg}:1). Recomendado >= 4.5:1 para accesibilidad.`
      );
    }

    const structureVsSurface = contrastRatio(updated.theme.structure, updated.theme.surface);
    if (!isRecommendedContrast(updated.theme.structure, updated.theme.surface, 3.2)) {
      contrastWarnings.push(
        `Contraste bajo en color estructural/superficie (${structureVsSurface}:1).`
      );
    }

    return NextResponse.json({
      ok: true,
      data: updated,
      warnings: [
        invalidHexKeys.length > 0
          ? [
              `HEX inválidos permitidos por flag: ${invalidHexKeys.join(
                ", "
              )}. Revísalos antes de publicar en producción.`
            ]
          : [],
        contrastWarnings
      ].flat()
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validation422(
        "Datos inválidos para tema/branding.",
        error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      );
    }

    if (error instanceof ThemeConfigConflictError) {
      return conflict409("Conflicto de versión. Otro usuario actualizó el tema.", {
        currentVersion: error.currentVersion
      });
    }

    if (error instanceof ThemeConfigUnavailableError || isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.theme.put", error);
      return service503("DB_NOT_READY", "Theme/branding no disponible. Ejecuta migraciones y prisma generate.");
    }

    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      (error as { status?: unknown }).status === 429
    ) {
      return NextResponse.json(
        {
          ok: false,
          code: "RATE_LIMIT",
          error: "Demasiadas solicitudes. Espera un momento para reintentar."
        },
        { status: 429 }
      );
    }

    const message = error instanceof Error ? error.message : "No se pudo actualizar el tema.";
    return server500(message);
  }
}
