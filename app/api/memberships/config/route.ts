import { NextRequest, NextResponse } from "next/server";
import { ensureMembershipAccess } from "@/lib/api/memberships";
import { getMembershipConfig, updateMembershipConfig } from "@/lib/memberships/service";
import { membershipConfigSchema } from "@/lib/memberships/schemas";
import { PERMISSIONS, hasPermission } from "@/lib/rbac";
import { handleMembershipApiError } from "@/app/api/memberships/_utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = ensureMembershipAccess(req, PERMISSIONS.MEMBERSHIPS_READ);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const data = await getMembershipConfig();
    return NextResponse.json({
      data,
      meta: {
        canAdmin: hasPermission(auth.user, PERMISSIONS.MEMBERSHIPS_ADMIN),
        canViewPricing: hasPermission(auth.user, PERMISSIONS.MEMBERSHIPS_PRICING_VIEW)
      }
    });
  } catch (error) {
    return handleMembershipApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  const auth = ensureMembershipAccess(req, PERMISSIONS.MEMBERSHIPS_ADMIN);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const json = await req.json();
    const payload = membershipConfigSchema.parse(json);
    const data = await updateMembershipConfig(payload);
    return NextResponse.json({ data });
  } catch (error) {
    return handleMembershipApiError(error);
  }
}
