import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isCentralConfigCompatError,
  requireConfigCentralCapability,
  server500,
  service503,
  warnDevCentralCompat
} from "@/lib/config-central";
import { readAppIdentityMeta, readOpeningHoursSchedule } from "@/lib/home-dashboard/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dbNotReadyResponse() {
  return service503("DB_NOT_READY", "Configuración de empresa no disponible. Ejecuta migraciones y prisma generate.");
}

export async function GET(req: NextRequest) {
  const auth = requireConfigCentralCapability(req, "CONFIG_BRANCH_READ");
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
