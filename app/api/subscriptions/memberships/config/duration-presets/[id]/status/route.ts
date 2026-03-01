import { NextRequest, NextResponse } from "next/server";
import { ensureMembershipAccess } from "@/lib/api/memberships";
import { updateStatusSchema } from "@/lib/memberships/schemas";
import { setDurationPresetStatus } from "@/lib/memberships/service";
import { PERMISSIONS } from "@/lib/rbac";
import { handleMembershipApiError, parseBooleanStatus } from "@/app/api/memberships/_utils";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = ensureMembershipAccess(req, PERMISSIONS.MEMBERSHIPS_ADMIN);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id } = await context.params;
    const json = await req.json();
    const payload = updateStatusSchema.parse(json);
    const data = await setDurationPresetStatus(id, parseBooleanStatus(payload.status), auth.user);
    return NextResponse.json({ data });
  } catch (error) {
    return handleMembershipApiError(error);
  }
}
