import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureAdmin } from "@/lib/api/admin";
import {
  mergeOpeningHoursWithAppIdentity,
  mergeOpeningHoursWithSchedule,
  readAppIdentityMeta,
  readOpeningHoursSchedule
} from "@/lib/home-dashboard/storage";

export const dynamic = "force-dynamic";
const ALLOWED_TIMEZONES = new Set([
  "America/Guatemala",
  "America/Mexico_City",
  "America/New_York",
  "Europe/Lisbon",
  "UTC"
]);

export async function GET(req: NextRequest) {
  const auth = ensureAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const data = await prisma.appConfig.findFirst({ orderBy: { createdAt: "desc" } });
    if (!data) return NextResponse.json({ data: null });
    const appIdentity = readAppIdentityMeta(data.openingHours);
    const companyLegalName = data.companyName || "";
    const companyBrandName = appIdentity.brandName || companyLegalName;
    return NextResponse.json({
      data: {
        ...data,
        companyLegalName,
        companyBrandName,
        openingHours: readOpeningHoursSchedule(data.openingHours)
      }
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo obtener configuración" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = ensureAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const companyLegalName = String(body.companyLegalName || body.companyName || "").trim();
    const companyBrandName = String(body.companyBrandName || "").trim();
    if (!companyLegalName) return NextResponse.json({ error: "companyLegalName requerido" }, { status: 400 });
    const timezoneCandidate = String(body.timezone || "America/Guatemala").trim() || "America/Guatemala";
    const timezone = ALLOWED_TIMEZONES.has(timezoneCandidate) ? timezoneCandidate : "America/Guatemala";

    const baseData = {
      companyName: companyLegalName,
      companyNit: body.companyNit || null,
      companyPhone: body.companyPhone || null,
      companyAddress: body.companyAddress || null,
      logoUrl: body.logoUrl || null,
      timezone
    };

    const existing = await prisma.appConfig.findFirst();
    let openingHours: unknown = existing?.openingHours ?? null;
    if (Object.prototype.hasOwnProperty.call(body, "openingHours")) {
      openingHours = mergeOpeningHoursWithSchedule(openingHours, body.openingHours || null);
    }
    openingHours = mergeOpeningHoursWithAppIdentity(openingHours, { brandName: companyBrandName || null });
    const openingHoursInput =
      openingHours === null ? Prisma.DbNull : (openingHours as Prisma.InputJsonValue);

    const data: Prisma.AppConfigUncheckedCreateInput = { ...baseData, openingHours: openingHoursInput };
    const saved = existing
      ? await prisma.appConfig.update({ where: { id: existing.id }, data })
      : await prisma.appConfig.create({ data });
    const appIdentity = readAppIdentityMeta(saved.openingHours);
    const savedCompanyLegalName = saved.companyName || "";
    const savedCompanyBrandName = appIdentity.brandName || savedCompanyLegalName;

    return NextResponse.json({
      data: {
        ...saved,
        companyLegalName: savedCompanyLegalName,
        companyBrandName: savedCompanyBrandName,
        openingHours: readOpeningHoursSchedule(saved.openingHours)
      }
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo guardar configuración" }, { status: 500 });
  }
}
