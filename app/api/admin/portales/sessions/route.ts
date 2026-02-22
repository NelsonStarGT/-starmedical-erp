import { NextResponse, type NextRequest } from "next/server";
import {
  listPortalSessions,
  requirePortalApiCapability,
  type PortalChannelFilter,
  type PortalSessionStatusFilter
} from "@/lib/portales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseChannel(value: string | null): PortalChannelFilter {
  if (value === "patient") return "patient";
  if (value === "company") return "company";
  return "all";
}

function parseStatus(value: string | null): PortalSessionStatusFilter {
  if (value === "revoked") return "revoked";
  if (value === "expired") return "expired";
  return "active";
}

export async function GET(req: NextRequest) {
  const auth = requirePortalApiCapability(req, "PORTAL_SESSION_READ");
  if (auth.response) return auth.response;

  const { searchParams } = new URL(req.url);
  const status = parseStatus(searchParams.get("status"));
  const queryClient = searchParams.get("queryClient");
  const cursor = searchParams.get("cursor");
  const limit = Number(searchParams.get("limit") || 20);
  const channel = parseChannel(searchParams.get("channel"));

  const data = await listPortalSessions({
    status,
    queryClient,
    cursor,
    limit,
    channel
  });

  return NextResponse.json({ ok: true, data });
}
