import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiErrorHandling } from "@/lib/api/http";
import { isTokenActive } from "@/lib/attendance/configService";

export const dynamic = "force-dynamic";

async function handler(_req: NextRequest, { params }: { params: { token: string } }) {
  const tokenStr = params.token;
  if (!tokenStr) return NextResponse.json({ error: "Token requerido" }, { status: 400 });

  const token = await prisma.attendancePunchToken.findUnique({
    where: { token: tokenStr },
    include: { HrEmployee: { select: { id: true } } }
  });
  if (!token) return NextResponse.json({ error: "Token inválido" }, { status: 403 });
  if (!isTokenActive(token)) return NextResponse.json({ error: "Token expirado o revocado" }, { status: 403 });

  const config = await prisma.attendanceSiteConfig.findUnique({ where: { siteId: token.siteId } });
  if (!config) return NextResponse.json({ error: "Config no encontrada" }, { status: 404 });

  return NextResponse.json({
    data: {
      siteId: token.siteId,
      employeeId: token.employeeId || null,
      rules: {
        lat: config.lat,
        lng: config.lng,
        radiusMeters: config.radiusMeters,
        allowOutOfZone: config.allowOutOfZone,
        requirePhoto: config.requirePhoto,
        requireLiveness: config.requireLiveness,
        windowBeforeMinutes: config.windowBeforeMinutes,
        windowAfterMinutes: config.windowAfterMinutes,
        antiPassback: config.antiPassback,
        allowedSources: config.allowedSources
      }
    }
  });
}

export const GET = withApiErrorHandling(handler);
