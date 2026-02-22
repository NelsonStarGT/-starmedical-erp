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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireConfigCentralCapability(req, "CONFIG_THEME_READ");
  if (auth.response) return auth.response;

  try {
    const config = await getTenantThemeConfig();
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
      expectedVersion,
      patch,
      updatedByUserId: auth.user?.id ?? null
    });

    const invalidHexKeys = !requireValidHex
      ? Object.entries(patch.theme || {})
          .filter(([, value]) => typeof value === "string" && !HEX_COLOR_REGEX.test(value))
          .map(([key]) => key)
      : [];

    return NextResponse.json({
      ok: true,
      data: updated,
      warnings:
        invalidHexKeys.length > 0
          ? [
              `HEX inválidos permitidos por flag: ${invalidHexKeys.join(
                ", "
              )}. Revísalos antes de publicar en producción.`
            ]
          : []
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

    const message = error instanceof Error ? error.message : "No se pudo actualizar el tema.";
    return server500(message);
  }
}
