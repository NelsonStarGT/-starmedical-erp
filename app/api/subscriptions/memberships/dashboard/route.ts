import { NextRequest, NextResponse } from "next/server";
import { ensureMembershipAccess } from "@/lib/api/memberships";
import { getMembershipDashboard } from "@/lib/memberships/service";
import { PERMISSIONS } from "@/lib/rbac";
import { handleMembershipApiError } from "@/app/api/memberships/_utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = ensureMembershipAccess(req, PERMISSIONS.MEMBERSHIPS_READ);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const data = await getMembershipDashboard(auth.user);
    return NextResponse.json({ data });
  } catch (error) {
    return handleMembershipApiError(error);
  }
}
