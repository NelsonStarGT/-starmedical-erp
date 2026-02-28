import { NextRequest, NextResponse } from "next/server";
import { ensureMembershipAccess } from "@/lib/api/memberships";
import { getMembershipGatewayConfig, updateMembershipGatewayConfig } from "@/lib/memberships/service";
import { membershipGatewayConfigSchema } from "@/lib/memberships/schemas";
import { PERMISSIONS } from "@/lib/rbac";
import { handleMembershipApiError } from "@/app/api/memberships/_utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = ensureMembershipAccess(req, PERMISSIONS.MEMBERSHIPS_ADMIN);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const data = await getMembershipGatewayConfig();
    return NextResponse.json({ data });
  } catch (error) {
    return handleMembershipApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  const auth = ensureMembershipAccess(req, PERMISSIONS.MEMBERSHIPS_ADMIN);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const json = await req.json();
    const payload = membershipGatewayConfigSchema.parse(json);
    const data = await updateMembershipGatewayConfig(payload);
    return NextResponse.json({ data });
  } catch (error) {
    return handleMembershipApiError(error);
  }
}
