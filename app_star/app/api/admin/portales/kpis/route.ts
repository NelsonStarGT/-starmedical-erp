import { NextResponse, type NextRequest } from "next/server";
import { resolveActiveBranchStrict } from "@/lib/branch/activeBranch";
import { getPortalKpis, requirePortalApiCapability, type PortalBranchScope, type PortalChannelFilter, type PortalRange } from "@/lib/portales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseRange(value: string | null): PortalRange {
  if (value === "7d") return "7d";
  if (value === "30d") return "30d";
  return "today";
}

function parseChannel(value: string | null): PortalChannelFilter {
  if (value === "patient") return "patient";
  if (value === "company") return "company";
  return "all";
}

function parseBranchScope(value: string | null): PortalBranchScope {
  return value === "active" ? "active" : "all";
}

export async function GET(req: NextRequest) {
  const auth = requirePortalApiCapability(req, "PORTAL_AUDIT_READ");
  if (auth.response) return auth.response;

  const { searchParams } = new URL(req.url);
  const range = parseRange(searchParams.get("range"));
  const channel = parseChannel(searchParams.get("channel"));
  const branchScope = parseBranchScope(searchParams.get("branchScope"));

  let activeBranchId: string | null = null;
  if (branchScope === "active") {
    try {
      activeBranchId = await resolveActiveBranchStrict(auth.user!, req.cookies);
    } catch {
      activeBranchId = null;
    }
  }

  const snapshot = await getPortalKpis({
    range,
    channel,
    branchScope,
    activeBranchId
  });

  return NextResponse.json({ ok: true, data: snapshot });
}
