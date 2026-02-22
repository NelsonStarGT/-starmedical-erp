import { NextResponse, type NextRequest } from "next/server";
import { listPortalAudit, requirePortalApiCapability, type PortalChannelFilter } from "@/lib/portales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseChannel(value: string | null): PortalChannelFilter {
  if (value === "patient") return "patient";
  if (value === "company") return "company";
  return "all";
}

export async function GET(req: NextRequest) {
  const auth = requirePortalApiCapability(req, "PORTAL_AUDIT_READ");
  if (auth.response) return auth.response;

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limit = Number(searchParams.get("limit") || 20);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const action = searchParams.get("action");
  const channel = parseChannel(searchParams.get("channel"));

  const data = await listPortalAudit({
    cursor,
    limit,
    from,
    to,
    action,
    channel
  });

  return NextResponse.json({ ok: true, data });
}
