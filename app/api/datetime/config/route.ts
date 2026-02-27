import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { normalizeTenantId } from "@/lib/tenant";
import { buildTenantDateTimeConfigDefaults } from "@/lib/datetime/config";
import { getTenantDateTimeConfig } from "@/lib/datetime/config.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const tenantId = normalizeTenantId(auth.user?.tenantId);
  try {
    const data = await getTenantDateTimeConfig(tenantId);
    return NextResponse.json({ ok: true, data });
  } catch {
    const fallback = buildTenantDateTimeConfigDefaults(tenantId);
    return NextResponse.json({ ok: true, data: fallback });
  }
}
