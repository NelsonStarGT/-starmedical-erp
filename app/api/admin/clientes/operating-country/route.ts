import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import {
  CLIENTS_COUNTRY_FILTER_ALL,
  CLIENTS_COUNTRY_FILTER_COOKIE,
  normalizeClientsCountryFilterValue
} from "@/lib/clients/operatingCountryContext";
import { clientsCountryFilterCookieValue } from "@/lib/clients/countryFilter.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeCountryId(value: unknown) {
  const normalized = String(value || "").trim();
  if (!normalized) return CLIENTS_COUNTRY_FILTER_ALL;
  if (normalized.toUpperCase() === CLIENTS_COUNTRY_FILTER_ALL) return CLIENTS_COUNTRY_FILTER_ALL;
  return normalized;
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  if (!auth.user || !isAdmin(auth.user)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const countryId = normalizeCountryId(body?.countryId);
  const normalizedCountryId = normalizeClientsCountryFilterValue(countryId);

  const country = normalizedCountryId
    ? await prisma.geoCountry.findFirst({
        where: { id: normalizedCountryId, isActive: true },
        select: { id: true, iso2: true, name: true }
      })
    : null;

  if (normalizedCountryId && !country) {
    return NextResponse.json({ ok: false, error: "País inválido o inactivo." }, { status: 400 });
  }

  const response = NextResponse.json({
    ok: true,
    data: {
      countryId: normalizedCountryId,
      iso2: country?.iso2 ?? null,
      name: country?.name ?? "Todos los países"
    }
  });
  response.cookies.set({
    name: CLIENTS_COUNTRY_FILTER_COOKIE,
    value: clientsCountryFilterCookieValue(normalizedCountryId),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180
  });
  return response;
}
