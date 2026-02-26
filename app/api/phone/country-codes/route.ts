import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getCallingCodeOptions } from "@/lib/clients/callingCodeOptions.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseLimit(value: string | null, fallback = 300) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(500, Math.max(10, Math.floor(parsed)));
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const params = req.nextUrl.searchParams;
  const q = (params.get("q") || "").trim();
  const includeInactive = params.get("active") === "0";
  const limit = parseLimit(params.get("limit"));

  const result = await getCallingCodeOptions({
    q,
    includeInactive,
    limit
  });

  const response = NextResponse.json({
    ok: true,
    items: result.items.map((item) => ({
      id: item.id,
      iso2: item.iso2,
      countryName: item.countryName,
      dialCode: item.dialCode,
      minLength: item.minLength,
      maxLength: item.maxLength,
      example: item.example ?? null,
      isActive: item.isActive,
      geoCountryId: item.geoCountryId ?? null
    }))
  });

  response.headers.set("Cache-Control", "private, max-age=60, stale-while-revalidate=120");
  return response;
}
