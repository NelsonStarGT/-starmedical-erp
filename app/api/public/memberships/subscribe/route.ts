import { NextRequest, NextResponse } from "next/server";
import { publicSubscribeSchema } from "@/lib/memberships/schemas";
import { subscribePublicMembership, verifyPublicMembershipTokenOrHmac } from "@/lib/memberships/service";
import { handleMembershipApiError } from "@/app/api/memberships/_utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let raw = "";
  try {
    raw = await req.text();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!verifyPublicMembershipTokenOrHmac(req, raw)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const json = raw ? JSON.parse(raw) : {};
    const payload = publicSubscribeSchema.parse(json);
    const data = await subscribePublicMembership(payload);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return handleMembershipApiError(error);
  }
}
