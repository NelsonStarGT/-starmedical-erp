import { NextRequest, NextResponse } from "next/server";
import { ensureMembershipAccess } from "@/lib/api/memberships";
import { renewContract } from "@/lib/memberships/service";
import { renewContractSchema } from "@/lib/memberships/schemas";
import { PERMISSIONS } from "@/lib/rbac";
import { handleMembershipApiError } from "@/app/api/memberships/_utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = ensureMembershipAccess(req, PERMISSIONS.MEMBERSHIPS_WRITE);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id } = await context.params;
    const json = await req.json().catch(() => ({}));
    const payload = renewContractSchema.parse(json);
    const data = await renewContract(id, payload, auth.user);
    return NextResponse.json({ data });
  } catch (error) {
    return handleMembershipApiError(error);
  }
}
