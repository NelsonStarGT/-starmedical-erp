import { NextResponse, type NextRequest } from "next/server";
import { resolveActiveBranchStrict } from "@/lib/branch/activeBranch";
import { listPortalSolicitudes, requirePortalApiCapability, type PortalBranchScope, type PortalChannelFilter } from "@/lib/portales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseChannel(value: string | null): PortalChannelFilter {
  if (value === "patient") return "patient";
  if (value === "company") return "company";
  return "all";
}

function parseBranchScope(value: string | null): PortalBranchScope {
  return value === "active" ? "active" : "all";
}

export async function GET(req: NextRequest) {
  const auth = requirePortalApiCapability(req, "PORTAL_REQUESTS_READ");
  if (auth.response) return auth.response;

  const { searchParams } = new URL(req.url);
  const status = (searchParams.get("status") || "REQUESTED").toUpperCase();
  if (status !== "REQUESTED") {
    return NextResponse.json({ error: "Solo se soporta status=REQUESTED en esta bandeja." }, { status: 400 });
  }
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

  const rows = await listPortalSolicitudes({
    branchScope,
    channel,
    activeBranchId
  });

  return NextResponse.json({ ok: true, data: { items: rows } });
}
