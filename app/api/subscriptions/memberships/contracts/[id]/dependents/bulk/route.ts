import { NextRequest, NextResponse } from "next/server";
import { ensureMembershipAccess } from "@/lib/api/memberships";
import { bulkAssignDependentsSchema } from "@/lib/memberships/schemas";
import { bulkAssignContractDependents } from "@/lib/memberships/service";
import { PERMISSIONS } from "@/lib/rbac";
import { handleMembershipApiError } from "@/app/api/subscriptions/memberships/_utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = ensureMembershipAccess(req, PERMISSIONS.MEMBERSHIPS_WRITE);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id } = await context.params;
    const payload = bulkAssignDependentsSchema.parse(await req.json());
    const data = await bulkAssignContractDependents(id, payload, auth.user);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return handleMembershipApiError(error);
  }
}
