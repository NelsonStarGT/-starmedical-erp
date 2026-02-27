import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  isCentralConfigCompatError,
  requireConfigCentralCapability,
  server500,
  service503,
  validation422,
  warnDevCentralCompat
} from "@/lib/config-central";
import { readAppIdentityMeta, readOpeningHoursSchedule } from "@/lib/home-dashboard/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dbNotReadyResponse() {
  return service503("DB_NOT_READY", "Configuración de empresa no disponible. Ejecuta migraciones y prisma generate.");
}

export async function GET(req: NextRequest) {
  const auth = await requireConfigCentralCapability(req, "CONFIG_BRANCH_READ");
  if (auth.response) return auth.response;

  try {
    const data = await prisma.appConfig.findFirst({ orderBy: { createdAt: "desc" } });
    if (!data) {
      return NextResponse.json({ ok: true, data: null });
    }

    const identityMeta = readAppIdentityMeta(data.openingHours);
    const companyLegalName = data.companyName || "";
    const companyBrandName = identityMeta.brandName || companyLegalName;

    return NextResponse.json({
      ok: true,
      data: {
        ...data,
        companyLegalName,
        companyBrandName,
        openingHours: readOpeningHoursSchedule(data.openingHours)
      }
    });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.app.get", error);
      return dbNotReadyResponse();
    }

    const message = error instanceof Error ? error.message : "No se pudo obtener configuración de empresa.";
    return server500(message);
  }
}

function normalizeOptionalString(value: unknown) {
  const normalized = String(value || "").trim();
  return normalized.length > 0 ? normalized : null;
}

export async function PUT(req: NextRequest) {
  const auth = await requireConfigCentralCapability(req, "CONFIG_BRANCH_WRITE");
  if (auth.response) return auth.response;

  try {
    const body = (await req.json().catch(() => ({}))) as {
      companyName?: unknown;
      companyNit?: unknown;
      companyPhone?: unknown;
      companyAddress?: unknown;
      timezone?: unknown;
      logoUrl?: unknown;
      brandColor?: unknown;
    };

    const companyName = String(body.companyName || "").trim();
    const timezone = String(body.timezone || "").trim() || "America/Guatemala";
    const logoUrl = normalizeOptionalString(body.logoUrl);
    const brandColor = normalizeOptionalString(body.brandColor);

    const issues: Array<{ path: string; message: string }> = [];
    if (companyName.length < 2) {
      issues.push({ path: "companyName", message: "Nombre de empresa requerido." });
    }
    if (timezone.length < 3) {
      issues.push({ path: "timezone", message: "Zona horaria invalida." });
    }
    if (logoUrl && !/^https?:\/\//i.test(logoUrl)) {
      issues.push({ path: "logoUrl", message: "logoUrl debe usar http/https." });
    }
    if (brandColor && !/^#([0-9a-fA-F]{6})$/.test(brandColor)) {
      issues.push({ path: "brandColor", message: "brandColor debe estar en formato #RRGGBB." });
    }

    if (issues.length > 0) {
      return validation422("Configuracion de empresa invalida.", issues);
    }

    const before = await prisma.appConfig.findFirst({ orderBy: { createdAt: "desc" } });
    const saved = before
      ? await prisma.appConfig.update({
          where: { id: before.id },
          data: {
            companyName,
            companyNit: normalizeOptionalString(body.companyNit),
            companyPhone: normalizeOptionalString(body.companyPhone),
            companyAddress: normalizeOptionalString(body.companyAddress),
            timezone,
            logoUrl,
            brandColor
          }
        })
      : await prisma.appConfig.create({
          data: {
            companyName,
            companyNit: normalizeOptionalString(body.companyNit),
            companyPhone: normalizeOptionalString(body.companyPhone),
            companyAddress: normalizeOptionalString(body.companyAddress),
            timezone,
            logoUrl,
            brandColor
          }
        });

    await auditLog({
      action: "APP_CONFIG_UPDATED",
      entityType: "AppConfig",
      entityId: saved.id,
      user: auth.user,
      req,
      before,
      after: saved
    });

    const identityMeta = readAppIdentityMeta(saved.openingHours);
    const companyLegalName = saved.companyName || "";
    const companyBrandName = identityMeta.brandName || companyLegalName;

    return NextResponse.json({
      ok: true,
      data: {
        ...saved,
        companyLegalName,
        companyBrandName,
        openingHours: readOpeningHoursSchedule(saved.openingHours)
      }
    });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.app.put", error);
      return dbNotReadyResponse();
    }

    const message = error instanceof Error ? error.message : "No se pudo actualizar configuración de empresa.";
    return server500(message);
  }
}
